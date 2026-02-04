import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryCoordinatorService } from './services/inventory-coordinator.service';
import { DeviceImport, DeviceImportSchema } from '../device-imports/schemas/device-import.schemas';
import { InventorySession, InventorySessionSchema } from '../inventory-sessions/schemas/inventory-session.schema';
import { DeviceImportRepository } from '../device-imports/repositories/device-import.repository';
import { InventorySessionRepository } from '../inventory-sessions/repositories/inventory-session.repository';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: DeviceImport.name, schema: DeviceImportSchema },
            { name: InventorySession.name, schema: InventorySessionSchema }
        ])
    ],
    providers: [
        InventoryCoordinatorService,
        DeviceImportRepository,
        InventorySessionRepository
    ],
    exports: [InventoryCoordinatorService]
})
export class InventoryCoordinatorModule { }
