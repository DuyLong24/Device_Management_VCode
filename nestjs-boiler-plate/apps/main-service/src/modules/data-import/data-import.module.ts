import { Module } from '@nestjs/common';
import { DataImportController } from './controllers/data-import.controller';
import { DataImportService } from './services/data-import.service';
import { DevicesModule } from '../devices/devices.module';
import { DeviceImportStrategy } from './strategies/device.import-strategy';
import { ImportTicketStrategy } from './strategies/import-ticket.strategy';
import { SharedDataModule } from '../shared-data/shared-data.module';

@Module({
    imports: [DevicesModule, SharedDataModule],
    controllers: [DataImportController],
    providers: [DataImportService, DeviceImportStrategy, ImportTicketStrategy],
    exports: [DataImportService],
})
export class DataImportModule { }
