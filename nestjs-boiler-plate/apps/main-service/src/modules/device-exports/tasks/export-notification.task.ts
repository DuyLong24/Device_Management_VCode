import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeviceExport, ExportStatus } from '../../device-exports/schemas/device-export.schemas';
import { MailService } from '../../../common/mail/services/mail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ExportNotificationTask {
    private readonly logger = new Logger(ExportNotificationTask.name);
    private readonly baseUrl: string;

    constructor(
        @InjectModel(DeviceExport.name) private readonly deviceExportModel: Model<DeviceExport>,
        private readonly mailService: MailService,
        private readonly configService: ConfigService,
    ) {
        // URL frontend để user click vào
        this.baseUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
    }

    // Chạy lúc 00:00 hàng ngày
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleDailyNotifications() {
        this.logger.log('Standard daily email notification check started...');
        await this.processApprovalRequests();
        await this.processExportResults();
    }

    // Phương thức thủ công để test
    async processAllNotifications() {
        this.logger.log('Manual trigger email notification check started...');
        await this.processApprovalRequests();
        await this.processExportResults();
    }

    // 1. Gửi mail yêu cầu duyệt (Pending Approvals)
    private async processApprovalRequests() {
        try {
            // Tìm các phiếu đang chờ duyệt và chưa gửi thông báo
            const pendingExports = await this.deviceExportModel.find({
                status: ExportStatus.PENDING_APPROVAL,
                isSubmitNotified: false, // Chỉ lấy phiếu chưa gửi mail
            }).populate('assignedApprover createdBy');

            this.logger.log(`Found ${pendingExports.length} pending exports to notify.`);

            for (const exportRecord of pendingExports) {
                const items = (exportRecord.requirements || []).map((req: any) => ({
                    deviceCode: req.deviceCode,
                    deviceName: req.deviceName,
                    quantity: req.quantity,
                }));
                if (exportRecord.assignedApprover && (exportRecord.assignedApprover as any).email) {
                    const approverEmail = (exportRecord.assignedApprover as any).email;
                    const approverName = (exportRecord.assignedApprover as any).name || (exportRecord.assignedApprover as any).username;
                    const creatorName = exportRecord.createdBy ? ((exportRecord.createdBy as any).name || (exportRecord.createdBy as any).username) : 'Unknown';

                    // Gửi mail
                    const sent = await this.mailService.sendMail(
                        approverEmail,
                        `[Device Management] Yêu cầu duyệt phiếu xuất kho: ${exportRecord.code}`,
                        'approval-request', // Template name
                        {
                            approverName,
                            code: exportRecord.code,
                            creatorName,
                            projectName: exportRecord.project || 'N/A',
                            customer: exportRecord.customer || 'N/A',
                            exportReason: exportRecord.exportReason || 'Không có lý do',
                            items, // Danh sách tóm tắt
                            link: `${this.baseUrl}/export/${exportRecord._id}`, // Link đến trang chi tiết
                        }
                    );

                    if (sent) {
                        // Đánh dấu đã gửi
                        exportRecord.isSubmitNotified = true;
                        await exportRecord.save();
                        this.logger.log(`Sent approval request email for ${exportRecord.code} to ${approverEmail}`);
                    }
                } else {
                    this.logger.warn(`Export ${exportRecord.code} has no assigned approver or email missing.`);
                }
            }
        } catch (error) {
            this.logger.error('Error processing approval request notifications', error.stack);
        }
    }

    // 2. Gửi mail kết quả duyệt (Approved/Rejected)
    private async processExportResults() {
        try {
            // Tìm các phiếu đã có kết quả (Approved/Rejected) nhưng chưa gửi thông báo cho người tạo
            const resultedExports = await this.deviceExportModel.find({
                status: { $in: [ExportStatus.APPROVED, ExportStatus.REJECTED] },
                isResultNotified: false,
            }).populate('approvedBy createdBy assignedApprover');

            this.logger.log(`Found ${resultedExports.length} resulted exports to notify.`);

            for (const exportRecord of resultedExports) {
                if (exportRecord.createdBy && (exportRecord.createdBy as any).email) {
                    const creatorEmail = (exportRecord.createdBy as any).email;
                    const creatorName = (exportRecord.createdBy as any).name || (exportRecord.createdBy as any).username;

                    // Xác định người duyệt/từ chối
                    let approverName = 'Admin';
                    if (exportRecord.status === ExportStatus.APPROVED && exportRecord.approvedBy) {
                        approverName = (exportRecord.approvedBy as any).name;
                    } else if (exportRecord.status === ExportStatus.REJECTED && exportRecord.assignedApprover) {
                        approverName = (exportRecord.assignedApprover as any).name;
                    }

                    const isApproved = exportRecord.status === ExportStatus.APPROVED;
                    const subject = isApproved
                        ? `[Device Management] Phiếu xuất kho ${exportRecord.code} ĐÃ ĐƯỢC DUYỆT`
                        : `[Device Management] Phiếu xuất kho ${exportRecord.code} BỊ TỪ CHỐI`;

                    await this.mailService.sendMail(
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
                        }
                    );

                    // Đánh dấu đã gửi
                    exportRecord.isResultNotified = true;
                    await exportRecord.save();
                    this.logger.log(`Sent result email (${exportRecord.status}) for ${exportRecord.code} to ${creatorEmail}`);
                }
            }
        } catch (error) {
            this.logger.error('Error processing export result notifications', error.stack);
        }
    }
}
