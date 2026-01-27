import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DeviceImportService } from '../modules/device-imports/services/device-import.service';
import { UserService } from '../users/services/user.service';
import { DeviceService } from '../modules/devices/services/device.service';
import { DeviceImportRepository } from '../modules/device-imports/repositories/device-import.repository';
import { InventorySessionRepository } from '../modules/inventory-sessions/repositories/inventory-session.repository';
import { DeviceExportRepository } from '../modules/device-exports/repositories/device-export.repository';
import { ExportSessionRepository } from '../modules/device-exports/repositories/export-session.repository';
import { DeviceHistoryRepository } from '../modules/device-histories/repositories/device-history.repository';
import { Logger } from '@nestjs/common';

async function migrateUserUUIDs() {
    const logger = new Logger('Migration');
    logger.log('Starting migration of User UUIDs to Local ObjectIds...');

    const app = await NestFactory.createApplicationContext(AppModule);

    const deviceImportRepo = app.get(DeviceImportRepository);
    const inventorySessionRepo = app.get(InventorySessionRepository);
    const deviceExportRepo = app.get(DeviceExportRepository);
    const exportSessionRepo = app.get(ExportSessionRepository);
    const deviceHistoryRepo = app.get(DeviceHistoryRepository);
    const userService = app.get(UserService);
    const deviceService = app.get(DeviceService);

    try {


        const migrateCollection = async (repo: any, name: string) => {
            logger.log(`Scanning ${name}...`);
            const items = await repo.findAll({});
            let fixed = 0;

            for (const item of items) {
                let updated = false;
                const updateData: any = {};

                // check người tạo
                if (item.createdBy && typeof item.createdBy === 'string' && item.createdBy.length > 30) {
                    try {
                        const user = await userService.syncFromKeycloak({ sub: item.createdBy });
                        if (user) {
                            updateData.createdBy = user._id;
                            updated = true;
                        }
                    } catch (e) {
                        logger.error(`Failed to resolve createdBy UUID ${item.createdBy} for ${name} ${item._id}`);
                    }
                }

                // check người cập nhật
                if (item.updatedBy && typeof item.updatedBy === 'string' && item.updatedBy.length > 30) {
                    try {
                        const user = await userService.syncFromKeycloak({ sub: item.updatedBy });
                        if (user) {
                            updateData.updatedBy = user._id;
                            updated = true;
                        }
                    } catch (e) {
                        logger.error(`Failed to resolve updatedBy UUID ${item.updatedBy} for ${name} ${item._id}`);
                    }
                }

                // check người thao tác
                if (item.actorId && typeof item.actorId === 'string' && item.actorId.length > 30) {
                    try {
                        const user = await userService.syncFromKeycloak({ sub: item.actorId });
                        if (user) {
                            updateData.actorId = user._id;
                            updated = true;
                        }
                    } catch (e) {
                        logger.error(`Failed to resolve actorId UUID ${item.actorId} for ${name} ${item._id}`);
                    }
                }

                // apply update
                if (updated) {
                    await repo.update(item._id.toString(), updateData);
                    fixed++;
                }
            }
            logger.log(`Completed ${name}: Fixed ${fixed}/${items.length} items.`);
        };

        await migrateCollection(deviceImportRepo, 'DeviceImport');
        await migrateCollection(inventorySessionRepo, 'InventorySession');
        await migrateCollection(deviceExportRepo, 'DeviceExport');
        await migrateCollection(exportSessionRepo, 'ExportSession');
        await migrateCollection(deviceHistoryRepo, 'DeviceHistory');

        logger.log('Migration completed successfully.');

    } catch (error) {
        logger.error('Migration failed', error);
    }

    try {
        logger.log('Starting Backfill of Missing Device History...');
        const allDevices = await deviceService.findAll({});

        let backfilled = 0;
        for (const device of allDevices) {
            const historyCount = await deviceHistoryRepo.findAll({ deviceId: device._id });
            if (historyCount.length === 0) {
                const importId = device.importId;
                let actorId = null;
                let importDate = device.createdAt;
                if (importId) {
                    const ticket = await deviceImportRepo.findById(importId.toString());
                    if (ticket) {
                        actorId = ticket.createdBy || ticket.updatedBy; // This should be ObjectId now (if migrated)
                        importDate = ticket.importDate || device.createdAt;
                    }
                }

                if (actorId && typeof actorId === 'object' && '_id' in actorId) {
                    actorId = actorId._id;
                }

                if (actorId) {
                    const historyItem = {
                        deviceId: String(device._id),
                        action: 'IMPORT',
                        fromWarehouseId: (device.warehouseId && typeof device.warehouseId === 'object' && '_id' in (device.warehouseId as any))
                            ? String((device.warehouseId as any)._id)
                            : String(device.warehouseId),
                        toWarehouseId: (device.warehouseId && typeof device.warehouseId === 'object' && '_id' in (device.warehouseId as any))
                            ? String((device.warehouseId as any)._id)
                            : String(device.warehouseId),
                        actorId: String(actorId),
                        note: 'Backfilled Import History',
                        createdAt: importDate
                    };

                    await deviceHistoryRepo.insertMany([historyItem]);
                    backfilled++;
                }
            }
        }
        logger.log(`Backfilled history for ${backfilled} devices.`);

    } catch (e) {
        logger.error('Backfill failed', e);
    } finally {
        await app.close();
    }
}

migrateUserUUIDs();
