import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Device, DeviceModel } from '../schemas/device.schemas';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';

@Injectable()
export class DeviceRepository {
  constructor(@InjectModel(Device.name) private deviceModel: DeviceModel) { }

  async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
    const deviceData: any = { ...createDeviceDto };
    return this.deviceModel.create(deviceData);
  }

  async insertMany(devices: any[], options: any = {}): Promise<Device[]> {
    return this.deviceModel.insertMany(devices, options);
  }

  async bulkWrite(ops: any[], options: any = {}): Promise<any> {
    return this.deviceModel.bulkWrite(ops, options);
  }

  async findAll(filter: any = {}): Promise<Device[]> {
    return this.deviceModel.find(filter).exec();
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<Device>> {
    const { page = 1, limit = 10, sortBy, populate } = options;
    const paginateOptions: any = {
      page: Number(page),
      limit: Number(limit),
      sortBy: sortBy || 'createdAt:desc'
    };
    if (populate) {
      paginateOptions.populate = populate;
    }
    return this.deviceModel.paginate(filter, paginateOptions);
  }

  async findById(id: string): Promise<Device | null> {
    return this.deviceModel.findById(id).exec();
  }

  async update(id: string, updateDeviceDto: UpdateDeviceDto): Promise<Device | null> {
    const updateData: any = { ...updateDeviceDto };
    updateData.updatedAt = new Date();
    return this.deviceModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async delete(id: string): Promise<Device | null> {
    return this.deviceModel.findByIdAndDelete(id).exec();
  }
}