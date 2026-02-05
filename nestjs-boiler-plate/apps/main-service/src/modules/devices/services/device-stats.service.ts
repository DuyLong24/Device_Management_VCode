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

        // 2. Aggregate Stats Tổng (Theo trạng thái kho)
        const stats = {
            total: 0,
            PENDING_QC: 0,
            READY_TO_EXPORT: 0,
            DEFECT: 0,
            IN_WARRANTY: 0,
            SOLD: 0,
            REMOVED: 0,
            categoryBreakdown: [] as any[]
        };

        const statusAggregate = await this.deviceModel.aggregate([
            { $match: aggFilter },
            {
                $group: {
                    _id: '$warehouseId',
                    count: { $sum: 1 }
                }
            }
        ]);

        statusAggregate.forEach((item) => {
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

        // 3. Aggregate Stats theo Category (Loại sản phẩm)
        // Group by { categoryId, warehouseId }
        const categoryAggregate = await this.deviceModel.aggregate([
            { $match: aggFilter },
            {
                $group: {
                    _id: {
                        category: '$categoryId',
                        warehouse: '$warehouseId'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'categories', // Collection name
                    localField: '_id.category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            {
                $unwind: {
                    path: '$categoryInfo',
                    preserveNullAndEmptyArrays: true
                }
            }
        ]);

        // Transform category aggregation
        const catMap = new Map<string, any>();

        categoryAggregate.forEach(item => {
            const catId = item._id.category ? item._id.category.toString() : 'UNKNOWN_CAT';
            const catName = item.categoryInfo ? item.categoryInfo.name : 'Chưa phân loại';
            const whId = item._id.warehouse ? item._id.warehouse.toString() : 'UNKNOWN_WH';
            const whCode = whMap.get(whId);

            if (!catMap.has(catId)) {
                catMap.set(catId, {
                    key: catId,
                    productType: catName,
                    totalPurchased: 0, // Tổng count tất cả các kho
                    pending: 0,
                    imported: 0, // READY_TO_EXPORT
                    exported: 0, // SOLD
                    defect: 0,
                    defectRate: 0
                });
            }

            const current = catMap.get(catId);
            current.totalPurchased += item.count;

            if (whCode === 'PENDING_QC') current.pending += item.count;
            else if (whCode === 'READY_TO_EXPORT') current.imported += item.count;
            else if (whCode === 'SOLD' || whCode === 'REMOVED') current.exported += item.count;
            else if (whCode === 'DEFECT') current.defect += item.count;
        });

        // Calculate Rates
        catMap.forEach(v => {
            if (v.totalPurchased > 0) {
                v.defectRate = parseFloat(((v.defect / v.totalPurchased) * 100).toFixed(2));
            }
        });

        stats.categoryBreakdown = Array.from(catMap.values());

        return stats;
    }
}
