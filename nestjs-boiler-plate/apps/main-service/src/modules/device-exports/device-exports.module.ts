import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeviceExportController } from './controllers/device-export.controller';
import { DeviceExportService } from './services/device-export.service';
import { DeviceExportRepository } from './repositories/device-export.repository';
import { DeviceExport, DeviceExportSchema } from './schemas/device-export.schemas';

import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DeviceExport.name, schema: DeviceExportSchema }]),
    DevicesModule
  ],
  controllers: [DeviceExportController],
  providers: [DeviceExportService, DeviceExportRepository],
  exports: [DeviceExportService, DeviceExportRepository]
})
export class DeviceExportModule { }
