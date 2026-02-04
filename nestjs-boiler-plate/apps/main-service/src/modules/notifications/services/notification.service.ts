import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MailService } from '../../../common/mail/services/mail.service';
import { DeviceExport, ExportStatus } from '../../device-exports/schemas/device-export.schemas';
import { User } from '../../../users/entities/user.entity';
import { Notification, NotificationDocument, NotificationType } from '../schemas/notification.schema';
import { NotificationGateway } from '../gateways/notification.gateway';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);
    private readonly baseUrl: string;

    constructor(
        @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
        private readonly mailService: MailService,
        private readonly configService: ConfigService,
        private readonly notificationGateway: NotificationGateway,
    ) {
        this.baseUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
    }

    /**
     * Tạo và gửi thông báo (DB + Socket)
     */
    async createAndSendNotification(
        userId: string,
        title: string,
        message: string,
        type: NotificationType,
        metadata: any = {}
    ) {
        try {
            const newNoti = await this.notificationModel.create({
                userId,
                title,
                message,
                type,
                metadata,
                isRead: false
            });

            this.notificationGateway.sendToUser(userId, newNoti);

            return newNoti;
        } catch (error) {
            this.logger.error(`Failed to create notification for user ${userId}`, error);
        }
    }

    async getUserNotifications(userId: string, options: { page?: number; limit?: number } = {}) {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 20, 100); // Max 100 per page
        const skip = (page - 1) * limit;

        const [results, total] = await Promise.all([
            this.notificationModel.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
            this.notificationModel.countDocuments({ userId })
        ]);

        return {
            results,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        };
    }

    async markAsRead(id: string, userId: string) {
        const notification = await this.notificationModel.findById(id);

        if (!notification) {
            throw new Error('Notification not found');
        }

        if (notification.userId !== userId) {
            throw new Error('Unauthorized access to notification');
        }

        return this.notificationModel.findByIdAndUpdate(id, { isRead: true }, { new: true });
    }

    async markAllRead(userId: string) {
        return this.notificationModel.updateMany({ userId, isRead: false }, { isRead: true });
    }

    async deleteNotification(id: string, userId: string) {
        const notification = await this.notificationModel.findById(id);

        if (!notification) {
            throw new Error('Notification not found');
        }

        if (notification.userId !== userId) {
            throw new Error('Unauthorized access to notification');
        }

        await this.notificationModel.findByIdAndDelete(id);
    }

    /**
     * Gửi email yêu cầu duyệt + Bắn notify
     */
    async sendApprovalRequest(exportRecord: DeviceExport): Promise<void> {
        try {
            const approver = exportRecord.assignedApprover as unknown as User;
            const creator = exportRecord.createdBy as unknown as User;

            if (!approver || !approver.email) {
                this.logger.warn(`Cannot send approval email for ${exportRecord.code}: Approver email missing`);
                return;
            }

            const approverName = approver.name || approver.username;
            const creatorName = creator ? (creator.name || creator.username) : 'Unknown';
            const items = this.mapRequirementsToItems(exportRecord.requirements);

            const context = {
                approverName,
                code: exportRecord.code,
                creatorName,
                projectName: exportRecord.project || 'N/A',
                customer: exportRecord.customer || 'N/A',
                exportReason: exportRecord.exportReason || 'Không có lý do',
                items,
                link: `${this.baseUrl}/export/${exportRecord._id}`,
            };

            await this.mailService.sendMail(
                approver.email,
                `[Device Management] Yêu cầu duyệt phiếu xuất kho: ${exportRecord.code}`,
                'approval-request',
                context
            );

            const approverId = await this.getUserId(approver);

            await this.createAndSendNotification(
                approverId,
                'Yêu cầu duyệt phiếu xuất',
                `${creatorName} đã gửi yêu cầu duyệt phiếu ${exportRecord.code}`,
                NotificationType.INFO,
                { exportId: exportRecord._id, code: exportRecord.code, link: `/export/${exportRecord._id}` }
            );

            this.logger.log(`Sent approval request for ${exportRecord.code} to ${approver.email}`);
        } catch (error) {
            this.logger.error(`Failed to send approval request email for ${exportRecord.code}`, error);
        }
    }

    /**
     * Gửi email kết quả duyệt + Bắn notify
     */
    async sendExportResult(exportRecord: DeviceExport): Promise<void> {
        try {
            const creator = exportRecord.createdBy as unknown as User;
            const approver = exportRecord.approvedBy as unknown as User
                || exportRecord.assignedApprover as unknown as User;

            if (!creator || !creator.email) {
                this.logger.warn(`Cannot send result email for ${exportRecord.code}: Creator email missing`);
                return;
            }

            const creatorName = creator.name || creator.username;
            const approverName = approver ? (approver.name || approver.username) : 'Admin';

            const isApproved = exportRecord.status === ExportStatus.APPROVED;
            const subject = isApproved
                ? `[Device Management] Phiếu xuất kho ${exportRecord.code} ĐÃ ĐƯỢC DUYỆT`
                : `[Device Management] Phiếu xuất kho ${exportRecord.code} BỊ TỪ CHỐI`;

            const context = {
                creatorName,
                isApproved,
                approverName,
                code: exportRecord.code,
                projectName: exportRecord.project || 'N/A',
                rejectedReason: exportRecord.rejectedReason || 'Không có lý do cụ thể',
                approvedDate: exportRecord.approvedDate
                    ? new Date(exportRecord.approvedDate).toLocaleDateString('vi-VN')
                    : new Date().toLocaleDateString('vi-VN'),
                link: `${this.baseUrl}/export/${exportRecord._id}`,
            };

            await this.mailService.sendMail(
                creator.email,
                subject,
                'export-result',
                context
            );

            const creatorId = await this.getUserId(creator);

            await this.createAndSendNotification(
                creatorId,
                isApproved ? 'Phiếu xuất đã được duyệt' : 'Phiếu xuất bị từ chối',
                `Phiếu ${exportRecord.code} đã được ${isApproved ? 'duyệt' : 'từ chối'} bởi ${approverName}`,
                isApproved ? NotificationType.SUCCESS : NotificationType.ERROR,
                { exportId: exportRecord._id, code: exportRecord.code, link: `/export/${exportRecord._id}` }
            );

            this.logger.log(`Sent export result for ${exportRecord.code} to ${creator.email}`);
        } catch (error) {
            this.logger.error(`Failed to send export result email for ${exportRecord.code}`, error);
        }
    }

    private async getUserId(user: User | string): Promise<string> {
        if (typeof user === 'string') return user;

        // If keycloakId exists, use it
        if ((user as any).keycloakId) {
            return (user as any).keycloakId;
        }

        // Otherwise query DB to get keycloakId
        const userId = (user as any)._id ? (user as any)._id.toString() : user.toString();
        try {
            const userModel = this.notificationModel.db.model('User');
            const fullUser = await userModel.findById(userId).select('keycloakId').lean() as any;
            if (fullUser?.keycloakId) {
                return fullUser.keycloakId;
            }
        } catch (error) {
            this.logger.warn(`Failed to query keycloakId for user ${userId}, fallback to _id`, error);
        }

        // Fallback to _id if all else fails
        return userId;
    }

    private mapRequirementsToItems(requirements: any[]) {
        return (requirements || []).map((req: any) => ({
            deviceCode: req.deviceCode,
            deviceName: req.deviceName,
            quantity: req.quantity,
        }));
    }
}
