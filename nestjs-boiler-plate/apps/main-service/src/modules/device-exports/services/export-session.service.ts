import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ExportSessionRepository } from '../repositories/export-session.repository';
import mongoose from 'mongoose';
import { CreateExportSessionDto } from '../dto/create-export-session.dto';
import { ExportSession, ExportSessionStatus } from '../schemas/export-session.schemas';
import { DeviceExportRepository } from '../repositories/device-export.repository';
import { DeviceService } from '../../devices/services/device.service';
import { ExportStatus } from '../schemas/device-export.schemas';
import { WarehouseRepository } from '../../warehouses/repositories/warehouse.repository';


@Injectable()
export class ExportSessionService {
    constructor(
        private readonly exportSessionRepository: ExportSessionRepository,
        private readonly deviceExportRepository: DeviceExportRepository,
        private readonly deviceService: DeviceService,
        private readonly warehouseRepository: WarehouseRepository,
    ) { }

    async create(dto: CreateExportSessionDto, userId: string): Promise<ExportSession> {
        console.log('ExportSessionService.create DTO:', JSON.stringify(dto));

        if (!mongoose.Types.ObjectId.isValid(dto.exportId)) {
            throw new BadRequestException(`Invalid Export ID format: ${dto.exportId}`);
        }

        const exportRecord = await this.deviceExportRepository.findById(dto.exportId);
        if (!exportRecord) {
            throw new NotFoundException('Phiếu xuất không tồn tại');
        }

        if (exportRecord.status !== ExportStatus.APPROVED && exportRecord.status !== ExportStatus.IN_PROGRESS) {
            throw new BadRequestException('Chỉ có thể tạo phiên xuất kho cho phiếu đã được Duyệt hoặc Đang xuất.');
        }

        // Auto generate session code
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const sessionCode = `EXS-${dateStr}-${randomSuffix}`;

        // Default session name if not provided
        const sessionName = dto.sessionName || `Phiên xuất kho ${exportRecord.code} - ${new Date().toLocaleString('vi-VN')}`;

        const newSession = await this.exportSessionRepository.create({
            exportId: dto.exportId,
            sessionCode,
            sessionName,
            status: ExportSessionStatus.IN_PROGRESS,
            note: dto.note,
            createdBy: userId,
            macTotal: exportRecord.totalQuantity,
            macChecked: 0
        });

        // Update Export status -> IN_PROGRESS nếu là APPROVED
        if (exportRecord.status === ExportStatus.APPROVED) {
            await this.deviceExportRepository.update(exportRecord.id, { status: ExportStatus.IN_PROGRESS } as any);
        }

        return newSession;
    }

    async getSessionsByExportId(exportId: string): Promise<ExportSession[]> {
        return this.exportSessionRepository.findAll({ exportId });
    }

    async findById(id: string) {
        return this.exportSessionRepository.findById(id);
    }

    async scanMac(sessionId: string, mac: string): Promise<ExportSession> {
        const session = await this.exportSessionRepository.findById(sessionId);
        if (!session) throw new NotFoundException('Phiên xuất kho không tồn tại');
        if (session.status !== ExportSessionStatus.IN_PROGRESS) {
            throw new BadRequestException('Phiên xuất kho đã kết thúc hoặc bị hủy');
        }

        const exportRecord = await this.deviceExportRepository.findById(session.exportId as any);
        if (!exportRecord) throw new NotFoundException('Phiếu xuất không tồn tại');

        // Validation
        await this.validateScan(mac, session, exportRecord);

        // Add
        const device = await this.deviceService.findByMac(mac);
        const newItem = {
            mac: device.mac,
            deviceCode: device.deviceModel,
            deviceModel: device.deviceModel,
            scannedAt: new Date()
        };

        const updatedSession = await this.exportSessionRepository.update(sessionId, {
            $push: { items: newItem },
            $inc: { macChecked: 1 }
        });

        return updatedSession;
    }

    async removeMac(sessionId: string, mac: string): Promise<ExportSession> {
        const session = await this.exportSessionRepository.findById(sessionId);
        if (!session) throw new NotFoundException('Phiên xuất kho không tồn tại');

        if (session.status !== ExportSessionStatus.IN_PROGRESS) {
            throw new BadRequestException('Phiên xuất kho đã kết thúc hoặc bị hủy');
        }

        const itemExists = session.items.some(i => i.mac === mac);
        if (!itemExists) {
            throw new BadRequestException(`MAC ${mac} không có trong phiên này`);
        }

        const updatedSession = await this.exportSessionRepository.update(sessionId, {
            $pull: { items: { mac: mac } },
            $inc: { macChecked: -1 }
        });

        return updatedSession;
    }

    async scanBulk(sessionId: string, macs: string[]): Promise<{
        success: string[];
        errors: { mac: string; error: string }[];
        warnings: { mac: string; warning: string }[];
    }> {
        const session = await this.exportSessionRepository.findById(sessionId);
        if (!session) throw new NotFoundException('Phiên xuất kho không tồn tại');
        if (session.status !== ExportSessionStatus.IN_PROGRESS) throw new BadRequestException('Phiên xuất kho đã đóng');

        const exportRecord = await this.deviceExportRepository.findById(session.exportId as any);
        const requirementMap = new Map<string, number>();
        exportRecord.requirements.forEach(req => requirementMap.set(req.deviceCode, req.quantity));

        const scannedMap = new Map<string, number>();
        session.items.forEach(i => {
            const code = i.deviceCode || i.deviceModel;
            scannedMap.set(code, (scannedMap.get(code) || 0) + 1);
        });

        const success: string[] = [];
        const errors: { mac: string; error: string }[] = [];
        const warnings: { mac: string; warning: string }[] = [];
        const uniqueMacs = [...new Set(macs)];

        const devices = await this.deviceService.findByScannedCodes(uniqueMacs, 'mac');
        const deviceMap = new Map();
        devices.forEach(d => deviceMap.set(d.mac, d));

        const readyWarehouse = await this.warehouseRepository.findOne({ code: 'READY_TO_EXPORT' });

        for (const mac of uniqueMacs) {
            try {

                // 1. Session Duplicate
                if (session.items.some(i => i.mac === mac)) {
                    throw new Error('Đã quét trong phiên này');
                }

                // 2. Existence
                const device = deviceMap.get(mac);
                if (!device) throw new Error(`Mã MAC ${mac} không tồn tại`);

                // 3. Warehouse Check
                if (readyWarehouse && String(device.warehouseId) !== String(readyWarehouse._id)) {
                    throw new Error('Không nằm trong kho Sẵn sàng xuất');
                }

                // 4. Global Duplicate
                const otherSession = await this.exportSessionRepository.findOne({
                    status: ExportSessionStatus.IN_PROGRESS,
                    'items.mac': mac,
                    _id: { $ne: session._id }
                });
                if (otherSession) throw new Error(`Đang bị treo ở phiếu ${otherSession.sessionCode}`);

                // 5. Model Check
                if (!requirementMap.has(device.deviceModel)) {
                    throw new Error(`Sai loại thiết bị (${device.deviceModel})`);
                }

                // 6. Kiểm tra số lượng
                const requiredQty = requirementMap.get(device.deviceModel) || 0;
                const currentQty = scannedMap.get(device.deviceModel) || 0;
                if (currentQty >= requiredQty) {
                    throw new Error(`Đã đủ số lượng cho model ${device.deviceModel} (${currentQty}/${requiredQty})`);
                }

                success.push(mac);
                scannedMap.set(device.deviceModel, currentQty + 1);

            } catch (err: any) {
                errors.push({ mac, error: err.message });
            }
        }

        // Insert Valid
        if (success.length > 0) {
            const newItems = success.map(mac => {
                const device = deviceMap.get(mac);
                return {
                    mac: device.mac,
                    deviceCode: device.deviceModel,
                    deviceModel: device.deviceModel,
                    scannedAt: new Date()
                };
            });

            await this.exportSessionRepository.update(sessionId, {
                $push: { items: { $each: newItems } },
                $inc: { macChecked: newItems.length }
            });
        }

        return { success, errors, warnings };
    }

    private async validateScan(mac: string, session: ExportSession, exportRecord: any): Promise<void> {
        if (session.items.some(i => i.mac === mac)) {
            throw new BadRequestException(`MAC ${mac} đã quét rồi`);
        }

        const device = await this.deviceService.findByMac(mac);
        if (!device) throw new BadRequestException(`MAC ${mac} không tồn tại`);

        const readyWarehouse = await this.warehouseRepository.findOne({ code: 'READY_TO_EXPORT' });
        if (readyWarehouse && String(device.warehouseId) !== String(readyWarehouse._id)) {
            throw new BadRequestException(`Thiết bị đang ở kho khác, chưa sẵn sàng xuất`);
        }

        const otherSession = await this.exportSessionRepository.findOne({
            status: ExportSessionStatus.IN_PROGRESS,
            'items.mac': mac,
            _id: { $ne: session._id || session.id }
        });

        if (otherSession) {
            throw new BadRequestException(`MAC ${mac} đang được quét ở phiên ${otherSession.sessionCode} (${otherSession.sessionName})`);
        }

        const requirements = new Set(exportRecord.requirements.map(r => r.deviceCode));
        if (!requirements.has(device.deviceModel)) {
            throw new BadRequestException(`Loại thiết bị ${device.deviceModel} không nằm trong phiếu xuất này`);
        }
    }

    async completeSession(sessionId: string, userId: string): Promise<ExportSession> {
        const session = await this.exportSessionRepository.findById(sessionId);
        if (!session) throw new NotFoundException('Session not found');
        if (session.status !== ExportSessionStatus.IN_PROGRESS) throw new BadRequestException('Session creation is not in progress');

        if (session.items.length === 0) {
            throw new BadRequestException('Chưa quét được thiết bị nào');
        }

        const macs = session.items.map(i => i.mac);
        const exportRecord = await this.deviceExportRepository.findById(session.exportId as any);

        // Xác định kho đích dựa trên loại xuất
        let targetWarehouseCode = 'SOLD'; // Default
        let activationDate: Date | null = null;

        const reason = (exportRecord?.exportReason || exportRecord?.type) as string;

        // Luôn ưu tiên kiểm tra cài đặt "Kích hoạt sau"
        if (exportRecord?.activationDays > 0) {
            targetWarehouseCode = 'NOT_ACTIVATED';
            const today = new Date();
            activationDate = new Date(today.setDate(today.getDate() + exportRecord.activationDays));
        } else if (reason === 'WARRANTY') {
            targetWarehouseCode = 'IN_WARRANTY'; // Trong bảo hành
        } else if (reason === 'TRANSFER') {
            targetWarehouseCode = 'TRANSFERRED'; // Chuyển kho
        } else {
            // Mặc định xuất bán thông thường, kích hoạt ngay hôm nay
            activationDate = new Date();
        }

        const exportItems = session.items.map(i => ({
            mac: i.mac,
            deviceModel: i.deviceModel,
            deviceCode: i.deviceCode,
            exportPrice: 0,
            scannedAt: i.scannedAt || new Date(),
            scannedBy: userId
        }));

        await this.deviceExportRepository.update(session.exportId as any, {
            $push: { items: { $each: exportItems } },
            $inc: { totalItems: exportItems.length }
        } as any);

        const exportIdStr = (typeof session.exportId === 'object' && session.exportId !== null && '_id' in session.exportId)
            ? (session.exportId as any)._id.toString()
            : (session.exportId as any).toString();

        await this.deviceService.moveDevicesToWarehouse(
            macs,
            targetWarehouseCode,
            exportRecord?.code || 'EXPORT-SESSION',
            userId,
            activationDate,
            exportIdStr,
            exportRecord?.defaultWarrantyMonths
        );

        const sessionUpdateResult = await this.exportSessionRepository.update(sessionId, {
            status: ExportSessionStatus.COMPLETED,
            completedBy: userId,
            completedAt: new Date()
        });

        const updatedExport = await this.deviceExportRepository.findById(session.exportId as any);
        if (updatedExport && updatedExport.totalItems >= updatedExport.totalQuantity) {
            await this.deviceExportRepository.update(session.exportId as any, {
                status: ExportStatus.COMPLETED,
                completedBy: userId,
                completedAt: new Date()
            } as any);
        }

        return sessionUpdateResult;
    }
}
