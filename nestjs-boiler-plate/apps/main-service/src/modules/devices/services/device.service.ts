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
import { Category } from '../../categories/schemas/categories.schemas';

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
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    private readonly warehouseService: WarehouseService,
    private readonly sharedDataService: SharedDataService,
  ) { }

  async onModuleInit() {
    try {
      await this.deviceModel.collection.dropIndex('serial_1').catch(() => { });
      this.logger.log('Đã xóa index cũ: serial_1');
    } catch (error) { }

    try {
      await this.deviceModel.collection.dropIndex('mac_1').catch(() => { });
      this.logger.log('Đã xóa index cũ: mac_1');
    } catch (error) { }

    try {
      await this.deviceModel.syncIndexes();
      this.logger.log('Đã cấu trúc và đồng bộ lại Indexes cho Device collection (bao gồm sparse: true).');
    } catch (error: any) {
      this.logger.error('Cảnh báo: Lỗi khi sync indexes:', error.message);
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
    try {
      return await this.deviceRepository.insertMany(devices, options);
    } catch (err: any) {
      if (err.code === 11000 || (err.message && err.message.includes('E11000'))) {
        const match = err.message?.match(/dup key: \{ mac: "([^"]+)" \}/);
        const dupMac = match ? match[1] : 'không xác định';
        throw new BadRequestException(`MAC địa chỉ đã tồn tại trong hệ thống: ${dupMac}`);
      }
      throw err;
    }
  }

  async countByImportId(importId: string): Promise<number> {
    return this.deviceModel.countDocuments({ importId });
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
    const device = await this.deviceModel.findOne({ $or: [{ mac: mac }, { serial: mac }] })
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



  async findByScannedCodes(scannedCodes: string[], scanMode?: 'mac' | 'serial'): Promise<Device[]> {
    if (!scannedCodes || scannedCodes.length === 0) return [];
    return this.deviceModel.find({
      $or: [
        { mac: { $in: scannedCodes } },
        { serial: { $in: scannedCodes } }
      ]
    }).exec();
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
      { $or: [{ mac: { $in: macs } }, { serial: { $in: macs } }] },
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
      $or: [{ mac: { $in: macs } }, { serial: { $in: macs } }]
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
      { $or: [{ mac: { $in: macs } }, { serial: { $in: macs } }] },
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

      // Log Transition
      const transitionData = {
        exportCode,
        fromWarehouseId: devicesToMove[0].warehouseId, // Assume all from same warehouse ideally
        toWarehouseId: targetWarehouse._id,
        macs: macs, // validCodes passed down
        status: 'COMPLETED',
        createdBy: actorId !== '000000000000000000000000' ? actorId : null
      };

      try {
        await this.transitionModel.create(transitionData);
        this.logger.debug(`[DEBUG] Transition log created`);
      } catch (err) {
        this.logger.error(`[DEBUG] Failed to log transition:`, err);
      }
    }
  }

  async countReadyToExport(model: string): Promise<number> {
    const readyWarehouse = await this.warehouseService.findByCode('READY_TO_EXPORT');
    if (!readyWarehouse) return 0;

    return this.deviceModel.countDocuments({
      deviceModel: model,
      warehouseId: readyWarehouse._id,
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

  // --- THỐNG KÊ TỶ LỆ LỖI BẢO HÀNH (DASHBOARD) ---
  async getDefectRateStats(importId?: string): Promise<any> {
    const matchStage: any = {};
    if (importId) {
      matchStage.importId = new Types.ObjectId(importId);
    }

    const defectWarehouse = await this.warehouseService.findByCode('DEFECT');
    const defectWarehouseId = defectWarehouse ? defectWarehouse._id : null;

    const removedWarehouse = await this.warehouseService.findByCode('REMOVED');
    const removedWarehouseId = removedWarehouse ? removedWarehouse._id : null;

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $facet: {
          defectSummary: [
            {
              $group: {
                _id: null,
                totalDevices: { $sum: 1 },
                totalDefective: { $sum: { $cond: ['$isDefective', 1, 0] } },
                totalGood: { $sum: { $cond: [{ $eq: ['$isDefective', false] }, 1, 0] } },
                totalLocalRepaired: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ['$isDefective', true] },
                          { $eq: [{ $ifNull: ['$replacedByDeviceId', null] }, null] },
                          { $ne: ['$warehouseId', defectWarehouseId] },
                          { $ne: ['$warehouseId', removedWarehouseId] }
                        ]
                      }, 1, 0
                    ]
                  }
                },
                totalSwapped: { $sum: { $cond: [{ $ne: [{ $ifNull: ['$replacedByDeviceId', null] }, null] }, 1, 0] } },
                totalSentToVendor: { $sum: { $cond: [{ $eq: ['$warehouseId', defectWarehouseId] }, 1, 0] } },
                totalScrapped: { $sum: { $cond: [{ $eq: ['$warehouseId', removedWarehouseId] }, 1, 0] } }
              }
            }
          ],
          defectReasonsDistribution: [
            { $match: { isDefective: true, defectReasonId: { $ne: null } } },
            { $group: { _id: '$defectReasonId', count: { $sum: 1 } } },
            {
              $lookup: {
                from: 'defectreasons',
                localField: '_id',
                foreignField: '_id',
                as: 'reasonInfo'
              }
            },
            { $unwind: '$reasonInfo' },
            {
              $project: {
                _id: 0,
                reasonName: '$reasonInfo.name',
                count: 1
              }
            }
          ]
        }
      }
    ];

    const result = await this.deviceModel.aggregate(pipeline).exec();

    return {
      summary: result[0]?.defectSummary[0] || {
        totalDevices: 0,
        totalDefective: 0,
        totalGood: 0,
        totalLocalRepaired: 0,
        totalSwapped: 0,
        totalSentToVendor: 0,
        totalScrapped: 0
      },
      distribution: result[0]?.defectReasonsDistribution || []
    };
  }

  // Helper method for category mapping
  private determineCategoryName(deviceModel: string, name: string): string | null {
    const modelStr = String(deviceModel || '').trim().toUpperCase();
    const nameStr = String(name || '').trim().toLowerCase();

    // Priority 1: Match deviceModel strictly
    if (modelStr.startsWith('AV-C')) return 'Camera';
    if (modelStr.startsWith('AV-N')) return 'Đầu ghi hình';

    // Priority 2: Fuzzy match name string
    if (nameStr.includes('camera')) return 'Camera';
    if (nameStr.includes('đầu ghi') || nameStr.includes('nvr')) return 'Đầu ghi hình';
    if (nameStr.includes('barrier') || nameStr.includes('barie')) return 'Barrier';
    if (nameStr.includes('màn hình') || nameStr.includes('display')) return 'Màn hình';

    return null;
  }

  async syncCategories(): Promise<{ message: string, matchedCount: number, modifiedCount: number }> {
    // 1. Fetch categories map (1 query)
    const allCategories = await this.categoryModel.find().lean();
    const categoryMap: Record<string, any> = {};
    for (const cat of allCategories) {
      categoryMap[cat.name] = cat._id;
    }

    // 2. Query target devices affected by legacy ID bug
    const TARGET_LEGACY_ID = '696b38875f5e0185d5a694cd';
    const targetDevices = await this.deviceModel.find({ categoryId: TARGET_LEGACY_ID }).lean();

    if (targetDevices.length === 0) {
      return { message: 'Không tìm thấy thiết bị nào mang mã 696b38875f5e0185d5a694cd.', matchedCount: 0, modifiedCount: 0 };
    }

    // 3. Loop and evaluate mapping
    const bulkOps: any[] = [];
    for (const d of targetDevices) {
      const matchName = this.determineCategoryName(d.deviceModel, d.name);

      if (matchName && categoryMap[matchName]) {
        // Queue valid update
        bulkOps.push({
          updateOne: {
            filter: { _id: d._id },
            update: { $set: { categoryId: categoryMap[matchName] } }
          }
        });
      }
    }

    // 4. Execute
    if (bulkOps.length === 0) {
      return { message: 'Đã bỏ qua vì các thiết bị mục tiêu không có chuỗi nào trùng khớp với quy tắc mapping Category.', matchedCount: targetDevices.length, modifiedCount: 0 };
    }

    const startExecution = Date.now();
    const result = await this.deviceModel.bulkWrite(bulkOps);

    this.logger.log(`[Category Sync] Cập nhật hoàn tất cho ${result.modifiedCount} thiết bị trong ${Date.now() - startExecution}ms.`);

    return {
      message: 'Success',
      matchedCount: result.matchedCount || 0,
      modifiedCount: result.modifiedCount || 0
    };
  }
}
