import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DeviceExportRepository } from '../repositories/device-export.repository';
import { CreateDeviceExportDto } from '../dto/create-device-export.dto';
import { UpdateDeviceExportDto } from '../dto/update-device-export.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { DeviceExport, ExportStatus } from '../schemas/device-export.schemas';
import { ERROR_MESSAGES } from 'apps/main-service/src/common/constants/messages.constants';
import { FilterQuery } from 'mongoose';
import { AppLogger } from '../../../common/utils/logger.util';
import { ExportStatus as ExportStatusEnum } from '../../../common/constants/export-status.constant';

import { DeviceService } from '../../devices/services/device.service';

@Injectable()
export class DeviceExportService {
  private readonly logger = new AppLogger(DeviceExportService.name);

  constructor(
    private readonly deviceExportRepository: DeviceExportRepository,
    private readonly deviceService: DeviceService
  ) { }

  async create(createDeviceExportDto: CreateDeviceExportDto): Promise<DeviceExport> {
    try {
      // Auto-generate code
      if (!createDeviceExportDto.code) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        createDeviceExportDto.code = `PX-${dateStr}-${randomSuffix}`;
      }

      // Tính tổng số lượng từ danh sách yêu cầu
      if (createDeviceExportDto.requirements) {
        createDeviceExportDto.totalQuantity = createDeviceExportDto.requirements.reduce((sum, req) => sum + req.quantity, 0);
      }

      return await this.deviceExportRepository.create(createDeviceExportDto);
    } catch (error) {
      this.logger.errorWithContext('Failed to create device export', error, {
        dto: createDeviceExportDto,
        method: 'create'
      });
      throw new BadRequestException(ERROR_MESSAGES.DEVICE_EXPORT.CREATE_FAILED);
    }
  }

  async findAll(filter: FilterQuery<DeviceExport> = {}): Promise<DeviceExport[]> {
    return this.deviceExportRepository.findAll(filter);
  }

  async findAllWithPagination(filter: FilterQuery<DeviceExport> = {}, options: any = {}): Promise<PaginateResult<DeviceExport>> {
    return this.deviceExportRepository.findAllWithPagination(filter, options);
  }

  async findById(id: string): Promise<DeviceExport> {
    try {
      const deviceexport = await this.deviceExportRepository.findById(id);
      if (!deviceexport) {
        this.logger.warn('Device export not found', { id, method: 'findById' });
        throw new NotFoundException(ERROR_MESSAGES.DEVICE_EXPORT.NOT_FOUND);
      }
      return deviceexport;
    } catch (error) {
      if (error.name === 'CastError') {
        this.logger.warn('Invalid device export ID format', {
          id,
          errorName: error.name,
          method: 'findById'
        });
        throw new BadRequestException('ID phiếu xuất không hợp lệ');
      }
      throw error;
    }
  }

  async update(id: string, updateDeviceExportDto: UpdateDeviceExportDto): Promise<DeviceExport> {
    const deviceexport = await this.deviceExportRepository.findById(id);
    if (!deviceexport) {
      throw new NotFoundException(ERROR_MESSAGES.DEVICE_EXPORT.NOT_FOUND);
    }
    const updatedDeviceExport = await this.deviceExportRepository.update(id, updateDeviceExportDto);
    if (!updatedDeviceExport) {
      throw new BadRequestException(ERROR_MESSAGES.DEVICE_EXPORT.UPDATE_FAILED);
    }
    return updatedDeviceExport;
  }

  async delete(id: string): Promise<DeviceExport> {
    const deviceexport = await this.deviceExportRepository.findById(id);
    if (!deviceexport) {
      throw new NotFoundException(ERROR_MESSAGES.DEVICE_EXPORT.NOT_FOUND);
    }
    const deletedDeviceExport = await this.deviceExportRepository.delete(id);
    if (!deletedDeviceExport) {
      throw new BadRequestException(ERROR_MESSAGES.DEVICE_EXPORT.DELETE_FAILED);
    }
    return deletedDeviceExport;
  }

  async addItems(id: string, serials: string[]): Promise<DeviceExport> {
    const exportRecord = await this.findById(id);

    const allowedStatuses = [
      ExportStatusEnum.APPROVED,
      ExportStatusEnum.IN_PROGRESS,
      ExportStatusEnum.DRAFT
    ];

    if (!allowedStatuses.includes(exportRecord.status as any)) {
      throw new BadRequestException(
        `Không thể quét thiết bị khi phiếu đang ở trạng thái ${exportRecord.status}`
      );
    }

    // 1. Validate Devices
    const devices = await this.deviceService.findBySerials(serials);
    const foundSerials = devices.map(d => d.serial);
    const missingSerials = serials.filter(s => !foundSerials.includes(s));

    if (missingSerials.length > 0) {
      throw new BadRequestException(`Các serial sau không tồn tại: ${missingSerials.join(', ')}`);
    }

    const existingSerials = exportRecord.items.map(i => i.serial);
    const duplicatesInExport = serials.filter(s => existingSerials.includes(s));
    if (duplicatesInExport.length > 0) {
      throw new BadRequestException(`Các serial sau đã có trong phiếu này: ${duplicatesInExport.join(', ')}`);
    }

    if (exportRecord.requirements && exportRecord.requirements.length > 0) {
      for (const device of devices) {
        const req = exportRecord.requirements.find(r => r.productCode === device.deviceModel);

        if (!req) {
          throw new BadRequestException(`Sản phẩm ${device.deviceModel} (Serial: ${device.serial}) không có trong yêu cầu xuất kho.`);
        }

        const currentCount = exportRecord.items.filter(i => i.productCode === device.deviceModel).length;
        const currentBatchCount = devices.filter(d => d.deviceModel === device.deviceModel && d.serial !== device.serial && serials.includes(d.serial)).length;
        const scannedCountOfThisType = exportRecord.items.filter(i => i.productCode === device.deviceModel).length
          + devices.filter(d => d.deviceModel === device.deviceModel).length;
      }

      const devicesByModel = devices.reduce((acc, d) => {
        acc[d.deviceModel] = (acc[d.deviceModel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      for (const [model, count] of Object.entries(devicesByModel)) {
        const req = exportRecord.requirements.find(r => r.productCode === model);
        if (!req) throw new BadRequestException(`Sản phẩm ${model} không nằm trong kế hoạch xuất kho.`);

        const currentScanned = exportRecord.items.filter(i => i.productCode === model).length;
        if (currentScanned + count > req.quantity) {
          throw new BadRequestException(`Sản phẩm ${model} vượt quá số lượng yêu cầu (${currentScanned + count}/${req.quantity}).`);
        }
      }
    }

    const newItems = devices.map(d => ({
      serial: d.serial,
      deviceModel: d.deviceModel,
      productCode: d.deviceModel,
      exportPrice: 0
    }));

    const updateDto: any = {
      items: [...exportRecord.items, ...newItems],
      totalItems: exportRecord.items.length + newItems.length
    };

    if (exportRecord.status === ExportStatusEnum.APPROVED) {
      updateDto.status = ExportStatusEnum.IN_PROGRESS as any;
    }

    return this.update(id, updateDto);
  }

  async approve(id: string, userFn?: any): Promise<DeviceExport> {
    const exportRecord = await this.findById(id);
    if (exportRecord.status !== ExportStatusEnum.PENDING_APPROVAL) {
      throw new BadRequestException('Chỉ có thể duyệt phiếu đang chờ duyệt');
    }
    return this.update(id, {
      status: ExportStatusEnum.APPROVED as any,
      approvedBy: userFn,
      approvedDate: new Date()
    } as any);
  }

  async reject(id: string, reason: string): Promise<DeviceExport> {
    const exportRecord = await this.findById(id);
    if (exportRecord.status !== ExportStatusEnum.PENDING_APPROVAL) {
      throw new BadRequestException('Chỉ có thể từ chối phiếu đang chờ duyệt');
    }
    return this.update(id, {
      status: ExportStatusEnum.REJECTED as any,
      rejectedReason: reason
    } as any);
  }

  async submitForApproval(id: string): Promise<DeviceExport> {
    const exportRecord = await this.findById(id);
    if (exportRecord.status !== ExportStatusEnum.DRAFT) {
      throw new BadRequestException('Chỉ có thể gửi duyệt phiếu Nháp');
    }
    return this.update(id, { status: ExportStatusEnum.PENDING_APPROVAL as any } as any);
  }


  async confirm(id: string): Promise<DeviceExport> {
    const exportRecord = await this.findById(id);

    if (exportRecord.status === ExportStatus.COMPLETED) {
      throw new BadRequestException('Phiếu xuất đã hoàn thành');
    }

    if (exportRecord.items.length === 0) {
      throw new BadRequestException('Chưa có thiết bị nào được quét');
    }

    const serials = exportRecord.items.map(i => i.serial);
    await this.deviceService.bulkUpdateStatus(serials, 'SOLD', 'Xuất kho theo phiếu ' + exportRecord.code);

    return this.update(id, {
      status: ExportStatus.COMPLETED,
      exportDate: new Date()
    } as any);
  }
}
