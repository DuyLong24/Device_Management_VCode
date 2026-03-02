import { Injectable, NotFoundException, BadRequestException, Logger, ConflictException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { InventorySessionRepository } from '../repositories/inventory-session.repository';
import { DeviceHistoryRepository } from '../../device-histories/repositories/device-history.repository';
import { CreateInventorySessionDto } from '../dto/create-inventory-session.dto';
import { UpdateInventorySessionDto } from '../dto/update-inventory-session.dto';
import { InventorySession } from '../schemas/inventory-session.schema';
import { DeviceImportRepository } from '../../device-imports/repositories/device-import.repository';
import { InventoryCoordinatorService } from '../../inventory-coordinator/services/inventory-coordinator.service';
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
        private readonly importRepo: DeviceImportRepository,
        private readonly coordinatorService: InventoryCoordinatorService,
        private readonly deviceService: DeviceService,
        private readonly warehouseRepo: WarehouseRepository,
        private readonly categoryRepo: CategoryRepository,
        private readonly historyRepo: DeviceHistoryRepository,
        @InjectConnection() private readonly connection: Connection,
    ) { }

    async create(createDto: CreateInventorySessionDto, userId: string): Promise<InventorySession> {
        const importTicket = await this.importRepo.findById(createDto.importId);
        if (!importTicket) throw new NotFoundException(ERROR_MESSAGES.INVENTORY.IMPORT_NOT_FOUND);
        if (importTicket.status !== 'PUBLIC') throw new BadRequestException('Phiếu nhập phải ở trạng thái PUBLIC mới được kiểm kê');
        if (importTicket.inventoryStatus === 'completed') throw new BadRequestException(ERROR_MESSAGES.INVENTORY.IMPORT_ALREADY_COMPLETED);

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
            const newMacs = updateDto.scannedItems.map(i => i.mac);
            const existingMacs = session.details.map(d => d.mac);
            const duplicates = newMacs.filter(s => existingMacs.includes(s));

            if (duplicates.length > 0) {
                throw new ConflictException(
                    ERROR_MESSAGES.INVENTORY.SERIAL_EXISTED.replace('{serials}', duplicates.join(', '))
                );
            }

            const itemsToPush = updateDto.scannedItems.map(item => ({
                mac: item.mac,
                deviceModel: item.deviceModel,
                deviceCode: item.deviceCode || 'Unknown',
                scannedAt: new Date()
            }));

            const updated = await this.sessionRepo.addScannedItems(id, itemsToPush, userId);
            return updated!;
        }

        return await this.sessionRepo.update(id, { ...updateDto, updatedBy: userId }) as InventorySession;
    }

    private async completeSession(session: InventorySession, userId: string): Promise<InventorySession> {
        const macsToCheck = session.details.map(d => d.mac);
        if (macsToCheck.length > 0) {
            const existingDevices = await this.deviceService.findByMacs(macsToCheck);
            if (existingDevices.length > 0) {
                const duplicateMacs = existingDevices.map(d => d.mac);
                throw new ConflictException({
                    message: `Phát hiện ${duplicateMacs.length} MAC đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.`,
                    error: 'DUPLICATE_MACS',
                    duplicates: duplicateMacs
                });
            }
        }

        const mongoSession = await this.connection.startSession();
        mongoSession.startTransaction();

        try {
            this.logger.log(`Bắt đầu hoàn tất phiên ${session.code}`);

            const warehouse = await this.warehouseRepo.findOne({ code: 'PENDING_QC' });
            if (!warehouse) throw new Error(ERROR_MESSAGES.INVENTORY.CONFIG_ERROR.replace('{warehouse}', 'PENDING_QC'));

            const importIdStr = String(session.importId);
            const importTicket = await this.importRepo.findById(importIdStr);
            if (!importTicket) throw new Error(ERROR_MESSAGES.INVENTORY.IMPORT_NOT_FOUND);

            const category = await this.categoryRepo.findOne({ name: importTicket.deviceType });

            const devicesToCreate = session.details.map(item => {
                const modelName = item.deviceModel || item.model || 'Unknown Device';

                let detailedName = modelName;
                let detailedP2P = '';
                let foundDetail: any = null;

                if (importTicket && importTicket.devices) {
                    for (const dev of importTicket.devices) {
                        const found = dev.expectedDetails?.find(d => d.mac === item.mac);
                        if (found) {
                            foundDetail = found;
                            detailedName = found.name || modelName;
                            detailedP2P = found.p2p || '';
                            break;
                        }
                    }
                }

                return {
                    code: item.deviceCode,
                    mac: item.mac,
                    serial: (foundDetail && foundDetail.serial) ? foundDetail.serial : '',
                    name: detailedName,
                    deviceModel: item.deviceCode || modelName,
                    unit: 'Cái',
                    qcStatus: 'PENDING',
                    warehouseId: String(warehouse._id),
                    categoryId: category ? String(category._id) : null,
                    importId: String(importTicket._id),
                    supplierId: importTicket.supplier || 'Unknown',
                    importDate: importTicket.importDate,
                    history: [],
                    p2p: detailedP2P,
                    currentExportId: null
                };
            });

            if (devicesToCreate.length > 0) {
                // ====================================================
                // SHIFT-LEFT GUARD: Skip insertMany if devices were already
                // auto-provisioned by the new Import flow (PUBLIC status)
                // ====================================================
                const existingCount = await this.deviceService.countByImportId(String(importTicket._id));
                if (existingCount > 0) {
                    this.logger.log(`[Inventory] Phiếu ${String(importTicket._id)} đã có ${existingCount} thiết bị (shift-left auto). Bỏ qua insertMany.`);
                } else {
                    const insertedDevices = await this.deviceService.insertMany(devicesToCreate, { session: mongoSession });

                    const validActorId = userId || '000000000000000000000000';

                    const historiesToCreate = insertedDevices.map(device => ({
                        deviceId: device._id,
                        action: 'IMPORT',
                        fromWarehouseId: warehouse._id,
                        toWarehouseId: warehouse._id,
                        actorId: validActorId,
                        note: 'Nhập kho từ kiểm kê',
                        createdAt: device.createdAt
                    }));

                    await this.historyRepo.insertMany(historiesToCreate, { session: mongoSession });
                }
            }

            const currentImported = importTicket.macImported || 0;
            const newTotal = currentImported + session.totalScanned;

            const deviceCounts: Record<string, number> = {};
            session.details.forEach(item => {
                const dCode = item.deviceCode || item.deviceModel;
                if (dCode) {
                    deviceCounts[dCode] = (deviceCounts[dCode] || 0) + 1;
                }
            });

            await this.sessionRepo.sessionModel.findByIdAndUpdate(
                String(session._id),
                { status: 'completed', updatedBy: userId },
                { session: mongoSession }
            );

            await mongoSession.commitTransaction();
            this.logger.log(`Hoàn tất phiên ${session.code} thành công.`);

            await this.coordinatorService.updateProgressAndAutoComplete(
                importIdStr,
                { macImported: newTotal, deviceCounts },
                String(session._id),
                userId
            );

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
        return this.sessionRepo.findById(id);
    }

    async removeItem(sessionId: string, mac: string): Promise<InventorySession> {
        const session = await this.sessionRepo.findById(sessionId);
        if (!session) throw new NotFoundException(ERROR_MESSAGES.INVENTORY.SESSION_NOT_FOUND);
        if (session.status === 'completed') throw new BadRequestException(ERROR_MESSAGES.INVENTORY.ALREADY_COMPLETED);

        const initialCount = session.details.length;
        session.details = session.details.filter(item => item.mac !== mac);

        if (session.details.length === initialCount) {
            throw new NotFoundException(`MAC ${mac} not found in session.`);
        }

        session.totalScanned = session.details.length;
        return session.save();
    }
}
