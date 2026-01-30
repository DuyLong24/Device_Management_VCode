import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeviceService } from '../services/device.service';
import { WarehouseCode } from '../../../common/constants/warehouse.constant';

@Injectable()
export class WarrantyActivationTask {
    private readonly logger = new Logger(WarrantyActivationTask.name);

    constructor(private readonly deviceService: DeviceService) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleWarrantyActivation() {
        this.logger.log('Running Delayed Warranty Activation Task...');
        try {
            const result = await this.deviceService.processWarrantyActivation();
            this.logger.log(`Warranty Activation Task Completed. Processed: ${result.processedCount}`);
        } catch (error) {
            this.logger.error('Failed to run Warranty Activation Task', error);
        }
    }
}
