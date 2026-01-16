import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DeviceHistory, DeviceHistoryModel } from '../schemas/device-history.schemas';
import { CreateDeviceHistoryDto } from '../dto/create-device-history.dto';
import { UpdateDeviceHistoryDto } from '../dto/update-device-history.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';

@Injectable()
export class DeviceHistoryRepository {
  constructor(@InjectModel(DeviceHistory.name) private devicehistoryModel: DeviceHistoryModel) { }

  async create(createDeviceHistoryDto: CreateDeviceHistoryDto): Promise<DeviceHistory> {
    const devicehistoryData: any = { ...createDeviceHistoryDto };

    return this.devicehistoryModel.create(devicehistoryData);
  }

  async findAll(filter: any = {}): Promise<DeviceHistory[]> {
    return this.devicehistoryModel.find(filter).exec();
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<DeviceHistory>> {
    const { page = 1, limit = 10, sortBy, populate } = options;

    // Build options for plugin
    const paginateOptions: any = {
      page: Number(page),
      limit: Number(limit),
      sortBy: sortBy || 'createdAt:desc'
    };

    if (populate) {
      paginateOptions.populate = populate;
    }

    // Use the paginate plugin
    return this.devicehistoryModel.paginate(filter, paginateOptions);
  }

  async findById(id: string): Promise<DeviceHistory | null> {
    return this.devicehistoryModel.findById(id).exec();
  }

  async update(id: string, updateDeviceHistoryDto: UpdateDeviceHistoryDto): Promise<DeviceHistory | null> {
    const updateData: any = { ...updateDeviceHistoryDto };
    updateData.updatedAt = new Date();

    return this.devicehistoryModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async delete(id: string): Promise<DeviceHistory | null> {
    return this.devicehistoryModel.findByIdAndDelete(id).exec();
  }
}
