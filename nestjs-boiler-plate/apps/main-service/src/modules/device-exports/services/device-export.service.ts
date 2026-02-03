import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
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

    // Không cho phép xóa phiếu xuất đã có thiết bị được quét
    if (deviceexport.items && deviceexport.items.length > 0) {
      throw new BadRequestException('Không thể xóa phiếu xuất đã có thiết bị được quét. Vui lòng xóa tất cả thiết bị trước.');
    }

    const deletedDeviceExport = await this.deviceExportRepository.delete(id);
    if (!deletedDeviceExport) {
      throw new BadRequestException(ERROR_MESSAGES.DEVICE_EXPORT.DELETE_FAILED);
    }
    return deletedDeviceExport;
  }



  async submitForApproval(id: string): Promise<DeviceExport> {
    const exportRecord = await this.findById(id);
    if (exportRecord.status !== ExportStatusEnum.DRAFT) {
      throw new BadRequestException('Chỉ có thể gửi duyệt phiếu ở trạng thái Nháp (DRAFT).');
    }
    // Kiểm tra yêu cầu xuất kho
    if (!exportRecord.requirements || exportRecord.requirements.length === 0) {
      throw new BadRequestException('Phiếu xuất chưa có danh sách hàng hóa yêu cầu.');
    }

    return this.update(id, { status: ExportStatusEnum.PENDING_APPROVAL as any } as any);
  }

  async approve(id: string, user: any): Promise<DeviceExport> {
    const exportRecord = await this.findById(id);
    if (exportRecord.status !== ExportStatusEnum.PENDING_APPROVAL) {
      throw new BadRequestException('Chỉ có thể duyệt phiếu đang Chờ duyệt (PENDING_APPROVAL).');
    }

    // Check Assigned Approver
    if (exportRecord.assignedApprover) {
      const assignedId = exportRecord.assignedApprover.toString();
      const currentUserId = user._id.toString();
      if (assignedId !== currentUserId) {
        throw new ForbiddenException('Bạn không được chỉ định duyệt phiếu này.');
      }
    }

    // Validate Stock Availability
    if (exportRecord.requirements && exportRecord.requirements.length > 0) {
      for (const req of exportRecord.requirements) {
        const stockStatus = await this.getInventoryStatus(req.deviceCode);
        if (stockStatus.available < req.quantity) {
          throw new BadRequestException(
            `Không đủ tồn kho khả dụng cho ${req.deviceCode}. Cần: ${req.quantity}, Khả dụng: ${stockStatus.available}`
          );
        }
      }
    }

    return this.update(id, {
      status: ExportStatusEnum.APPROVED as any,
      approvedBy: user._id,
      approvedDate: new Date()
    } as any);
  }

  async reject(id: string, reason: string): Promise<DeviceExport> {
    const exportRecord = await this.findById(id);
    if (exportRecord.status !== ExportStatusEnum.PENDING_APPROVAL) {
      throw new BadRequestException('Chỉ có thể từ chối phiếu đang Chờ duyệt (PENDING_APPROVAL).');
    }
    return this.update(id, {
      status: ExportStatusEnum.REJECTED as any,
      rejectedReason: reason
    } as any);
  }


  async getInventoryStatus(model: string): Promise<{ inStock: number; reserved: number; available: number }> {
    const inStock = await this.deviceService.countReadyToExport(model);

    const activeExports = await this.deviceExportRepository.findAll({
      status: {
        $in: [
          ExportStatusEnum.APPROVED,
          ExportStatusEnum.IN_PROGRESS
        ]
      }
    });

    let reserved = 0;
    for (const exportRecord of activeExports) {
      if (exportRecord.requirements) {
        const req = exportRecord.requirements.find(r => r.deviceCode === model);
        if (req) {
          reserved += req.quantity;
        }
      }
    }

    return {
      inStock,
      reserved,
      available: Math.max(0, inStock - reserved)
    };
  }
}
