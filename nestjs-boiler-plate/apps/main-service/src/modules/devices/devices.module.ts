import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeviceService } from './services/device.service';
import { DeviceController } from './controllers/device.controller';
import { DeviceRepository } from './repositories/device.repository';
import { Device, DeviceSchema } from './schemas/device.schemas';

import { WarehouseTransition, WarehouseTransitionSchema } from '../warehouse-transitions/schemas/warehouse-transition.schemas';
import { DeviceHistory, DeviceHistorySchema } from '../device-histories/schemas/device-history.schemas';

import { ExcelModule } from '../../common/excel/excel.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Device.name, schema: DeviceSchema },
      { name: WarehouseTransition.name, schema: WarehouseTransitionSchema },
      { name: DeviceHistory.name, schema: DeviceHistorySchema },
    ]),
    ExcelModule,
  ],
  controllers: [DeviceController],
  providers: [DeviceService, DeviceRepository],
  exports: [DeviceService, DevicesModule],
})
export class DevicesModule { }