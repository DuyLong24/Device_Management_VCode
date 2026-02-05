import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventorySessionController } from './controllers/inventory-session.controller';
import { InventorySessionService } from './services/inventory-session.service';
import { InventorySessionRepository } from './repositories/inventory-session.repository';
import { InventorySession, InventorySessionSchema } from './schemas/inventory-session.schema';
import { DeviceImportRepository } from '../device-imports/repositories/device-import.repository';
import { DeviceImport, DeviceImportSchema } from '../device-imports/schemas/device-import.schemas';
import { InventoryCoordinatorModule } from '../inventory-coordinator/inventory-coordinator.module';
import { DevicesModule } from '../devices/devices.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { CategoriesModule } from '../categories/categories.module';
import { UsersModule } from '../../users/users.module';
import { DeviceHistoryModule } from '../device-histories/device-histories.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: InventorySession.name, schema: InventorySessionSchema },
            { name: DeviceImport.name, schema: DeviceImportSchema }
        ]),
        InventoryCoordinatorModule,
        forwardRef(() => DevicesModule),
        WarehousesModule,
        CategoriesModule,
        UsersModule,
        DeviceHistoryModule
    ],
    controllers: [InventorySessionController],
    providers: [InventorySessionService, InventorySessionRepository, DeviceImportRepository],
    exports: [InventorySessionService, InventorySessionRepository]
})
export class InventorySessionModule { }