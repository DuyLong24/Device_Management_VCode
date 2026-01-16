import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventorySessionController } from './controllers/inventory-session.controller';
import { InventorySessionService } from './services/inventory-session.service';
import { InventorySessionRepository } from './repositories/inventory-session.repository';
import { InventorySession, InventorySessionSchema } from './schemas/inventory-session.schema';
import { DeviceImportModule } from '../device-imports/device-imports.module';
import { DevicesModule } from '../devices/devices.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: InventorySession.name, schema: InventorySessionSchema }]),
        forwardRef(() => DeviceImportModule),
        DevicesModule,
        WarehousesModule,
        CategoriesModule
    ],
    controllers: [InventorySessionController],
    providers: [InventorySessionService, InventorySessionRepository],
    exports: [InventorySessionService]
})
export class InventorySessionModule { }