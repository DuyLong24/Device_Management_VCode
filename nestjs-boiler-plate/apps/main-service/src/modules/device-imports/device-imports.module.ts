import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeviceImportController } from './controllers/device-import.controller';
import { DeviceImportService } from './services/device-import.service';
import { DeviceImportRepository } from './repositories/device-import.repository';
import { DeviceImport, DeviceImportSchema } from './schemas/device-import.schemas';
import { DevicesModule } from '../devices/devices.module';
import { CategoriesModule } from '../categories/categories.module';
import { InventoryCoordinatorModule } from '../inventory-coordinator/inventory-coordinator.module';
import { UsersModule } from '../../users/users.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { Device, DeviceSchema } from '../devices/schemas/device.schemas';
import { DeviceHistory, DeviceHistorySchema } from '../device-histories/schemas/device-history.schemas';
import { Category, CategorySchema } from '../categories/schemas/categories.schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeviceImport.name, schema: DeviceImportSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: DeviceHistory.name, schema: DeviceHistorySchema },
    ]),
    DevicesModule,
    CategoriesModule,
    UsersModule,
    InventoryCoordinatorModule,
    WarehousesModule,
  ],
  controllers: [DeviceImportController],
  providers: [DeviceImportService, DeviceImportRepository],
  exports: [DeviceImportService, DeviceImportRepository]
})
export class DeviceImportModule { }
