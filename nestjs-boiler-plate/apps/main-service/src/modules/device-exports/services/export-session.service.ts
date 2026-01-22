import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ExportSessionRepository } from '../repositories/export-session.repository';
import { CreateExportSessionDto } from '../dto/create-export-session.dto';
import { ExportSession, ExportSessionStatus } from '../schemas/export-session.schemas';
import { DeviceExportRepository } from '../repositories/device-export.repository';
import { DeviceService } from '../../devices/services/device.service';
import { ExportStatus } from '../schemas/device-export.schemas';

@Injectable()
export class ExportSessionService {
    constructor(
        private readonly exportSessionRepository: ExportSessionRepository,
        private readonly deviceExportRepository: DeviceExportRepository,
        private readonly deviceService: DeviceService,
    ) { }

    async create(dto: CreateExportSessionDto, userId: string): Promise<ExportSession> {
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
        console.log(`[scanSerial] Start: Session=${sessionId}, Serial=${serial}`);
        const session = await this.exportSessionRepository.findById(sessionId);
        if (!session) throw new NotFoundException('Phiên xuất kho không tồn tại');

        if (session.status !== ExportSessionStatus.IN_PROGRESS) {
            throw new BadRequestException('Phiên xuất kho đã kết thúc hoặc bị hủy');
        }

        if (session.items.some(i => i.serial === serial)) {
            console.warn(`[scanSerial] Duplicate in session: ${serial}`);
            throw new BadRequestException(`Serial ${serial} đã được quét trong phiên này`);
        }

        const exportRecord = await this.deviceExportRepository.findById(session.exportId as any);
        if (!exportRecord) throw new NotFoundException('Phiếu xuất không tồn tại');

        const requirements = exportRecord.requirements.map(r => r.productCode);
        const requirementMap = new Set(requirements);
        console.log(`[scanSerial] Requirements: ${JSON.stringify(requirements)}`);

        // Lấy thông tin thiết và validate
        const device = await this.deviceService.findByMac(serial);
        if (!device) {
            console.warn(`[scanSerial] Device not found: ${serial}`);
            throw new BadRequestException(`MAC ${serial} không tồn tại trong hệ thống`);
        }
        console.log(`[scanSerial] Device Found: ${device.serial}, Model=${device.deviceModel}`);

        if (!requirementMap.has(device.deviceModel)) {
            console.warn(`[scanSerial] Validation Failed: DeviceModel=${device.deviceModel} not in Requirements`);
            throw new BadRequestException(`Vi phạm: Serial ${serial} (${device.deviceModel}) không nằm trong yêu cầu của phiếu xuất này.`);
        }

        // Add to session items
        const newItem = {
            serial: device.serial,
            productCode: device.deviceModel,
            deviceModel: device.deviceModel,
            scannedAt: new Date()
        };

        const updatedSession = await this.exportSessionRepository.update(sessionId, {
            $push: { items: newItem },
            $inc: { serialChecked: 1 }
        });

        console.log(`[scanSerial] Success`);
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

        if (session.status !== ExportSessionStatus.IN_PROGRESS) {
            throw new BadRequestException('Phiên xuất kho đã kết thúc hoặc bị hủy');
        }

        const exportRecord = await this.deviceExportRepository.findById(session.exportId as any);
        if (!exportRecord) throw new NotFoundException('Phiếu xuất không tồn tại');

        const requirementMap = new Map<string, number>();
        exportRecord.requirements.forEach(req => {
            requirementMap.set(req.productCode, req.quantity);
        });

        const scannedMap = new Map<string, number>();
        session.items.forEach(i => {
            const code = i.productCode || i.deviceModel;
            scannedMap.set(code, (scannedMap.get(code) || 0) + 1);
        });

        const success: string[] = [];
        const errors: { serial: string; error: string }[] = [];
        const warnings: { serial: string; warning: string }[] = [];

        const uniqueMacs = [...new Set(serials)];
        const devices = await this.deviceService.findByMacs(uniqueMacs);
        const deviceMap = new Map();
        devices.forEach(d => deviceMap.set(d.mac, d));

        const newItems: any[] = [];

        for (const serial of uniqueMacs) {
            if (session.items.some(i => i.serial === serial)) {
                errors.push({ serial, error: 'DOUBLE_SCAN_IN_SESSION' });
                continue;
            }

            const device = deviceMap.get(serial);
            if (!device) {
                errors.push({ serial, error: 'NOT_FOUND' });
                continue;
            }

            const model = device.deviceModel;
            if (!requirementMap.has(model)) {
                errors.push({ serial, error: 'WRONG_MODEL' });
                continue;
            }

            // Check Quantity (Warning)
            const requiredQty = requirementMap.get(model) || 0;
            const currentQty = scannedMap.get(model) || 0;

            if (currentQty >= requiredQty) {
                warnings.push({ serial, warning: 'EXCESS_QUANTITY' });
            }

            // Valid
            success.push(serial);
            newItems.push({
                serial: device.serial,
                productCode: device.deviceModel,
                deviceModel: device.deviceModel,
                scannedAt: new Date()
            });

            scannedMap.set(model, currentQty + 1);
        }

        // 3. Update Session
        if (newItems.length > 0) {
            await this.exportSessionRepository.update(sessionId, {
                $push: { items: { $each: newItems } },
                $inc: { serialChecked: newItems.length }
            });
        }

        return { success, errors, warnings };
    }

    async completeSession(sessionId: string, userId: string): Promise<ExportSession> {
        const session = await this.exportSessionRepository.findById(sessionId);
        if (!session) throw new NotFoundException('Session not found');
        if (session.status !== ExportSessionStatus.IN_PROGRESS) throw new BadRequestException('Session creation is not in progress');

        if (session.items.length === 0) {
            throw new BadRequestException('Chưa quét được sản phẩm nào');
        }

        const serials = session.items.map(i => i.serial);
        const exportRecord = await this.deviceExportRepository.findById(session.exportId as any); // Populate might be needed if exportId is object

        const exportItems = session.items.map(i => ({
            serial: i.serial,
            deviceModel: i.deviceModel,
            productCode: i.productCode,
            exportPrice: 0
        }));

        await this.deviceExportRepository.update(session.exportId as any, {
            $push: { items: { $each: exportItems } },
            $inc: { totalItems: exportItems.length }
        } as any);

        return this.exportSessionRepository.update(sessionId, {
            status: ExportSessionStatus.COMPLETED,
            completedBy: userId,
            completedAt: new Date()
        });
    }
}
