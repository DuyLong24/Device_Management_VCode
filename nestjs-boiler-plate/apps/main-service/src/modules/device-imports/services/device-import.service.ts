import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DeviceImportRepository } from '../repositories/device-import.repository';
import { CreateDeviceImportDto } from '../dto/create-device-import.dto';
import { UpdateDeviceImportDto } from '../dto/update-device-import.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { DeviceImport } from '../schemas/device-import.schemas';
import { DeviceService } from '../../devices/services/device.service';

@Injectable()
export class DeviceImportService {
  constructor(
    private readonly deviceImportRepository: DeviceImportRepository,
    private readonly deviceService: DeviceService,
  ) { }

  async create(createDto: CreateDeviceImportDto, userId: string): Promise<DeviceImport> {
    // Kiểm tra Serial trước khi tạo mới -> Chỉ check kỹ khi trạng thái là PENDING (Lưu chính thức)
    if (createDto.status === 'PENDING') {
      const products = createDto.products || [];
      for (const product of products) {
        const p: any = product;
        const serials = p.expectedSerials || [];

        // 1. Check khớp số lượng
        // Nếu đã nhập serial (>0) thì bắt buộc phải nhập ĐỦ bằng quantity
        if (serials.length > 0 && serials.length !== p.quantity) {
          throw new BadRequestException(
            `Sản phẩm ${p.productCode}: Số lượng Serial khai báo (${serials.length}) không khớp với số lượng nhập (${p.quantity})`
          );
        }

        // 2. Check trùng lặp nội bộ
        if (serials.length > 0) {
          const unique = new Set(serials);
          if (unique.size !== serials.length) {
            throw new BadRequestException(
              `Sản phẩm ${p.productCode}: Danh sách Serial có chứa mã trùng lặp`
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

  async findAll(filter: any = {}): Promise<DeviceImport[]> {
    return this.deviceImportRepository.findAll(filter);
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<DeviceImport>> {
    return this.deviceImportRepository.findAllWithPagination(filter, options);
  }

  async findById(id: string): Promise<DeviceImport> {
    const deviceimport = await this.deviceImportRepository.findById(id);
    if (!deviceimport) {
      throw new NotFoundException('Không tìm thấy phiếu nhập thiết bị');
    }
    return deviceimport;
  }

  async update(id: string, updateDto: UpdateDeviceImportDto, userId: string): Promise<DeviceImport> {
    const existing = await this.findById(id);

    // Chỉ cho sửa khi đang DRAFT
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Chỉ được sửa các phiếu ở trạng thái DRAFT (nháp)');
    }

    let updateData: any = {
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

    return updated;
  }

  async delete(id: string): Promise<DeviceImport> {
    const existing = await this.findById(id);

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Chỉ được xóa các phiếu ở trạng thái DRAFT (nháp)');
    }

    const deleted = await this.deviceImportRepository.delete(id);
    if (!deleted) {
      throw new BadRequestException('Xóa phiếu không thành công');
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

  async updateProgress(id: string, data: { serialImported: number }) {
    const ticket = await this.findById(id);
    let newStatus = ticket.inventoryStatus;

    // 1. Tính toán trạng thái kiểm kê dựa trên số lượng đã quét
    if (data.serialImported > 0 && data.serialImported < ticket.totalQuantity) {
      newStatus = 'in-progress';
    } else if (data.serialImported >= ticket.totalQuantity) {
      newStatus = 'completed';
    }

    const updatePayload: any = {
      serialImported: data.serialImported,
      inventoryStatus: newStatus
    };

    // Nếu kiểm kê xong (completed) -> Update luôn trạng thái phiếu (status) thành COMPLETED
    if (newStatus === 'completed') {
      updatePayload.status = 'COMPLETED';
    }
    // Nếu đang làm dở -> Update trạng thái phiếu thành IN_PROGRESS (để không còn là PENDING/DRAFT)
    else if (newStatus === 'in-progress') {
      updatePayload.status = 'IN_PROGRESS';
    }

    return this.deviceImportRepository.update(id, updatePayload);
  }
}