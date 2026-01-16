import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DeviceRepository } from '../repositories/device.repository';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { Device, DeviceModel } from '../schemas/device.schemas';
import { InjectModel } from '@nestjs/mongoose';
import { ExcelService } from 'apps/main-service/src/common/excel/excel.service';
import { ExcelColumn } from 'apps/main-service/src/common/excel/interfaces/excel-column.interface';
import { WarehouseTransition } from '../../warehouse-transitions/schemas/warehouse-transition.schemas';
import { DeviceHistory } from '../../device-histories/schemas/device-history.schemas';
import { Model } from 'mongoose';

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

  async insertMany(devices: any[], options: any = {}): Promise<Device[]> {
    return this.deviceRepository.insertMany(devices, options);
  }

  async findAll(filter: any = {}): Promise<Device[]> {
    return this.deviceRepository.findAll(filter);
  }

  // async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<Device>> {
  //   return this.deviceRepository.findAllWithPagination(filter, options);
  // }

  async findAllWithPagination(filter: any, options: any) {
    return this.deviceModel.paginate(filter, options);
  }

  async findById(id: string): Promise<Device> {
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    return device;
  }

  async update(id: string, updateDeviceDto: UpdateDeviceDto): Promise<Device> {
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    const updatedDevice = await this.deviceRepository.update(id, updateDeviceDto);
    if (!updatedDevice) {
      throw new BadRequestException('Failed to update device');
    }
    return updatedDevice;
  }

  async delete(id: string): Promise<Device> {
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    const deletedDevice = await this.deviceRepository.delete(id);
    if (!deletedDevice) {
      throw new BadRequestException('Failed to delete device');
    }
    return deletedDevice;
  }

  async exportExcel(filter: any): Promise<Buffer> {
    // 1. Lấy dữ liệu (Populate kho để lấy tên)
    const devices = await this.deviceModel
      .find(filter)
      .populate('warehouseId', 'name') // Lấy tên kho
      .sort({ createdAt: -1 })
      .exec();

    // 2. Định nghĩa Cột (Config)
    const columns: ExcelColumn[] = [
      {
        header: 'STT',
        key: 'index',
        width: 8,
        alignment: 'center',
        format: (val, row, index) => index || 0 // Lấy index từ loop
      },
      { header: 'Serial', key: 'serial', width: 20 },
      { header: 'Tên thiết bị', key: 'name', width: 30 },
      { header: 'Model', key: 'deviceModel', width: 20 },
      {
        header: 'Kho hiện tại',
        key: 'warehouseId.name',
        width: 25
      },
      {
        header: 'Trạng thái',
        key: 'status',
        width: 15,
        alignment: 'center',
        format: (val, row) => {
          const status = row.qcStatus || row.status; // Ưu tiên qcStatus
          const map: Record<string, string> = {
            'PENDING': 'Chờ QC',
            'PENDING_QC': 'Chờ QC',
            'READY_TO_EXPORT': 'Sẵn sàng xuất',
            'PASS': 'Sẵn sàng xuất',
            'DEFECT': 'Lỗi',
            'IN_WARRANTY': 'Đang bảo hành',
            'SOLD': 'Đã bán'
          };
          return map[status] || status || '';
        }
      },
      {
        header: 'Ngày nhập',
        key: 'importDate',
        width: 15,
        alignment: 'center',
        format: (val, row) => {
          const finalDate = val || row.createdAt;

          if (!finalDate) return '';

          const date = new Date(finalDate);
          return isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN');
        }
      }
    ];

    return this.excelService.exportTableData(devices, columns, 'Danh sách thiết bị');
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
      throw new NotFoundException('Device not found');
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
      throw new BadRequestException(
        `Lỗi: Không thể chuyển từ kho ${fromWarehouseId} sang ${toWarehouseId}`
      );
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
      note: note || 'Chuyển kho thủ công',
      createdAt: new Date()
    });

    return savedDevice;
  }
}