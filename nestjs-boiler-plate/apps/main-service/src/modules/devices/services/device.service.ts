import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DeviceRepository } from '../repositories/device.repository';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';
import { ValidateSerialsDto, ValidateSerialsResponse, SerialValidationError } from '../dto/validate-serials.dto';
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
export class DeviceService {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    @InjectModel(Device.name) private deviceModel: DeviceModel,
    private excelService: ExcelService,

    @InjectModel(WarehouseTransition.name) private transitionModel: Model<WarehouseTransition>,
    @InjectModel(DeviceHistory.name) private historyModel: Model<DeviceHistory>,
    private readonly warehouseService: WarehouseService,
  ) { }

  async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
    return this.deviceRepository.create(createDeviceDto);
  }

  async insertMany(devices: CreateDeviceDto[], options: any = {}): Promise<Device[]> {
    return this.deviceRepository.insertMany(devices, options);
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

  async findBySerialWithDetail(serial: string): Promise<any> {
    const device = await this.deviceModel.findOne({ serial })
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
   */
  async transfer(
    deviceId: string,
    toWarehouseId: string,
    userId: string, // ID người thực hiện
    note?: string
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
    }

    const savedDevice = await device.save();

    // 4. Ghi lịch sử (Async)
    await this.historyModel.create({
      deviceId: device._id,
      fromWarehouseId: fromWarehouseId,
      toWarehouseId: toWarehouseId,
      actorId: userId,
      action: transition.transitionType || 'TRANSFER',
      note: note || 'Chuyển kho thủ công', // Có thể chuyển sang constant nếu cần, tạm giữ
      createdAt: new Date()
    });

    return savedDevice;
  }

  async bulkTransfer(
    deviceIds: string[],
    toWarehouseId: string,
    userId: string,
    note?: string
  ): Promise<{ success: string[]; errors: any[] }> {
    const results = { success: [], errors: [] };

    // Use Promise.all to process in parallel, but catch errors individually
    await Promise.all(deviceIds.map(async (id) => {
      try {
        await this.transfer(id, toWarehouseId, userId, note);
        results.success.push(id);
      } catch (error) {
        results.errors.push({ id, message: error.message });
      }
    }));

    return results;
  }

  async findBySerials(serials: string[]): Promise<Device[]> {
    if (!serials || serials.length === 0) return [];
    return this.deviceModel.find({ serial: { $in: serials } }).exec();
  }

  async bulkUpdateStatus(serials: string[], status: string, note?: string): Promise<any> {
    if (!serials || serials.length === 0) return;

    const result = await this.deviceModel.updateMany(
      { serial: { $in: serials } },
      {
        $set: { qcStatus: status }
      }
    ).exec();

    return result;
  }

  async validateSerials(dto: ValidateSerialsDto): Promise<ValidateSerialsResponse> {
    const { serials, deviceModel, warehouseCode } = dto;

    // Get warehouse by code using WarehouseService
    const warehouses = await this.warehouseService.findAll({ code: warehouseCode });
    const warehouse = warehouses[0];

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with code "${warehouseCode}" not found`);
    }

    const validSerials: string[] = [];
    const invalidSerials: string[] = [];
    const errors: SerialValidationError[] = [];

    // Check duplicates 
    const serialCounts = new Map<string, number>();
    serials.forEach(s => serialCounts.set(s, (serialCounts.get(s) || 0) + 1));

    for (const serial of serials) {
      // Check duplicate
      if (serialCounts.get(serial)! > 1) {
        if (!invalidSerials.includes(serial)) {
          invalidSerials.push(serial);
          errors.push({
            serial,
            reason: 'DUPLICATE',
            message: `Serial "${serial}" bị trùng lặp trong danh sách`
          });
        }
        continue;
      }

      // Find by serial
      const device = await this.deviceModel.findOne({ serial })
        .populate('warehouseId')
        .exec();

      if (!device) {
        invalidSerials.push(serial);
        errors.push({
          serial,
          reason: 'NOT_FOUND',
          message: `Serial "${serial}" không tồn tại trong hệ thống`
        });
        continue;
      }

      // Check device model
      if (device.deviceModel !== deviceModel) {
        invalidSerials.push(serial);
        errors.push({
          serial,
          reason: 'WRONG_MODEL',
          message: `Serial "${serial}" thuộc model "${device.deviceModel}", không phải "${deviceModel}"`,
          currentModel: device.deviceModel
        });
        continue;
      }

      // Check warehouse
      const currentWarehouse = device.warehouseId as any;
      if (currentWarehouse._id.toString() !== warehouse._id.toString()) {
        invalidSerials.push(serial);
        errors.push({
          serial,
          reason: 'WRONG_WAREHOUSE',
          message: `Serial "${serial}" đang ở kho "${currentWarehouse.name}", không phải "${warehouse.name}"`,
          currentWarehouse: currentWarehouse.name
        });
        continue;
      }

      // All checks passed
      validSerials.push(serial);
    }

    return {
      valid: invalidSerials.length === 0,
      validSerials,
      invalidSerials,
      errors
    };
  }
}
