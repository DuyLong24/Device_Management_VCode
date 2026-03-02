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
        errorReason?: string,
        defectReasonId?: string,
        originDeviceId?: string
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
            device.qcBy = userId as any;
        } else if (transition.transitionType === 'QC_FAIL') {
            device.qcStatus = 'FAIL';
            if (errorReason) device.qcNote = errorReason;
            device.qcBy = userId as any;
        }

        const toWarehouse = await this.warehouseService.findById(toWarehouseId);
        if (toWarehouse) {
            // Nghiệp vụ: Mọi máy lọt vào kho Sẵn sàng xuất BẮT BUỘC phải là hàng Đã qua QC
            if (toWarehouse.code === 'READY_TO_EXPORT') {
                device.qcStatus = 'PASS';
            }

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

            // --- QUẢN LÝ LỖI (Bật isDefective khi vào SERVICE_CENTER, UNDER_REPAIR, DEFECT) ---
            if (toWarehouse.code === 'SERVICE_CENTER' || toWarehouse.code === 'UNDER_REPAIR' || toWarehouse.code === 'DEFECT') {
                if (!device.isDefective) {
                    device.isDefective = true;
                }
                if (defectReasonId) {
                    device.defectReasonId = defectReasonId as any;
                }
            }

            // --- LOGIC KẾ THỪA KHI SWAP 1-1 ---
            if (transition.transitionType === 'WARRANTY_SWAP_EXPORT' && originDeviceId) {
                const originDevice = await this.deviceModel.findById(originDeviceId);
                if (!originDevice) {
                    throw new BadRequestException('Không tìm thấy thiết bị gốc (originDeviceId) để kế thừa bảo hành');
                }

                if (originDevice.replacedByDeviceId || originDevice.warrantyStatus === 'SWAPPED_BY_NEW_DEVICE') {
                    throw new BadRequestException('Thiết bị lỗi này đã được xuất đổi trả bằng một thiết bị khác. Không thể đổi trả lần 2!');
                }

                // 1. Kế thừa bảo hành từ máy A
                device.warrantyExpiredDate = originDevice.warrantyExpiredDate;

                // 2. Chéo link liên kết
                device.replacedForDeviceId = originDevice._id as any;
                device.warrantyStatus = 'SWAPPED_TO_CUSTOMER'; // Trạng thái của Máy B

                originDevice.replacedByDeviceId = device._id as any;
                originDevice.warrantyStatus = 'SWAPPED_BY_NEW_DEVICE'; // Trạng thái của Máy A
                await originDevice.save();
            }
        }

        const savedDevice = await device.save();

        const validActorId = userId || '000000000000000000000000';

        // 4. Ghi lịch sử (Async)
        await this.historyModel.create({
            deviceId: device._id,
            fromWarehouseId: fromWarehouseId,
            toWarehouseId: toWarehouseId,
            actorId: validActorId,
            defectReasonId: defectReasonId, // Snapshot lại nguyên nhân
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
        errorReason?: string,
        defectReasonId?: string,
        originDeviceId?: string
    ): Promise<{ success: string[]; errors: any[] }> {
        const results = { success: [], errors: [] };

        await Promise.all(deviceIds.map(async (id) => {
            try {
                await this.transfer(id, toWarehouseId, userId, note, errorReason, defectReasonId, originDeviceId);
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
                device.warrantyActivatedDate = new Date();

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
