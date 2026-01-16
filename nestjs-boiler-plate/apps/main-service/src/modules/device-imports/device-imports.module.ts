import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeviceImportController } from './controllers/device-import.controller';
import { DeviceImportService } from './services/device-import.service';
import { DeviceImportRepository } from './repositories/device-import.repository';
import { DeviceImport, DeviceImportSchema } from './schemas/device-import.schemas';
import { DevicesModule } from '../devices/devices.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DeviceImport.name, schema: DeviceImportSchema }]),
    DevicesModule,
    CategoriesModule,
  ],
  controllers: [DeviceImportController],
  providers: [DeviceImportService, DeviceImportRepository],
  exports: [DeviceImportService, DeviceImportRepository]
})
export class DeviceImportModule { }
