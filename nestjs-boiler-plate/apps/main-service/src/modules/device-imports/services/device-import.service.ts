import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { DeviceImportRepository } from '../repositories/device-import.repository';
import { CreateDeviceImportDto } from '../dto/create-device-import.dto';
import { UpdateDeviceImportDto } from '../dto/update-device-import.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { DeviceImport } from '../schemas/device-import.schemas';
import { DeviceService } from '../../devices/services/device.service';
import { ERROR_MESSAGES } from 'apps/main-service/src/common/constants/messages.constants';
import { FilterQuery } from 'mongoose';
import { InventorySessionService } from '../../inventory-sessions/services/inventory-session.service';

@Injectable()
export class DeviceImportService {
  constructor(
    private readonly deviceImportRepository: DeviceImportRepository,
    private readonly deviceService: DeviceService,
    @Inject(forwardRef(() => InventorySessionService))
    private readonly inventorySessionService: InventorySessionService,
  ) { }

  async create(createDto: CreateDeviceImportDto, userId: string): Promise<DeviceImport> {
    // Kiểm tra Serial trước khi tạo mới -> Chỉ check kỹ khi trạng thái là PENDING (Lưu chính thức)
    if (createDto.status === 'PENDING') {
      const products = createDto.products || [];
      for (const product of products) {
        const p: any = product;
        const serials = p.expectedSerials || [];

        // 2. Check trùng lặp nội bộ
        if (serials.length > 0) {
          const unique = new Set(serials);
          if (unique.size !== serials.length) {
            throw new BadRequestException(
              ERROR_MESSAGES.DEVICE_IMPORT.SERIAL_DUPLICATE
                .replace('{product}', p.productCode)
            );
          }
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

    // 2. Tính toán tổng
    const products = createDto.products || [];
    const { totalItem, totalQuantity } = this.calculateTotals(products);

    const details = createDto.details || [];
    const status = createDto.status || 'DRAFT';

    // 3. Map dữ liệu
    const payload = {
      ...createDto,
      code,
      products,
      details,
      totalItem,
      totalQuantity,
      status,
      createdBy: userId ? userId : null
    };

    const newImport = await this.deviceImportRepository.create(payload as any);

    return newImport;
  }

  async findAll(filter: FilterQuery<DeviceImport> = {}): Promise<DeviceImport[]> {
    return this.deviceImportRepository.findAll(filter);
  }

  async findAllWithPagination(filter: FilterQuery<DeviceImport> = {}, options: any = {}): Promise<PaginateResult<DeviceImport>> {
    return this.deviceImportRepository.findAllWithPagination(filter, options);
  }

  async findById(id: string): Promise<DeviceImport> {
    const deviceimport = await this.deviceImportRepository.findById(id);
    if (!deviceimport) {
      throw new NotFoundException(ERROR_MESSAGES.DEVICE_IMPORT.NOT_FOUND);
    }
    return deviceimport;
  }

  async update(id: string, updateDto: UpdateDeviceImportDto, userId: string): Promise<DeviceImport> {
    const existing = await this.findById(id);

    // Chỉ cho sửa khi đang DRAFT
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(ERROR_MESSAGES.DEVICE_IMPORT.DRAFT_ONLY_EDIT);
    }

    const updateData: any = {
      ...updateDto,
      updatedBy: userId
    };

    // Tính lại tổng nếu sửa products
    if (updateDto.products) {
      const { totalItem, totalQuantity } = this.calculateTotals(updateDto.products);
      updateData.totalItem = totalItem;
      updateData.totalQuantity = totalQuantity;
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

  private calculateTotals(products: any[]) {
    if (!products || !Array.isArray(products) || products.length === 0) {
      return { totalItem: 0, totalQuantity: 0 };
    }
    const totalItem = products.length;
    const totalQuantity = products.reduce((sum, item) => sum + (item.quantity || 0), 0);
    return { totalItem, totalQuantity };
  }

  async updateProgress(id: string, data: { serialImported: number, productCounts?: Record<string, number> }) {
    const ticket = await this.findById(id);
    let newStatus = ticket.inventoryStatus;

    // 1. Tính toán trạng thái kiểm kê dựa trên số lượng đã quét
    if (data.serialImported > 0) {
      newStatus = 'in-progress';
    }

    const updatePayload: any = {
      serialImported: data.serialImported,
      inventoryStatus: newStatus
    };

    // Update product specific counts if provided
    if (data.productCounts) {
      // Ensure we work with plain objects
      const currentProducts = ticket.products || [];

      updatePayload.products = currentProducts.map(p => {
        // Convert to plain object if it's a Mongoose document
        const productObj = (typeof (p as any).toObject === 'function') ? (p as any).toObject() : p;

        const additional = data.productCounts?.[productObj.productCode] || 0;
        if (additional > 0) {
          return {
            ...productObj,
            serialImported: (productObj.serialImported || 0) + additional
          };
        }
        return productObj;
      });
    }

    // Nếu đang làm dở -> Update trạng thái phiếu thành IN_PROGRESS (để không còn là PENDING/DRAFT)
    if (newStatus === 'in-progress') {
      updatePayload.status = 'IN_PROGRESS';
    }

    return this.deviceImportRepository.update(id, updatePayload);
  }

  async complete(id: string, userId: string): Promise<DeviceImport> {
    const ticket = await this.findById(id);
    if (!ticket) throw new NotFoundException(ERROR_MESSAGES.DEVICE_IMPORT.NOT_FOUND);

    if (ticket.inventoryStatus === 'completed') {
      throw new BadRequestException('Phiếu nhập đã hoàn tất kiểm kê trước đó.');
    }

    // 1. Kiểm tra số lượng
    if (ticket.serialImported < ticket.totalQuantity) {
      throw new BadRequestException(`Chưa đủ số lượng (${ticket.serialImported}/${ticket.totalQuantity}). Không thể hoàn tất.`);
    }

    // 2. Kiểm tra các phiên kiểm kê
    const sessions = await this.inventorySessionService.findAll({ importId: id });
    const hasPendingSession = sessions.some(s => s.status !== 'completed');
    if (hasPendingSession) {
      throw new BadRequestException('Tất cả các phiên kiểm kê phải được hoàn tất trước khi đóng phiếu nhập.');
    }

    // 3. Cập nhật trạng thái
    return this.deviceImportRepository.update(id, {
      inventoryStatus: 'completed',
      status: 'COMPLETED',
      updatedBy: userId
    } as any);
  }
}