import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeviceHistoryController } from './controllers/device-history.controller';
import { DeviceHistoryService } from './services/device-history.service';
import { DeviceHistoryRepository } from './repositories/device-history.repository';
import { DeviceHistory, DeviceHistorySchema } from './schemas/device-history.schemas';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DeviceHistory.name, schema: DeviceHistorySchema }])
  ],
  controllers: [DeviceHistoryController],
  providers: [DeviceHistoryService, DeviceHistoryRepository],
  exports: [DeviceHistoryService, DeviceHistoryRepository]
})
export class DeviceHistoryModule { }
