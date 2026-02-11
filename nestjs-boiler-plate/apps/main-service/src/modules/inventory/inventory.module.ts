import { Module } from '@nestjs/common';
import { StockController } from './controllers/stock.controller';
import { DevicesModule } from '../devices/devices.module';
import { DeviceExportModule } from '../device-exports/device-exports.module';

@Module({
    imports: [
        DevicesModule,
        DeviceExportModule,
    ],
    controllers: [StockController],
    providers: [],
})
export class InventoryModule { }
