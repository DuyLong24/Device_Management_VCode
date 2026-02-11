import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeviceService } from './services/device.service';
import { DeviceStatsService } from './services/device-stats.service';
import { DeviceTransferService } from './services/device-transfer.service';
import { DeviceValidationService } from './services/device-validation.service';
import { DeviceController } from './controllers/device.controller';
import { DeviceRepository } from './repositories/device.repository';
import { Device, DeviceSchema } from './schemas/device.schemas';

import { WarehouseTransition, WarehouseTransitionSchema } from '../warehouse-transitions/schemas/warehouse-transition.schemas';
import { DeviceHistory, DeviceHistorySchema } from '../device-histories/schemas/device-history.schemas';
import { Warehouse, WarehouseSchema } from '../warehouses/schemas/warehouse.schemas';

import { ExcelModule } from '../../common/excel/excel.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { UsersModule } from '../../users/users.module';
import { SharedDataModule } from '../shared-data/shared-data.module';
import { WarrantyActivationTask } from './tasks/warranty-activation.task';
import { WarrantyExpirationTask } from './tasks/warranty-expiration.task';
import { DeviceHistoryModule } from '../device-histories/device-histories.module';
import { InventorySessionModule } from '../inventory-sessions/inventory-sessions.module';

import { PublicDeviceController } from './controllers/public-device.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Device.name, schema: DeviceSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: WarehouseTransition.name, schema: WarehouseTransitionSchema },
      { name: DeviceHistory.name, schema: DeviceHistorySchema }
    ]),
    WarehousesModule,
    SharedDataModule,
    forwardRef(() => DeviceHistoryModule),
    forwardRef(() => InventorySessionModule),
    UsersModule,
    ExcelModule,
  ],
  controllers: [DeviceController, PublicDeviceController],
  providers: [DeviceService, DeviceStatsService, DeviceTransferService, DeviceValidationService, DeviceRepository, WarrantyActivationTask, WarrantyExpirationTask],
  exports: [DeviceService, DeviceStatsService, DeviceTransferService, DeviceValidationService, DevicesModule],
})
export class DevicesModule { }