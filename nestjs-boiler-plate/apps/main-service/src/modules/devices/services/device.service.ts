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
import { SharedDataService } from '../../shared-data/services/shared-data.service';

import { AppLogger } from '../../../common/utils/logger.util';

@Injectable()
export class DeviceService implements OnModuleInit {
  private readonly logger = new AppLogger(DeviceService.name);
  constructor(
    private readonly deviceRepository: DeviceRepository,
    @InjectModel(Device.name) private deviceModel: DeviceModel,
    private excelService: ExcelService,

    @InjectModel(WarehouseTransition.name) private transitionModel: Model<WarehouseTransition>,
    @InjectModel(DeviceHistory.name) private historyModel: Model<DeviceHistory>,
    private readonly warehouseService: WarehouseService,
    private readonly sharedDataService: SharedDataService,
  ) { }

  async onModuleInit() {
    try {
      // Xóa index cũ trên serial nếu nó tồn tại
      await this.deviceModel.collection.dropIndex('serial_1');
      this.logger.log('Đã xóa index cũ: serial_1');
    } catch (error) {
      // Bỏ qua lỗi nếu index không tồn tại
      if (error.codeName !== 'IndexNotFound') {
        this.logger.warn('Cảnh báo: Không thể xóa index serial_1 (nó có thể không tồn tại hoặc cần kiểm tra thủ công)', error.message);
      }
    }
  }

  async getImportTemplate(): Promise<Buffer> {
    // 1. Lấy danh sách Model từ SharedData
    let modelsData: any[] = [];
    try {
      modelsData = await this.sharedDataService.getDataByGroupCode('MODEL');
    } catch (error) {
      this.logger.warn('Failed to fetch MODEL from SharedData, falling back to existing devices.', error);
    }

    let data: any[] = [];

    if (modelsData && modelsData.length > 0) {
      // Lấy từ SharedData
      data = modelsData.map(m => ({
        deviceCode: m.code,
        mac: '',
        name: m.name || '',
        p2p: '',
        serial: '',
        quantity: '',
        boxCount: '',
        itemsPerBox: ''
      }));
    } else {

      const uniqueModels = await this.deviceModel.distinct('deviceModel').exec();
      data = uniqueModels.sort().map(m => ({
        deviceCode: m,
        mac: '',
        name: '',
        p2p: '',
        serial: '',
        quantity: '',
        boxCount: '',
        itemsPerBox: ''
      }));
    }

    // Cấu hình cột cho Template
    const columns = [
      { header: 'deviceCode', key: 'deviceCode', width: 30 },
      { header: 'mac', key: 'mac', width: 20 },
      { header: 'name', key: 'name', width: 25 },
      { header: 'p2p', key: 'p2p', width: 20 },
      { header: 'serial', key: 'serial', width: 20 },
    ];

    return this.excelService.exportTableData(data, columns, 'Import Template');
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
      .populate({
        path: 'warehouseId',
        select: 'name code color icon'
      })
      .populate({
        path: 'currentExportId',
        select: 'code type exportDate'
      })
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
        select: 'code importDate supplier notes createdBy',
        populate: { path: 'createdBy', select: 'name' }
      })
      .populate({
        path: 'currentExportId',
        select: 'code type exportReason exportDate receiver receiverPerson project customer notes createdBy',
        populate: { path: 'createdBy', select: 'name' }
      })
      .populate('qcBy', 'name')
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

  async moveDevicesToWarehouse(macs: string[], targetWarehouseCode: string, exportCode: string, userId?: string, activationDate?: Date, exportId?: string, warrantyMonths?: number): Promise<void> {

    const targetWarehouse = await this.warehouseService.findByCode(targetWarehouseCode);

    if (!targetWarehouse) {
      throw new BadRequestException(`Kho đích "${targetWarehouseCode}" không tồn tại`);
    }

    // Lấy danh sách thiết bị cần di chuyển để tạo lịch sử sau khi cập nhật
    const devicesToMove = await this.deviceModel.find({
      mac: { $in: macs }
    }).exec();


    const updatePayload: any = {
      warehouseId: targetWarehouse._id,
      warehouseUpdatedAt: new Date(),
      warehouseUpdatedBy: 'SYSTEM_EXPORT',
      exportDate: new Date()
    };

    if (exportId) {
      updatePayload.currentExportId = exportId;
    }

    if (activationDate) {
      updatePayload.activationDate = activationDate;
    }

    if (targetWarehouse.code === 'SOLD') {
      const activatedDate = activationDate || new Date();
      updatePayload.warrantyActivatedDate = activatedDate;

      if (warrantyMonths && warrantyMonths > 0) {
        updatePayload.warrantyMonths = warrantyMonths;
        const expiredDate = new Date(activatedDate);
        expiredDate.setMonth(expiredDate.getMonth() + warrantyMonths);
        updatePayload.warrantyExpiredDate = expiredDate;
      }
    }

    const result = await this.deviceModel.updateMany(
      { mac: { $in: macs } },
      {
        $set: updatePayload
      }
    ).exec();

    this.logger.debug(`[DEBUG] UpdateMany result:`, {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged
    });

    // Tạo lịch sử
    if (devicesToMove.length > 0) {
      let actorId = userId;
      if (!actorId || !/^[0-9a-fA-F]{24}$/.test(actorId)) {
        actorId = '000000000000000000000000';
      }

      const historyRecords = devicesToMove.map(device => ({
        deviceId: device._id,
        fromWarehouseId: device.warehouseId,
        toWarehouseId: targetWarehouse._id,
        actorId: actorId,
        action: 'EXPORT',
        note: `Xuất kho: ${exportCode}`
      }));

      await this.historyModel.insertMany(historyRecords);
      this.logger.debug(`[DEBUG] Created ${historyRecords.length} device history records with actorId: ${actorId}`);
    }
  }

  async countReadyToExport(model: string): Promise<number> {
    const readyWarehouse = await this.warehouseService.findByCode('READY_TO_EXPORT');
    if (!readyWarehouse) return 0;

    return this.deviceModel.countDocuments({
      deviceModel: model,
      warehouseId: readyWarehouse._id,
      qcStatus: 'PASS'
    }).exec();
  }



  async processWarrantyActivation(): Promise<{ processedCount: number }> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Tìm các thiết bị trong kho NOT_ACTIVATED với activationDate <= today
    const notActivatedCode = 'NOT_ACTIVATED';
    const devicesToActivate = await this.deviceModel.aggregate([
      {
        $lookup: {
          from: 'warehouses',
          localField: 'warehouseId',
          foreignField: '_id',
          as: 'warehouse'
        }
      },
      {
        $unwind: '$warehouse'
      },
      {
        $match: {
          'warehouse.code': notActivatedCode,
          activationDate: { $lte: today }
        }
      },
      {
        $project: {
          mac: 1
        }
      }
    ]);

    if (devicesToActivate.length === 0) {
      return { processedCount: 0 };
    }

    const macs = devicesToActivate.map(d => d.mac);
    this.logger.warn(`Found ${macs.length} devices to activate warranty: ${macs.join(', ')}`);

    // Chuyển tới kho Đang bảo hành
    await this.moveDevicesToWarehouse(macs, 'SOLD', 'AUTO-WARRANTY-ACTIVATION', 'SYSTEM');

    return { processedCount: macs.length };
  }

  async processWarrantyExpirationCheck(): Promise<{ processedCount: number }> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // 1. Tìm các thiết bị trong kho SOLD (Đang bảo hành) mà đã đễn ngày hết hạn
    const soldWarehouse = await this.warehouseService.findByCode('SOLD');
    if (!soldWarehouse) {
      this.logger.warn('Kho SOLD không tồn tại, bỏ qua kiểm tra hết hạn bảo hành.');
      return { processedCount: 0 };
    }

    const devicesToExpire = await this.deviceModel.find({
      warehouseId: soldWarehouse._id,
      warrantyExpiredDate: { $lte: today }
    }).select('mac').exec();

    if (devicesToExpire.length === 0) {
      return { processedCount: 0 };
    }

    const macs = devicesToExpire.map(d => d.mac);
    this.logger.warn(`Found ${macs.length} devices to expire warranty: ${macs.join(', ')}`);

    // 2. Chuyển sang kho Hết hạn bảo hành (SOLD_WARRANTY)
    await this.moveDevicesToWarehouse(
      macs,
      'SOLD_WARRANTY',
      'AUTO-WARRANTY-EXPIRATION',
      'SYSTEM_EXPIRATION'
    );

    return { processedCount: macs.length };
  }

  async getStockSummary(): Promise<any[]> {
    const readyWarehouse = await this.warehouseService.findByCode('READY_TO_EXPORT');
    if (!readyWarehouse) {
      return [];
    }

    const result = await this.deviceModel.aggregate([
      {
        $match: {
          warehouseId: readyWarehouse._id,
          qcStatus: 'PASS'
        }
      },
      {
        $group: {
          _id: '$deviceModel',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          deviceModel: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    return result;
  }
}
