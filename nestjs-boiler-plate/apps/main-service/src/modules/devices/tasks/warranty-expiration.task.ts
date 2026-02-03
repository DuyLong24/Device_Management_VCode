import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeviceService } from '../services/device.service';

@Injectable()
export class WarrantyExpirationTask {
    private readonly logger = new Logger(WarrantyExpirationTask.name);

    constructor(private readonly deviceService: DeviceService) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleWarrantyExpiration() {
        this.logger.log('Running Warranty Expiration Check Task...');
        try {
            const result = await this.deviceService.processWarrantyExpirationCheck();
            this.logger.log(`Warranty Expiration Task Completed. Processed: ${result.processedCount}`);
        } catch (error) {
            this.logger.error('Failed to run Warranty Expiration Task', error);
        }
    }
}
