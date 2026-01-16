import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DeviceExport, DeviceExportModel } from '../schemas/device-export.schemas';
import { CreateDeviceExportDto } from '../dto/create-device-export.dto';
import { UpdateDeviceExportDto } from '../dto/update-device-export.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';

@Injectable()
export class DeviceExportRepository {
  constructor(@InjectModel(DeviceExport.name) private deviceexportModel: DeviceExportModel) { }

  async create(createDeviceExportDto: CreateDeviceExportDto): Promise<DeviceExport> {
    const deviceexportData: any = { ...createDeviceExportDto };

    return this.deviceexportModel.create(deviceexportData);
  }

  async findAll(filter: any = {}): Promise<DeviceExport[]> {
    return this.deviceexportModel.find(filter).exec();
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<DeviceExport>> {
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
    return this.deviceexportModel.paginate(filter, paginateOptions);
  }

  async findById(id: string): Promise<DeviceExport | null> {
    return this.deviceexportModel.findById(id).exec();
  }

  async update(id: string, updateDeviceExportDto: UpdateDeviceExportDto): Promise<DeviceExport | null> {
    const updateData: any = { ...updateDeviceExportDto };
    updateData.updatedAt = new Date();

    return this.deviceexportModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async delete(id: string): Promise<DeviceExport | null> {
    return this.deviceexportModel.findByIdAndDelete(id).exec();
  }
}
