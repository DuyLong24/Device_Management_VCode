import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Device, DeviceModel } from '../schemas/device.schemas';
import { WarehouseTransition } from '../../warehouse-transitions/schemas/warehouse-transition.schemas';
import { DeviceHistory } from '../../device-histories/schemas/device-history.schemas';
import { WarehouseService } from '../../warehouses/services/warehouse.service';
import { ERROR_MESSAGES } from 'apps/main-service/src/common/constants/messages.constants';

@Injectable()
export class DeviceTransferService {
    constructor(
        @InjectModel(Device.name) private deviceModel: DeviceModel,
        @InjectModel(WarehouseTransition.name) private transitionModel: Model<WarehouseTransition>,
        @InjectModel(DeviceHistory.name) private historyModel: Model<DeviceHistory>,
        private readonly warehouseService: WarehouseService,
    ) { }

    // Chuyển kho theo quy trình Config-driven
    async transfer(
        deviceId: string,
        toWarehouseId: string,
        userId: string,
        note?: string,
        errorReason?: string
    ): Promise<Device> {
        // 1. Lấy thông tin thiết bị
        const device = await this.deviceModel.findById(deviceId);
        if (!device) {
            throw new NotFoundException(ERROR_MESSAGES.DEVICE.NOT_FOUND);
        }

        const fromWarehouseId = device.warehouseId.toString();

        // Nếu chuyển đến chính kho hiện tại thì bỏ qua
        if (fromWarehouseId === toWarehouseId) {
            return device;
        }

        // 2. Validate Rule Transition
        const transition = await this.transitionModel.findOne({
            fromWarehouseId: fromWarehouseId,
            toWarehouseId: toWarehouseId,
            isActive: true
        }).exec();

        if (!transition) {
            const msg = ERROR_MESSAGES.DEVICE.TRANSFER_RULE_NOT_FOUND
                .replace('{from}', fromWarehouseId)
                .replace('{to}', toWarehouseId);
            throw new BadRequestException(msg);
        }

        // 3. Thực hiện chuyển kho
        device.warehouseId = toWarehouseId as any;
        device.warehouseUpdatedAt = new Date();
        device.warehouseUpdatedBy = userId;

        if (transition.transitionType === 'QC_PASS') {
            device.qcStatus = 'PASS';
        } else if (transition.transitionType === 'QC_FAIL') {
            device.qcStatus = 'FAIL';
            if (errorReason) device.qcNote = errorReason;
        }

        const toWarehouse = await this.warehouseService.findById(toWarehouseId);
        if (toWarehouse) {
            if (toWarehouse.code === 'REMOVED') {
                device.removeReason = errorReason;
                device.removeDate = new Date();
            }
            if (toWarehouse.code === 'DEFECT' || transition.transitionType === 'QC_FAIL') {
                device.qcNote = errorReason;
            }
            if (toWarehouse.code === 'UNDER_REPAIR') {
                device.repairNote = errorReason;
            }
        }

        const savedDevice = await device.save();

        // 4. Ghi lịch sử (Async)
        await this.historyModel.create({
            deviceId: device._id,
            fromWarehouseId: fromWarehouseId,
            toWarehouseId: toWarehouseId,
            actorId: userId,
            action: transition.transitionType || 'TRANSFER',
            note: note || (errorReason ? `Lỗi: ${errorReason}` : 'Chuyển kho thủ công'),
            createdAt: new Date()
        });

        return savedDevice;
    }

    async bulkTransfer(
        deviceIds: string[],
        toWarehouseId: string,
        userId: string,
        note?: string,
        errorReason?: string
    ): Promise<{ success: string[]; errors: any[] }> {
        const results = { success: [], errors: [] };

        await Promise.all(deviceIds.map(async (id) => {
            try {
                await this.transfer(id, toWarehouseId, userId, note, errorReason);
                results.success.push(id);
            } catch (error) {
                results.errors.push({ id, message: error.message });
            }
        }));

        return results;
    }

    async moveToSoldWarehouse(
        macs: string[],
        exportCode: string
    ): Promise<any> {
        try {
            if (!macs || macs.length === 0) return;
            console.log(`[moveToSoldWarehouse] START: Processing ${macs.length} macs. ExportCode: ${exportCode}`);

            const warehouses = await this.warehouseService.findAll({ code: 'SOLD' });
            const soldWarehouse = warehouses[0];
            if (!soldWarehouse) {
                throw new BadRequestException('Không tìm thấy kho "Đã xuất - trong bảo hành" (Code: SOLD)');
            }

            const devices = await this.deviceModel.find({ mac: { $in: macs } });

            for (const device of devices) {
                const fromWarehouseId = device.warehouseId;

                if (fromWarehouseId && fromWarehouseId.toString() === soldWarehouse._id.toString()) {
                    continue;
                }

                device.warehouseId = soldWarehouse._id as any;
                device.warehouseUpdatedAt = new Date();

                if (device.qcStatus === 'SOLD') {
                    device.qcStatus = 'PASS';
                }

                await device.save();
            }

            return { success: true, count: devices.length };
        } catch (error) {
            console.error('[moveToSoldWarehouse] CRITICAL ERROR:', error);
            throw error;
        }
    }
}
