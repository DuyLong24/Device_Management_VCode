import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DeviceRepository } from '../repositories/device.repository';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { Device, DeviceModel } from '../schemas/device.schemas';
import { InjectModel } from '@nestjs/mongoose';
import { ExcelService } from 'apps/main-service/src/common/excel/excel.service';
import { WarehouseTransition } from '../../warehouse-transitions/schemas/warehouse-transition.schemas';
import { DeviceHistory } from '../../device-histories/schemas/device-history.schemas';
import { Model } from 'mongoose';

import { DEVICE_EXCEL_COLUMNS } from '../constants/device.constants';
import { ERROR_MESSAGES } from 'apps/main-service/src/common/constants/messages.constants';

@Injectable()
export class DeviceService {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    @InjectModel(Device.name) private deviceModel: DeviceModel,
    private excelService: ExcelService,

    @InjectModel(WarehouseTransition.name) private transitionModel: Model<WarehouseTransition>,
    @InjectModel(DeviceHistory.name) private historyModel: Model<DeviceHistory>,
  ) { }

  async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
    return this.deviceRepository.create(createDeviceDto);
  }

  async insertMany(devices: CreateDeviceDto[], options: any = {}): Promise<Device[]> {
    return this.deviceRepository.insertMany(devices, options);
  }

  async findAll(filter: any = {}): Promise<Device[]> {
    return this.deviceRepository.findAll(filter);
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
}