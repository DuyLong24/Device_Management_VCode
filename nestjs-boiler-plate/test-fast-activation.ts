import 'tsconfig-paths/register';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './apps/main-service/src/app.module';
import { DeviceService } from './apps/main-service/src/modules/devices/services/device.service';
import { getModelToken } from '@nestjs/mongoose';
import { Device } from './apps/main-service/src/modules/devices/schemas/device.schemas';
import { Warehouse } from './apps/main-service/src/modules/warehouses/schemas/warehouse.schemas';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const deviceService = app.get(DeviceService);
    const deviceModel = app.get(getModelToken(Device.name));

    console.log('--- 🚀 STARTING INSTANT WARRANTY TEST ---');

    // 1. Find devices currently in NOT_ACTIVATED
    const notActivatedCode = 'NOT_ACTIVATED';
    const warehouseModel = app.get(getModelToken(Warehouse.name));
    const wh = await warehouseModel.findOne({ code: notActivatedCode });

    if (!wh) {
        console.error('❌ Warehouse NOT_ACTIVATED not found!');
        await app.close();
        return;
    }

    const pendingDevices = await deviceModel.find({ warehouseId: wh._id });
    console.log(`🔍 Found ${pendingDevices.length} devices in NOT_ACTIVATED warehouse.`);

    if (pendingDevices.length > 0) {
        console.log('⏳ Updating activationDate to PAST (5 minutes ago)...');

        await deviceModel.updateMany(
            { warehouseId: wh._id },
            { $set: { activationDate: new Date(Date.now() - 5 * 60000) } }
        );
        console.log('✅ Activation dates updated.');
    } else {
        console.log('⚠️ No devices to test. Please Export some devices with activationDays > 0 first.');
    }

    // 2. Run the Activation Task
    console.log('▶️ Running processWarrantyActivation()...');
    const result = await deviceService.processWarrantyActivation();

    console.log(`🎉 Task Completed. Processed: ${result.processedCount} devices.`);
    console.log('--- TEST FINISHED ---');

    await app.close();
}

bootstrap();
