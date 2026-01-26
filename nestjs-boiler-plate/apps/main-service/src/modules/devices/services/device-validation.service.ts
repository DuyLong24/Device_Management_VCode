import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Device, DeviceModel } from '../schemas/device.schemas';
import { WarehouseService } from '../../warehouses/services/warehouse.service';
import { ValidateMacsDto, ValidateMacsResponse, MacValidationError } from '../dto/validate-serials.dto';

@Injectable()
export class DeviceValidationService {
    constructor(
        @InjectModel(Device.name) private deviceModel: DeviceModel,
        private readonly warehouseService: WarehouseService,
    ) { }

    async validateMacs(dto: ValidateMacsDto): Promise<ValidateMacsResponse> {
        const { macs, deviceModel, warehouseCode } = dto;

        const warehouses = await this.warehouseService.findAll({ code: warehouseCode });
        const warehouse = warehouses[0];

        if (!warehouse) {
            throw new NotFoundException(`Warehouse with code "${warehouseCode}" not found`);
        }

        const validMacs: string[] = [];
        const invalidMacs: string[] = [];
        const errors: MacValidationError[] = [];

        const macCounts = new Map<string, number>();
        macs.forEach(s => macCounts.set(s, (macCounts.get(s) || 0) + 1));

        for (const mac of macs) {
            if (macCounts.get(mac)! > 1) {
                if (!invalidMacs.includes(mac)) {
                    invalidMacs.push(mac);
                    errors.push({
                        mac,
                        reason: 'DUPLICATE',
                        message: `MAC "${mac}" bị trùng lặp trong danh sách`
                    });
                }
                continue;
            }

            const device = await this.deviceModel.findOne({ mac })
                .populate('warehouseId')
                .exec();

            if (!device) {
                invalidMacs.push(mac);
                errors.push({
                    mac,
                    reason: 'NOT_FOUND',
                    message: `MAC "${mac}" không tồn tại trong hệ thống`
                });
                continue;
            }

            if (device.deviceModel !== deviceModel) {
                invalidMacs.push(mac);
                errors.push({
                    mac,
                    reason: 'WRONG_MODEL',
                    message: `MAC "${mac}" thuộc model "${device.deviceModel}", không phải "${deviceModel}"`,
                    currentModel: device.deviceModel
                });
                continue;
            }

            const currentWarehouse = device.warehouseId as any;
            if (currentWarehouse._id.toString() !== warehouse._id.toString()) {
                invalidMacs.push(mac);
                errors.push({
                    mac,
                    reason: 'WRONG_WAREHOUSE',
                    message: `MAC "${mac}" đang ở kho "${currentWarehouse.name}", không phải "${warehouse.name}"`,
                    currentWarehouse: currentWarehouse.name
                });
                continue;
            }

            validMacs.push(mac);
        }

        return {
            valid: invalidMacs.length === 0,
            validMacs,
            invalidMacs,
            errors
        };
    }
}
