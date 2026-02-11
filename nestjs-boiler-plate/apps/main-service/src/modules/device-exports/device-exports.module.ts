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
import { WarehousesModule } from '../warehouses/warehouses.module';
import { UsersModule } from '../../users/users.module';
import { MailModule } from '../../common/mail/mail.module';
import { ExportNotificationTask } from './tasks/export-notification.task';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExcelModule } from '../../common/excel/excel.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeviceExport.name, schema: DeviceExportSchema },
      { name: ExportSession.name, schema: ExportSessionSchema }
    ]),
    DevicesModule,
    WarehousesModule,
    UsersModule,
    MailModule,
    NotificationsModule,
    ExcelModule
  ],
  controllers: [DeviceExportController],
  providers: [DeviceExportService, ExportSessionService, DeviceExportRepository, ExportSessionRepository, ExportNotificationTask],
  exports: [DeviceExportService, ExportSessionService, DeviceExportRepository, ExportSessionRepository]
})
export class DeviceExportModule { }

