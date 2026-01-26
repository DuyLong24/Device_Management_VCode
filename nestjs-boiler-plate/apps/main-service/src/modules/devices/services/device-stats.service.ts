import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Device, DeviceModel } from '../schemas/device.schemas';
import { WarehouseService } from '../../warehouses/services/warehouse.service';

@Injectable()
export class DeviceStatsService {
    constructor(
        @InjectModel(Device.name) private deviceModel: DeviceModel,
        private readonly warehouseService: WarehouseService,
    ) { }

    async countReadyToExport(model: string): Promise<number> {
        const readyWh = await this.warehouseService.findAll({ code: 'READY_TO_EXPORT' });
        if (!readyWh || readyWh.length === 0) {
            return 0;
        }
        const warehouseId = readyWh[0]._id;
        return this.deviceModel.countDocuments({
            deviceModel: model,
            warehouseId: warehouseId
        });
    }

    async getStatistics(filter: any = {}): Promise<any> {
        const aggFilter = { ...filter };
        if (aggFilter.categoryId && typeof aggFilter.categoryId === 'string') {
            aggFilter.categoryId = new Types.ObjectId(aggFilter.categoryId);
        }
        if (aggFilter.warehouseId && typeof aggFilter.warehouseId === 'string') {
            aggFilter.warehouseId = new Types.ObjectId(aggFilter.warehouseId);
        }

        // 1. Lấy danh sách kho
        const warehouses = await this.warehouseService.findAll();
        const whMap = new Map<string, string>(); // Id -> Code
        warehouses.forEach((w: any) => whMap.set(w._id.toString(), w.code));

        // 2. Tính tổng
        const aggregate = await this.deviceModel.aggregate([
            { $match: aggFilter },
            {
                $group: {
                    _id: '$warehouseId',
                    count: { $sum: 1 }
                }
            }
        ]);

        const stats = {
            total: 0,
            PENDING_QC: 0,
            READY_TO_EXPORT: 0,
            DEFECT: 0,
            IN_WARRANTY: 0,
            SOLD: 0,
            REMOVED: 0
        };

        aggregate.forEach((item) => {
            stats.total += item.count;
            const whId = item._id ? item._id.toString() : 'UNKNOWN';
            const code = whMap.get(whId);

            if (code === 'PENDING_QC') stats.PENDING_QC += item.count;
            else if (code === 'READY_TO_EXPORT') stats.READY_TO_EXPORT += item.count;
            else if (code === 'DEFECT') stats.DEFECT += item.count;
            else if (code === 'IN_WARRANTY' || code === 'WARRANTY') stats.IN_WARRANTY += item.count;
            else if (code === 'SOLD') stats.SOLD += item.count;
            else if (code === 'REMOVED') stats.REMOVED += item.count;
        });

        return stats;
    }
}
