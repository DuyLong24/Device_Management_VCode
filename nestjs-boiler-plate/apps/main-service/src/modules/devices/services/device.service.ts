import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { DeviceRepository } from '../repositories/device.repository';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';
import { ValidateMacsDto, ValidateMacsResponse, MacValidationError } from '../dto/validate-serials.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { Device, DeviceModel } from '../schemas/device.schemas';
import { InjectModel } from '@nestjs/mongoose';
import { ExcelService } from 'apps/main-service/src/common/excel/excel.service';
import { WarehouseTransition } from '../../warehouse-transitions/schemas/warehouse-transition.schemas';
import { DeviceHistory } from '../../device-histories/schemas/device-history.schemas';
import { Model } from 'mongoose';

import { DEVICE_EXCEL_COLUMNS } from '../../../common/constants/device.constants';
import { ERROR_MESSAGES } from 'apps/main-service/src/common/constants/messages.constants';
import { WarehouseService } from '../../warehouses/services/warehouse.service';

@Injectable()
export class DeviceService implements OnModuleInit {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    @InjectModel(Device.name) private deviceModel: DeviceModel,
    private excelService: ExcelService,

    @InjectModel(WarehouseTransition.name) private transitionModel: Model<WarehouseTransition>,
    @InjectModel(DeviceHistory.name) private historyModel: Model<DeviceHistory>,
    private readonly warehouseService: WarehouseService,
  ) { }

  async onModuleInit() {
    try {
      // Drop legacy unique index on serial if it exists
      await this.deviceModel.collection.dropIndex('serial_1');
      console.log('Dropped legacy index: serial_1');
    } catch (error) {
      // Ignore error if index doesn't exist
      if (error.codeName !== 'IndexNotFound') {
        console.warn('Warning: Could not drop serial_1 index (it might not exist or verify manually)', error.message);
      }
    }
  }

  async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
    return this.deviceRepository.create(createDeviceDto);
  }

  async insertMany(devices: CreateDeviceDto[], options: any = {}): Promise<Device[]> {
    return this.deviceRepository.insertMany(devices, options);
  }

  async bulkWrite(ops: any[], options: any = {}): Promise<any> {
    return this.deviceRepository.bulkWrite(ops, options);
  }

  async findAll(filter: any = {}): Promise<Device[]> {
    return this.deviceModel.find(filter)
      .populate('warehouseId')
      .populate('currentExportId') // Populate to get exportDate, customer
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAllWithPagination(filter: any, options: any) {
    return this.deviceModel.paginate(filter, options);
  }

  async findById(id: string): Promise<Device> {
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundException(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }
    return device;
  }

  async update(id: string, updateDeviceDto: UpdateDeviceDto): Promise<Device> {
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundException(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }
    const updatedDevice = await this.deviceRepository.update(id, updateDeviceDto);
    if (!updatedDevice) {
      throw new BadRequestException(ERROR_MESSAGES.DEVICE.UPDATE_FAILED);
    }
    return updatedDevice;
  }

  async delete(id: string): Promise<Device> {
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundException(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }
    const deletedDevice = await this.deviceRepository.delete(id);
    if (!deletedDevice) {
      throw new BadRequestException(ERROR_MESSAGES.DEVICE.DELETE_FAILED);
    }
    return deletedDevice;
  }

  async findByMacWithDetail(mac: string): Promise<any> {
    const device = await this.deviceModel.findOne({ mac })
      .populate('warehouseId')
      //.populate('importId') 
      .populate({
        path: 'importId',
        populate: { path: 'createdBy', select: 'fullName' }
      })
      .populate('currentExportId')
      .populate('qcBy', 'fullName')
      .exec();

    if (!device) {
      throw new NotFoundException(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }

    const history = await this.historyModel.find({ deviceId: device._id })
      .populate('fromWarehouseId', 'name color')
      .populate('toWarehouseId', 'name color')
      .populate('actorId', 'name')
      .sort({ createdAt: 1 })
      .exec();

    return {
      device,
      history
    };
  }

  async exportExcel(filter: any): Promise<Buffer> {
    // 1. Lấy dữ liệu (Populate kho để lấy tên)
    const devices = await this.deviceModel
      .find(filter)
      .populate('warehouseId', 'name')
      .sort({ createdAt: -1 })
      .exec();

    // 2. Sử dụng Config Cột từ Constants
    return this.excelService.exportTableData(devices, DEVICE_EXCEL_COLUMNS, 'Danh sách thiết bị');
  }

  /**
   * [CORE LOGIC] Chuyển kho theo quy trình Config-driven
   * 1. Check tồn tại
   * 2. Check rule transition
   * 3. Update Device
   * 4. Write History
   * 4. Write History
   */
  async transfer(
    deviceId: string,
    toWarehouseId: string,
    userId: string, // ID người thực hiện
    note?: string,
    errorReason?: string // Added
  ): Promise<Device> {
    // 1. Lấy thông tin thiết bị
    const device = await this.deviceModel.findById(deviceId);
    if (!device) {
      throw new NotFoundException(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }

    const fromWarehouseId = device.warehouseId.toString(); // Lấy ID kho hiện tại

    // Nếu chuyển đến chính kho hiện tại thì bỏ qua
    if (fromWarehouseId === toWarehouseId) {
      return device;
    }

    // 2. Validate Rule Transition
    // Tìm rule cho phép đi từ A -> B
    const transition = await this.transitionModel.findOne({
      fromWarehouseId: fromWarehouseId,
      toWarehouseId: toWarehouseId,
      isActive: true
    }).exec();

    // Nếu không có rule -> Chặn ngay lập tức
    if (!transition) {
      const msg = ERROR_MESSAGES.DEVICE.TRANSFER_RULE_NOT_FOUND
        .replace('{from}', fromWarehouseId)
        .replace('{to}', toWarehouseId);
      throw new BadRequestException(msg);
    }

    // TODO: Check role user có nằm trong transition.allowedRoles không 

    // 3. Thực hiện chuyển kho
    device.warehouseId = toWarehouseId as any;
    device.warehouseUpdatedAt = new Date();
    device.warehouseUpdatedBy = userId;

    // đổi trạng thái QC (Ví dụ từ PENDING -> PASS)
    if (transition.transitionType === 'QC_PASS') {
      device.qcStatus = 'PASS';
    } else if (transition.transitionType === 'QC_FAIL') {
      device.qcStatus = 'FAIL';
      if (errorReason) device.qcNote = errorReason;
    }

    // Check target Warehouse for REMOVED logic
    // This requires fetching the warehouse, but strictly speaking we can infer from transition potentially,
    // OR we can just fetch it. To save perf, we might assume frontend sends right data,
    // but better to check backend side or just save errorReason to qcNote/removeReason based on logic.
    // For now, if errorReason is passed, we save it.
    // However, user specifically asked for "reason" when moving to DEFECT or REMOVED.

    // We should probably check the warehouse code.
    const toWarehouse = await this.warehouseService.findById(toWarehouseId);
    if (toWarehouse) {
      if (toWarehouse.code === 'REMOVED') {
        device.removeReason = errorReason;
        device.removeDate = new Date();
      }
      // If DEFECT (assumed code 'DEFECT' based on user prompt), we put in qcNote
      if (toWarehouse.code === 'DEFECT' || transition.transitionType === 'QC_FAIL') {
        device.qcNote = errorReason;
      }
    }

    // Always save note if standard (optional)
    // But errorReason is special.

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
    errorReason?: string // Added
  ): Promise<{ success: string[]; errors: any[] }> {
    const results = { success: [], errors: [] };

    // Use Promise.all to process in parallel, but catch errors individually
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

  async findByMacs(macs: string[]): Promise<Device[]> {
    if (!macs || macs.length === 0) return [];
    return this.deviceModel.find({ mac: { $in: macs } }).exec();
  }

  async findByMac(mac: string): Promise<Device | null> {
    return this.deviceModel.findOne({ mac }).exec();
  }

  async moveToSoldWarehouse(
    macs: string[],
    exportCode: string
  ): Promise<any> {
    try {
      if (!macs || macs.length === 0) return;
      console.log(`[moveToSoldWarehouse] START: Processing ${macs.length} macs. ExportCode: ${exportCode}`);

      // 1. tìm SOLD Warehouse
      const warehouses = await this.warehouseService.findAll({ code: 'SOLD' });
      console.log(`[moveToSoldWarehouse] Warehouses found (code=SOLD): ${warehouses.length}`);
      const soldWarehouse = warehouses[0];
      if (!soldWarehouse) {
        throw new BadRequestException('Không tìm thấy kho "Đã xuất - trong bảo hành" (Code: SOLD)');
      }

      const devices = await this.deviceModel.find({ mac: { $in: macs } });

      // 2. Process updates
      for (const device of devices) {
        const fromWarehouseId = device.warehouseId;

        if (fromWarehouseId && fromWarehouseId.toString() === soldWarehouse._id.toString()) {
          continue;
        }

        // Update Device
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

  async bulkUpdateStatus(macs: string[], status: string, note?: string, customer?: string): Promise<any> {
    if (!macs || macs.length === 0) return;

    const updatePayload: any = {
      qcStatus: status
    };

    if (customer) {
      // updatePayload.customer = customer; // Assuming device has customer field?
    }

    const result = await this.deviceModel.updateMany(
      { mac: { $in: macs } },
      {
        $set: updatePayload
      }
    ).exec();

    return result;
  }

  async validateMacs(dto: ValidateMacsDto): Promise<ValidateMacsResponse> {
    const { macs, deviceModel, warehouseCode } = dto;

    // tìm kho với code kho
    const warehouses = await this.warehouseService.findAll({ code: warehouseCode });
    const warehouse = warehouses[0];

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with code "${warehouseCode}" not found`);
    }

    const validMacs: string[] = [];
    const invalidMacs: string[] = [];
    const errors: MacValidationError[] = [];

    // Check duplicates 
    const macCounts = new Map<string, number>();
    macs.forEach(s => macCounts.set(s, (macCounts.get(s) || 0) + 1));

    for (const mac of macs) {
      // Check duplicate
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

      // Tìm = mac
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

      // Check device model
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

      // Check warehouse
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

      // All checks passed
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
