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
import { Model, Types } from 'mongoose';

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
      // Xóa index cũ trên serial nếu nó tồn tại
      await this.deviceModel.collection.dropIndex('serial_1');
      console.log('Đã xóa index cũ: serial_1');
    } catch (error) {
      // Bỏ qua lỗi nếu index không tồn tại
      if (error.codeName !== 'IndexNotFound') {
        console.warn('Cảnh báo: Không thể xóa index serial_1 (nó có thể không tồn tại hoặc cần kiểm tra thủ công)', error.message);
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
      .populate('currentExportId')
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



  async findByMacs(macs: string[]): Promise<Device[]> {
    if (!macs || macs.length === 0) return [];
    return this.deviceModel.find({ mac: { $in: macs } }).exec();
  }

  async findByMac(mac: string): Promise<Device | null> {
    return this.deviceModel.findOne({ mac }).exec();
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

  async moveToSoldWarehouse(macs: string[], exportCode: string): Promise<void> {
    const soldWarehouse = await this.warehouseService.findByCode('SOLD');
    if (!soldWarehouse) {
      throw new BadRequestException(ERROR_MESSAGES.WAREHOUSE.NOT_FOUND);
    }

    await this.deviceModel.updateMany(
      { mac: { $in: macs } },
      {
        $set: {
          warehouseId: soldWarehouse._id,
          warehouseUpdatedAt: new Date(),
          warehouseUpdatedBy: 'SYSTEM_EXPORT',
          // Optionally add export info to history or notes?
        }
      }
    ).exec();
  }

  async countReadyToExport(model: string): Promise<number> {
    const readyWarehouse = await this.warehouseService.findByCode('READY_TO_EXPORT');
    if (!readyWarehouse) return 0;

    return this.deviceModel.countDocuments({
      deviceModel: model,
      warehouseId: readyWarehouse._id,
      qcStatus: 'PASS' // Ensure only QC Passed items are counted
    }).exec();
  }
}
