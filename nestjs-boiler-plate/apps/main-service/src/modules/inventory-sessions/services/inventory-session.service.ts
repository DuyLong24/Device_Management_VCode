import { Injectable, NotFoundException, BadRequestException, Logger, ConflictException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { InventorySessionRepository } from '../repositories/inventory-session.repository';
import { CreateInventorySessionDto } from '../dto/create-inventory-session.dto';
import { UpdateInventorySessionDto } from '../dto/update-inventory-session.dto';
import { InventorySession } from '../schemas/inventory-session.schema';
import { DeviceImportService } from '../../device-imports/services/device-import.service';
import { DeviceService } from '../../devices/services/device.service';
import { WarehouseRepository } from '../../warehouses/repositories/warehouse.repository';
import { CategoryRepository } from '../../categories/repositories/categories.repository';
import { ERROR_MESSAGES } from 'apps/main-service/src/common/constants/messages.constants';
import { FilterQuery } from 'mongoose';

@Injectable()
export class InventorySessionService {
    private readonly logger = new Logger(InventorySessionService.name);

    constructor(
        private readonly sessionRepo: InventorySessionRepository,
        private readonly deviceImportService: DeviceImportService,
        private readonly deviceService: DeviceService,
        private readonly warehouseRepo: WarehouseRepository,
        private readonly categoryRepo: CategoryRepository,
        @InjectConnection() private readonly connection: Connection,
    ) { }

    async create(createDto: CreateInventorySessionDto, userId: string): Promise<InventorySession> {
        const importTicket = await this.deviceImportService.findById(createDto.importId);
        if (!importTicket) throw new NotFoundException(ERROR_MESSAGES.INVENTORY.IMPORT_NOT_FOUND);
        if (importTicket.status === 'COMPLETED') throw new BadRequestException(ERROR_MESSAGES.INVENTORY.IMPORT_ALREADY_COMPLETED);

        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const code = `PKK-${dateStr}-${random}`;

        return this.sessionRepo.create({
            ...createDto,
            code,
            status: 'processing',
            details: [],
            totalScanned: 0,
            createdBy: userId,
        });
    }

    async update(id: string, updateDto: UpdateInventorySessionDto, userId: string): Promise<InventorySession> {
        const session = await this.sessionRepo.findById(id);
        if (!session) throw new NotFoundException(ERROR_MESSAGES.INVENTORY.SESSION_NOT_FOUND);
        if (session.status === 'completed') throw new BadRequestException(ERROR_MESSAGES.INVENTORY.ALREADY_COMPLETED);

        if (updateDto.status === 'completed') {
            return await this.completeSession(session, userId);
        }

        if (updateDto.scannedItems && updateDto.scannedItems.length > 0) {
            const newSerials = updateDto.scannedItems.map(i => i.serial);
            const existingSerials = session.details.map(d => d.serial);
            const duplicates = newSerials.filter(s => existingSerials.includes(s));

            if (duplicates.length > 0) {
                throw new ConflictException(
                    ERROR_MESSAGES.INVENTORY.SERIAL_EXISTED.replace('{serials}', duplicates.join(', '))
                );
            }

            const itemsToPush = updateDto.scannedItems.map(item => ({
                serial: item.serial,
                deviceModel: item.deviceModel,
                productCode: item.productCode || 'Unknown',
                scannedAt: new Date()
            }));

            const updated = await this.sessionRepo.addScannedItems(id, itemsToPush, userId);
            return updated!;
        }

        return await this.sessionRepo.update(id, { ...updateDto, updatedBy: userId }) as InventorySession;
    }

    private async completeSession(session: InventorySession, userId: string): Promise<InventorySession> {
        const mongoSession = await this.connection.startSession();
        mongoSession.startTransaction();

        try {
            this.logger.log(`Bắt đầu hoàn tất phiên ${session.code}`);

            const warehouse = await this.warehouseRepo.findOne({ code: 'PENDING_QC' });
            if (!warehouse) throw new Error(ERROR_MESSAGES.INVENTORY.CONFIG_ERROR.replace('{warehouse}', 'PENDING_QC'));

            const importIdStr = String(session.importId);
            const importTicket = await this.deviceImportService.findById(importIdStr);
            if (!importTicket) throw new Error(ERROR_MESSAGES.INVENTORY.IMPORT_NOT_FOUND);

            const category = await this.categoryRepo.findOne({ name: importTicket.productType });

            const devicesToCreate = session.details.map(item => {
                const modelName = item.deviceModel || item.model || 'Unknown Device';
                return {
                    code: item.serial,
                    serial: item.serial,
                    name: modelName,
                    deviceModel: item.productCode || modelName,
                    unit: 'Cái',
                    qcStatus: 'PENDING',
                    warehouseId: String(warehouse._id),
                    categoryId: category ? String(category._id) : null,
                    importId: String(importTicket._id),
                    supplierId: importTicket.supplier || 'Unknown',
                    importDate: importTicket.importDate,
                    history: [],
                    mac: '',
                    p2p: '',
                    currentExportId: null
                };
            });

            if (devicesToCreate.length > 0) {
                await this.deviceService.insertMany(devicesToCreate, { session: mongoSession });
            }

            const currentImported = importTicket.serialImported || 0;
            const newTotal = currentImported + session.totalScanned;

            let newImportStatus = importTicket.inventoryStatus;
            if (newTotal > 0 && newTotal < importTicket.totalQuantity) newImportStatus = 'in-progress';
            if (newTotal >= importTicket.totalQuantity) newImportStatus = 'completed';

            // Calculate per-product counts from this session
            const productCounts: Record<string, number> = {};
            session.details.forEach(item => {
                const pCode = item.productCode || item.deviceModel; // fallback if productCode missing
                if (pCode) {
                    productCounts[pCode] = (productCounts[pCode] || 0) + 1;
                }
            });

            await this.deviceImportService.updateProgress(String(importTicket._id), {
                serialImported: newTotal,
                productCounts
            });

            await this.sessionRepo.sessionModel.findByIdAndUpdate(
                String(session._id),
                { status: 'completed', updatedBy: userId },
                { session: mongoSession }
            );

            await mongoSession.commitTransaction();
            this.logger.log(`Hoàn tất phiên ${session.code} thành công. Đã tạo ${devicesToCreate.length} thiết bị.`);

            return await this.sessionRepo.findById(String(session._id)) as InventorySession;

        } catch (error: any) {
            await mongoSession.abortTransaction();
            this.logger.error(`Lỗi hoàn tất phiên: ${error.message}`);
            throw new BadRequestException(ERROR_MESSAGES.INVENTORY.COMPLETE_FAILED.replace('{error}', error.message));
        } finally {
            await mongoSession.endSession();
        }
    }

    async findAll(filter: FilterQuery<InventorySession> = {}): Promise<InventorySession[]> {
        return this.sessionRepo.findAll(filter);
    }

    async findById(id: string): Promise<InventorySession> {
        return this.sessionRepo.findById(id) as Promise<InventorySession>;
    }
}