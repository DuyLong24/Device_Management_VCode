import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DeviceExport, ExportStatus } from '../../device-exports/schemas/device-export.schemas';
import { MailService } from '../../../common/mail/services/mail.service';
import { ConfigService } from '@nestjs/config';
import { User } from 'apps/main-service/src/users/entities/user.entity';

// định nghĩa type để tránh error khi populate
interface DeviceExportPopulated extends Omit<DeviceExport, 'assignedApprover' | 'createdBy' | 'approvedBy'> {
    _id: Types.ObjectId;
    assignedApprover?: User;
    createdBy?: User;
    approvedBy?: User;
}

@Injectable()
export class ExportNotificationTask {
    private readonly logger = new Logger(ExportNotificationTask.name);
    private readonly baseUrl: string;

    constructor(
        @InjectModel(DeviceExport.name) private readonly deviceExportModel: Model<DeviceExport>,
        private readonly mailService: MailService,
        private readonly configService: ConfigService,
    ) {
        // URL frontend
        this.baseUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
    }

    // Kích hoạt thủ công
    async processAllNotifications() {
        this.logger.log('Manual trigger email notification check started...');
        await this.processApprovalRequests();
        await this.processExportResults();
    }

    // Gửi yêu cầu duyệt
    private async processApprovalRequests() {
        try {
            const pendingExports = await this.deviceExportModel.find({
                status: ExportStatus.PENDING_APPROVAL,
                isSubmitNotified: false,
            }).populate('assignedApprover createdBy') as unknown as DeviceExportPopulated[];

            this.logger.log(`Found ${pendingExports.length} pending exports to notify.`);

            for (const exportRecord of pendingExports) {
                if (exportRecord.assignedApprover?.email) {
                    const approverEmail = exportRecord.assignedApprover.email;
                    const approverName = exportRecord.assignedApprover.name || exportRecord.assignedApprover.username;
                    const creatorName = exportRecord.createdBy ? (exportRecord.createdBy.name || exportRecord.createdBy.username) : 'Unknown';
                    const items = this.mapRequirementsToItems(exportRecord.requirements);

                    await this.sendAndMarkNotified(
                        exportRecord,
                        approverEmail,
                        `[Device Management] Yêu cầu duyệt phiếu xuất kho: ${exportRecord.code}`,
                        'approval-request',
                        {
                            approverName,
                            code: exportRecord.code,
                            creatorName,
                            projectName: exportRecord.project || 'N/A',
                            customer: exportRecord.customer || 'N/A',
                            exportReason: exportRecord.exportReason || 'Không có lý do',
                            items,
                            link: `${this.baseUrl}/export/${exportRecord._id}`,
                        },
                        'isSubmitNotified'
                    );
                } else {
                    this.logger.warn(`Export ${exportRecord.code} has no assigned approver or email missing.`);
                }
            }
        } catch (error) {
            this.logger.error('Error processing approval request notifications', error.stack);
        }
    }

    // Gửi kết quả (Approved/Rejected)
    private async processExportResults() {
        try {
            const resultedExports = await this.deviceExportModel.find({
                status: { $in: [ExportStatus.APPROVED, ExportStatus.REJECTED] },
                isResultNotified: false,
            }).populate('approvedBy createdBy assignedApprover') as unknown as DeviceExportPopulated[];

            this.logger.log(`Found ${resultedExports.length} resulted exports to notify.`);

            for (const exportRecord of resultedExports) {
                if (exportRecord.createdBy?.email) {
                    const creatorEmail = exportRecord.createdBy.email;
                    const creatorName = exportRecord.createdBy.name || exportRecord.createdBy.username;

                    let approverName = 'Admin';
                    if (exportRecord.status === ExportStatus.APPROVED && exportRecord.approvedBy) {
                        approverName = exportRecord.approvedBy.name || exportRecord.approvedBy.username;
                    } else if (exportRecord.status === ExportStatus.REJECTED && exportRecord.assignedApprover) {
                        approverName = exportRecord.assignedApprover.name || exportRecord.assignedApprover.username;
                    }

                    const isApproved = exportRecord.status === ExportStatus.APPROVED;
                    const subject = isApproved
                        ? `[Device Management] Phiếu xuất kho ${exportRecord.code} ĐÃ ĐƯỢC DUYỆT`
                        : `[Device Management] Phiếu xuất kho ${exportRecord.code} BỊ TỪ CHỐI`;

                    await this.sendAndMarkNotified(
                        exportRecord,
                        creatorEmail,
                        subject,
                        'export-result',
                        {
                            creatorName,
                            isApproved,
                            approverName,
                            code: exportRecord.code,
                            projectName: exportRecord.project || 'N/A',
                            rejectedReason: exportRecord.rejectedReason || 'Không có lý do cụ thể',
                            approvedDate: exportRecord.approvedDate ? new Date(exportRecord.approvedDate).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN'),
                            link: `${this.baseUrl}/export/${exportRecord._id}`,
                        },
                        'isResultNotified'
                    );
                }
            }
        } catch (error) {
            this.logger.error('Error processing export result notifications', error.stack);
        }
    }

    // map các yêu cầu thành các item đơn giản
    private mapRequirementsToItems(requirements: any[]) {
        return (requirements || []).map((req: any) => ({
            deviceCode: req.deviceCode,
            deviceName: req.deviceName,
            quantity: req.quantity,
        }));
    }

    // gửi mail và update DB flag
    private async sendAndMarkNotified(
        exportRecord: DeviceExportPopulated,
        email: string,
        subject: string,
        template: string,
        context: any,
        flagField: 'isSubmitNotified' | 'isResultNotified'
    ): Promise<void> {
        try {
            const sent = await this.mailService.sendMail(email, subject, template, context);
            if (sent) {
                // Dùng updateOne để tránh error khi populate
                await this.deviceExportModel.updateOne(
                    { _id: exportRecord._id },
                    { $set: { [flagField]: true } }
                );
                this.logger.log(`Sent email (${template}) for ${exportRecord.code} to ${email}`);
            }
        } catch (error) {
            this.logger.error(`Failed to send/mark email for ${exportRecord.code}`, error.stack);
        }
    }
}
