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
            serialTotal: exportRecord.totalQuantity,
            serialChecked: 0
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

    async scanSerial(sessionId: string, serial: string): Promise<ExportSession> {
        const session = await this.exportSessionRepository.findById(sessionId);
        if (!session) throw new NotFoundException('Phiên xuất kho không tồn tại');
        if (session.status !== ExportSessionStatus.IN_PROGRESS) {
            throw new BadRequestException('Phiên xuất kho đã kết thúc hoặc bị hủy');
        }

        const exportRecord = await this.deviceExportRepository.findById(session.exportId as any);
        if (!exportRecord) throw new NotFoundException('Phiếu xuất không tồn tại');

        // Validation
        await this.validateScan(serial, session, exportRecord);

        // Add
        const device = await this.deviceService.findByMac(serial); // Re-fetch to be safe/simple or optimize if needed
        const newItem = {
            serial: device.serial,
            deviceCode: device.deviceModel,
            deviceModel: device.deviceModel,
            scannedAt: new Date()
        };

        const updatedSession = await this.exportSessionRepository.update(sessionId, {
            $push: { items: newItem },
            $inc: { serialChecked: 1 }
        });

        return updatedSession;
    }

    async removeSerial(sessionId: string, serial: string): Promise<ExportSession> {
        const session = await this.exportSessionRepository.findById(sessionId);
        if (!session) throw new NotFoundException('Phiên xuất kho không tồn tại');

        if (session.status !== ExportSessionStatus.IN_PROGRESS) {
            throw new BadRequestException('Phiên xuất kho đã kết thúc hoặc bị hủy');
        }

        const itemExists = session.items.some(i => i.serial === serial);
        if (!itemExists) {
            throw new BadRequestException(`Serial ${serial} không có trong phiên này`);
        }

        const updatedSession = await this.exportSessionRepository.update(sessionId, {
            $pull: { items: { serial: serial } },
            $inc: { serialChecked: -1 }
        });

        return updatedSession;
    }

    async scanBulk(sessionId: string, serials: string[]): Promise<{
        success: string[];
        errors: { serial: string; error: string }[];
        warnings: { serial: string; warning: string }[];
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
        const errors: { serial: string; error: string }[] = [];
        const warnings: { serial: string; warning: string }[] = [];
        const uniqueMacs = [...new Set(serials)];

        // Pre-fetch all devices for performance
        const devices = await this.deviceService.findByMacs(uniqueMacs);
        const deviceMap = new Map();
        devices.forEach(d => deviceMap.set(d.mac, d));

        // Get Ready Warehouse ID Once
        const readyWarehouse = await this.warehouseRepository.findOne({ code: 'READY_TO_EXPORT' });

        for (const serial of uniqueMacs) {
            try {
                // Custom validate for bulk passing pre-fetched data if possible, but validateScan is robust
                // For bulk, let's call validateScan but we need to handle "Device Not Found" cleanly
                // Optimization: Re-implement checks here to avoid N queries

                // 1. Session Duplicate
                if (session.items.some(i => i.serial === serial)) {
                    throw new Error('Đã quét trong phiên này');
                }

                // 2. Existence
                const device = deviceMap.get(serial);
                if (!device) throw new Error('Mã MAC không tồn tại');

                // 3. Warehouse Check
                if (readyWarehouse && String(device.warehouseId) !== String(readyWarehouse._id)) {
                    throw new Error('Không nằm trong kho Sẵn sàng xuất');
                }

                // 4. Global Duplicate
                const otherSession = await this.exportSessionRepository.findOne({
                    status: ExportSessionStatus.IN_PROGRESS,
                    'items.serial': serial,
                    _id: { $ne: session._id }
                });
                if (otherSession) throw new Error(`Đang bị treo ở phiếu ${otherSession.sessionCode}`);

                // 5. Model Check
                if (!requirementMap.has(device.deviceModel)) {
                    throw new Error(`Sai loại thiết bị (${device.deviceModel})`);
                }

                // QUANTITY WARNING
                const requiredQty = requirementMap.get(device.deviceModel) || 0;
                const currentQty = scannedMap.get(device.deviceModel) || 0;
                if (currentQty >= requiredQty) {
                    warnings.push({ serial, warning: 'Quá số lượng yêu cầu' });
                }

                success.push(serial);
                scannedMap.set(device.deviceModel, currentQty + 1);

            } catch (err: any) {
                errors.push({ serial, error: err.message });
            }
        }

        // Insert Valid
        if (success.length > 0) {
            const newItems = success.map(serial => {
                const device = deviceMap.get(serial);
                return {
                    serial: device.serial,
                    deviceCode: device.deviceModel,
                    deviceModel: device.deviceModel,
                    scannedAt: new Date()
                };
            });

            await this.exportSessionRepository.update(sessionId, {
                $push: { items: { $each: newItems } },
                $inc: { serialChecked: newItems.length }
            });
        }

        return { success, errors, warnings };
    }

    private async validateScan(serial: string, session: ExportSession, exportRecord: any): Promise<void> {
        // 1. Check Duplicate Local
        if (session.items.some(i => i.serial === serial)) {
            throw new BadRequestException(`MAC ${serial} đã quét rồi`);
        }

        // 2. Check Device Existence
        const device = await this.deviceService.findByMac(serial);
        if (!device) throw new BadRequestException(`MAC ${serial} không tồn tại`);

        // 3. Check Warehouse Status
        const readyWarehouse = await this.warehouseRepository.findOne({ code: 'READY_TO_EXPORT' });
        if (readyWarehouse && String(device.warehouseId) !== String(readyWarehouse._id)) {
            throw new BadRequestException(`Thiết bị đang ở kho khác, chưa sẵn sàng xuất`);
        }

        // 4. Check Duplicate Global (Locked in another session)
        const otherSession = await this.exportSessionRepository.findOne({
            status: ExportSessionStatus.IN_PROGRESS,
            'items.serial': serial,
            _id: { $ne: session._id || session.id }
        });

        if (otherSession) {
            throw new BadRequestException(`MAC ${serial} đang được quét ở phiên ${otherSession.sessionCode} (${otherSession.sessionName})`);
        }

        // 5. Check Model Requirement
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

        const serials = session.items.map(i => i.serial);
        const exportRecord = await this.deviceExportRepository.findById(session.exportId as any); // Populate might be needed if exportId is object

        const exportItems = session.items.map(i => ({
            serial: i.serial,
            deviceModel: i.deviceModel,
            deviceCode: i.deviceCode,
            exportPrice: 0
        }));

        await this.deviceExportRepository.update(session.exportId as any, {
            $push: { items: { $each: exportItems } },
            $inc: { totalItems: exportItems.length }
        } as any);

        await this.deviceService.moveToSoldWarehouse(serials, exportRecord?.code || 'EXPORT-SESSION');

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
