import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeviceImportRepository } from '../repositories/device-import.repository';
import { CreateDeviceImportDto } from '../dto/create-device-import.dto';
import { UpdateDeviceImportDto } from '../dto/update-device-import.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { DeviceImport } from '../schemas/device-import.schemas';
import { DeviceService } from '../../devices/services/device.service';
import { ERROR_MESSAGES } from 'apps/main-service/src/common/constants/messages.constants';
import { FilterQuery } from 'mongoose';
import { InventoryCoordinatorService } from '../../inventory-coordinator/services/inventory-coordinator.service';
import { UserService } from '../../../users/services/user.service';
import { WarehouseService } from '../../warehouses/services/warehouse.service';
import { Device } from '../../devices/schemas/device.schemas';
import { DeviceHistory } from '../../device-histories/schemas/device-history.schemas';

@Injectable()
export class DeviceImportService {
  private readonly logger = new Logger(DeviceImportService.name);

  constructor(
    private readonly deviceImportRepository: DeviceImportRepository,
    private readonly deviceService: DeviceService,
    private readonly coordinatorService: InventoryCoordinatorService,
    private readonly userService: UserService,
    private readonly warehouseService: WarehouseService,
    @InjectModel(Device.name) private readonly deviceModel: Model<Device>,
    @InjectModel(DeviceHistory.name) private readonly historyModel: Model<DeviceHistory>,
  ) { }

  async create(createDto: CreateDeviceImportDto, userId: string): Promise<DeviceImport> {
    // Kiểm tra Serial trước khi tạo mới -> Chỉ check kỹ khi trạng thái là PUBLIC (Lưu chính thức)
    if (createDto.status === 'PUBLIC') {
      const devices = createDto.devices || [];
      const allMacs: string[] = [];

      for (const device of devices) {
        const d: any = device;
        const macs = d.expectedMacs || [];

        // 1. Check trùng lặp nội bộ trong lô
        if (macs.length > 0) {
          const unique = new Set(macs);
          if (unique.size !== macs.length) {
            throw new BadRequestException(
              ERROR_MESSAGES.DEVICE_IMPORT.MAC_DUPLICATE
                .replace('{device}', d.deviceCode)
            );
          }
          allMacs.push(...macs);
        }
      }

      // 2. Check trùng lặp với Database (dùng $in một lần duy nhất)
      if (allMacs.length > 0) {
        const existingDevices = await this.deviceService.findByMacs(allMacs);
        if (existingDevices.length > 0) {
          const duplicateMacs = existingDevices.map((d: any) => d.mac).join(', ');
          throw new BadRequestException(
            `Phát hiện ${existingDevices.length} MAC đã tồn tại trong hệ thống: ${duplicateMacs}`
          );
        }
      }
    }

    // 1. Tự sinh mã phiếu nếu FE không gửi
    let code = createDto.code;
    if (!code) {
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      code = `NK-${year}-${month}-${random}`;
    }

    // 2. Tính toán tổng & Process Devices
    const devicesDto = createDto.devices || [];
    const { devices, totalItem, totalQuantity, totalMacImported } = this.processDevices(devicesDto);

    const details = createDto.details || [];
    const status = createDto.status || 'DRAFT';

    // 3. Map dữ liệu
    const payload = {
      ...createDto,
      code,
      devices,
      details,
      totalItem,
      totalQuantity,
      macImported: totalMacImported,
      status,
      createdBy: userId ? userId : null
    };

    const newImport = await this.deviceImportRepository.create(payload as any);
    if (status === 'PUBLIC') {
      // Fetch lại từ DB để đảm bảo là plain object (tránh Mongoose Document proxy issue)
      const freshDoc = await this.findById(String(newImport.id || newImport._id));
      await this.autoProvisionDevices(freshDoc, userId);
    }

    return newImport;
  }

  /**
   * Tự động tạo toàn bộ Device từ phiếu nhập và đẩy thẳng vào PENDING_QC.
   */
  private async autoProvisionDevices(importDoc: DeviceImport, userId: string): Promise<void> {
    try {
      // 1. Lấy kho PENDING_QC
      const pendingQcWarehouse = await this.warehouseService.findByCode('PENDING_QC');
      if (!pendingQcWarehouse) {
        this.logger.error('[Shift-Left] Kho PENDING_QC không tồn tại!');
        return;
      }

      const validActorId = userId || '000000000000000000000000';
      const devicesToCreate: any[] = [];

      // 2. Map từng device — dùng toObject() để truy cập sub-document qua Mongoose
      const importPlain = (importDoc as any).toObject ? (importDoc as any).toObject() : importDoc;
      this.logger.log(`[Shift-Left] Bắt đầu auto-provision phiếu ${importPlain.code}, devices.length = ${(importPlain.devices || []).length}`);

      for (const deviceSpec of importPlain.devices || []) {
        const specDetails = deviceSpec.expectedDetails || [];
        const specMacs = deviceSpec.expectedMacs || [];
        this.logger.log(`[Shift-Left] deviceCode=${deviceSpec.deviceCode} | expectedDetails=${specDetails.length} | expectedMacs=${JSON.stringify(specMacs)}`);

        // A. Luồng nhập từ File Excel (chứa expectedDetails)
        for (const detail of specDetails) {
          if (!detail.mac) continue;
          devicesToCreate.push({
            mac: detail.mac,
            serial: detail.serial || '',
            name: detail.name || deviceSpec.deviceCode,
            deviceModel: deviceSpec.deviceCode,
            p2p: detail.p2p || '',
            warehouseId: pendingQcWarehouse._id,
            importId: importPlain._id,
            importDate: importPlain.importDate || new Date(),
            qcStatus: 'PENDING',
          });
        }

        // B. Luồng nhập Thủ công từ UI (chỉ chứa mảng string expectedMacs)
        for (const plainMac of specMacs) {
          if (!devicesToCreate.some(d => d.mac === plainMac)) {
            devicesToCreate.push({
              mac: plainMac,
              serial: '',
              name: deviceSpec.deviceCode,
              deviceModel: deviceSpec.deviceCode,
              p2p: '',
              warehouseId: pendingQcWarehouse._id,
              importId: importPlain._id,
              importDate: importPlain.importDate || new Date(),
              qcStatus: 'PENDING',
            });
          }
        }
      }

      if (devicesToCreate.length === 0) {
        this.logger.warn(`[Shift-Left] Phiếu ${importPlain.code} không có MAC nào để provision.`);
        return;
      }

      this.logger.log(`[Shift-Left] Chuẩn bị insert ${devicesToCreate.length} thiết bị: ${JSON.stringify(devicesToCreate.map(d => d.mac))}`);

      // 3. insertMany — ordered:false để tiếp tục dù có MAC trùng
      let inserted: any[] = [];
      try {
        inserted = await this.deviceModel.insertMany(devicesToCreate, { ordered: false });
      } catch (bulkErr: any) {
        // BulkWriteError: một số doc bị reject (MAC trùng), nhưng các doc khác vẫn được insert
        if (bulkErr?.insertedDocs?.length > 0 || bulkErr?.result?.insertedCount > 0) {
          inserted = bulkErr.insertedDocs || [];
          const skipped = devicesToCreate.length - inserted.length;
          this.logger.warn(`[Shift-Left] BulkWriteError: insert ${inserted.length}/${devicesToCreate.length} thiết bị. Bỏ qua ${skipped} MAC đã tồn tại.`);
        } else {
          // Lỗi thật sự (không phải duplicate)
          this.logger.error(`[Shift-Left] insertMany thất bại hoàn toàn: ${bulkErr.message}`, bulkErr.stack);
          return;
        }
      }
      this.logger.log(`[Shift-Left] Đã tạo ${inserted.length} thiết bị vào PENDING_QC từ phiếu ${importPlain.code}`);

      // 4. Ghi DeviceHistory cho từng thiết bị
      const histories = inserted.map((dev: any) => ({
        deviceId: dev._id,
        fromWarehouseId: pendingQcWarehouse._id, // Sinh trực tiếp vào đây nên from = to
        toWarehouseId: pendingQcWarehouse._id,
        actorId: validActorId,
        action: 'IMPORT',
        note: `Nhập kho tự động từ phiếu nhập ${importDoc.code}`,
      }));

      await this.historyModel.insertMany(histories, { ordered: false });

      this.logger.log(`[Shift-Left] Đã đẩy ${inserted.length} thiết bị vào PENDING_QC từ phiếu ${importDoc.code}. Tiến độ kiểm kê vẫn là 0%.`);

    } catch (err: any) {
      this.logger.error(`[Shift-Left] Lỗi khi auto-provision thiết bị: ${err.message}`);
    }
  }

  async findAll(filter: FilterQuery<DeviceImport> = {}, options: any = {}): Promise<DeviceImport[]> {
    return this.deviceImportRepository.findAll(filter, options);
  }

  async findAllWithPagination(filter: FilterQuery<DeviceImport> = {}, options: any = {}): Promise<PaginateResult<DeviceImport>> {
    return this.deviceImportRepository.findAllWithPagination(filter, options);
  }

  async findById(id: string, options: any = {}): Promise<DeviceImport> {
    const deviceimport = await this.deviceImportRepository.findById(id, options);
    if (!deviceimport) {
      throw new NotFoundException(ERROR_MESSAGES.DEVICE_IMPORT.NOT_FOUND);
    }
    return deviceimport;
  }

  async update(id: string, updateDto: UpdateDeviceImportDto, userId: string | null): Promise<DeviceImport> {
    const existing = await this.findById(id);

    // Chỉ cho sửa khi đang DRAFT
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(ERROR_MESSAGES.DEVICE_IMPORT.DRAFT_ONLY_EDIT);
    }

    const updateData: any = {
      ...updateDto,
      updatedBy: userId
    };

    // Tính lại tổng nếu sửa devices
    if (updateDto.devices) {
      const { devices, totalItem, totalQuantity, totalMacImported } = this.processDevices(updateDto.devices);
      updateData.devices = devices;
      updateData.totalItem = totalItem;
      updateData.totalQuantity = totalQuantity;
      updateData.macImported = totalMacImported;
    }

    const updated = await this.deviceImportRepository.update(id, updateData);

    if (!updated) {
      throw new BadRequestException(ERROR_MESSAGES.DEVICE_IMPORT.UPDATE_FAILED);
    }

    if (updateDto.status === 'PUBLIC') {
      const freshDoc = await this.findById(id);
      await this.autoProvisionDevices(freshDoc, userId || '');
    }

    return updated;
  }

  async delete(id: string): Promise<DeviceImport> {
    const existing = await this.findById(id);

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(ERROR_MESSAGES.DEVICE_IMPORT.DRAFT_ONLY_DELETE);
    }

    const deleted = await this.deviceImportRepository.delete(id);
    if (!deleted) {
      throw new BadRequestException(ERROR_MESSAGES.DEVICE_IMPORT.DELETE_FAILED);
    }
    return deleted;
  }


  private processDevices(devicesDto: any[]) {
    if (!devicesDto || !Array.isArray(devicesDto) || devicesDto.length === 0) {
      return {
        devices: [],
        totalItem: 0,
        totalQuantity: 0,
        totalMacImported: 0
      };
    }

    const processedDevices = devicesDto.map(d => {
      return {
        ...d,
        macImported: 0
      };
    });

    const totalItem = processedDevices.length;
    const totalQuantity = processedDevices.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalMacImported = 0;

    return {
      devices: processedDevices,
      totalItem,
      totalQuantity,
      totalMacImported
    };
  }

  async complete(id: string, userId: string | null): Promise<DeviceImport> {
    return this.coordinatorService.manualCompleteImport(id, userId);
  }
}
