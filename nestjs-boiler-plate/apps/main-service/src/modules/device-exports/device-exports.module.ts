import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeviceExportController } from './controllers/device-export.controller';
import { DeviceExportService } from './services/device-export.service';
import { ExportSessionService } from './services/export-session.service';
import { DeviceExportRepository } from './repositories/device-export.repository';
import { DeviceExport, DeviceExportSchema } from './schemas/device-export.schemas';
import { ExportSession, ExportSessionSchema } from './schemas/export-session.schemas';
import { ExportSessionRepository } from './repositories/export-session.repository';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeviceExport.name, schema: DeviceExportSchema },
      { name: ExportSession.name, schema: ExportSessionSchema }
    ]),
    DevicesModule
  ],
  controllers: [DeviceExportController],
  providers: [DeviceExportService, ExportSessionService, DeviceExportRepository, ExportSessionRepository],
  exports: [DeviceExportService, ExportSessionService, DeviceExportRepository, ExportSessionRepository]
})
export class DeviceExportModule { }

