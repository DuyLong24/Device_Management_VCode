import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class DeviceImportService {
  constructor(
    private readonly deviceImportRepository: DeviceImportRepository,
    private readonly deviceService: DeviceService,
    private readonly coordinatorService: InventoryCoordinatorService,
    private readonly userService: UserService
  ) { }

  async create(createDto: CreateDeviceImportDto, userId: string): Promise<DeviceImport> {
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
      devices, // Use processed devices with macImported set
      details,
      totalItem,
      totalQuantity,
      macImported: totalMacImported, // Set root macImported
      status,
      createdBy: userId ? userId : null
    };

    const newImport = await this.deviceImportRepository.create(payload as any);

    return newImport;
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
      updateData.devices = devices; // Save processed devices
      updateData.totalItem = totalItem;
      updateData.totalQuantity = totalQuantity;
      updateData.macImported = totalMacImported; // Update root macImported
    }

    const updated = await this.deviceImportRepository.update(id, updateData);

    // Check null safely though update repo usually returns document or null
    if (!updated) {
      throw new BadRequestException(ERROR_MESSAGES.DEVICE_IMPORT.UPDATE_FAILED);
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
