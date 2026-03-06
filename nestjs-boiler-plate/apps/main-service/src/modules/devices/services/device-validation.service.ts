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
        const { scannedCodes, scanMode, deviceModel, warehouseCode } = dto;

        const warehouses = await this.warehouseService.findAll({ code: warehouseCode });
        const warehouse = warehouses[0];

        if (!warehouse) {
            throw new NotFoundException(`Warehouse with code "${warehouseCode}" not found`);
        }

        const validMacs: string[] = [];
        const invalidMacs: string[] = [];
        const errors: MacValidationError[] = [];

        const codeCounts = new Map<string, number>();
        scannedCodes.forEach(s => codeCounts.set(s, (codeCounts.get(s) || 0) + 1));

        for (const code of scannedCodes) {
            if (codeCounts.get(code)! > 1) {
                if (!invalidMacs.includes(code)) {
                    invalidMacs.push(code);
                    errors.push({
                        mac: code,
                        reason: 'DUPLICATE',
                        message: `Mã "${code}" bị trùng lặp trong danh sách`
                    });
                }
                continue;
            }

            const searchField = scanMode === 'serial' ? 'serial' : 'mac';
            const device = await this.deviceModel.findOne({ [searchField]: code })
                .populate('warehouseId')
                .exec();

            if (!device) {
                invalidMacs.push(code);
                errors.push({
                    mac: code,
                    reason: 'NOT_FOUND',
                    message: `Mã "${code}" không tồn tại trong hệ thống`
                });
                continue;
            }

            if (device.deviceModel !== deviceModel) {
                invalidMacs.push(code);
                errors.push({
                    mac: code,
                    reason: 'WRONG_MODEL',
                    message: `Mã "${code}" thuộc model "${device.deviceModel}", không phải "${deviceModel}"`,
                    currentModel: device.deviceModel
                });
                continue;
            }

            const currentWarehouse = device.warehouseId as any;
            if (currentWarehouse._id.toString() !== warehouse._id.toString()) {
                invalidMacs.push(code);
                errors.push({
                    mac: code,
                    reason: 'WRONG_WAREHOUSE',
                    message: `Mã "${code}" đang ở kho "${currentWarehouse.name}", không phải "${warehouse.name}"`,
                    currentWarehouse: currentWarehouse.name
                });
                continue;
            }

            validMacs.push(code);
        }

        return {
            valid: invalidMacs.length === 0,
            validMacs,
            invalidMacs,
            errors
        };
    }
}
