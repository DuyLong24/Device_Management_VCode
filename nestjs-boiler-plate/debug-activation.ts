
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

    console.log('--- Checking Devices in NOT_ACTIVATED ---');

    const notActivatedCode = 'NOT_ACTIVATED';
    // 1. Find Warehouse ID for NOT_ACTIVATED
    // This helps debug if the lookup/unwind is failing
    const warehouses = await app.get('WarehouseModel').find({ code: notActivatedCode });
    console.log(`Warehouses with code ${notActivatedCode}:`, warehouses);

    if (warehouses.length === 0) {
        console.error('CRITICAL: Warehouse NOT_ACTIVATED not found!');
    }

    // 2. Run Aggregate
    const today = new Date();
    console.log('Comparing against Today (NOW):', today);

    const devices = await deviceModel.aggregate([
        {
            $lookup: {
                from: 'warehouses',
                localField: 'warehouseId',
                foreignField: '_id',
                as: 'warehouse'
            }
        },
        {
            $unwind: '$warehouse'
        },
        {
            $match: {
                'warehouse.code': notActivatedCode,
            }
        },
        {
            $project: {
                mac: 1,
                activationDate: 1,
                warehouseCode: '$warehouse.code'
            }
        }
    ]);

    console.log(`Found ${devices.length} devices in NOT_ACTIVATED.`);
    devices.forEach(d => {
        const isDue = d.activationDate ? new Date(d.activationDate) <= today : false;
        console.log(`- MAC: ${d.mac}, ActivationDate: ${d.activationDate}, Is Due? ${isDue ? 'YES' : 'NO'}`);
    });

    await app.close();
}

bootstrap();
