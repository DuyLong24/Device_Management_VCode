import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DeviceImport, DeviceImportModel } from '../schemas/device-import.schemas';
import { CreateDeviceImportDto } from '../dto/create-device-import.dto';
import { UpdateDeviceImportDto } from '../dto/update-device-import.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';

@Injectable()
export class DeviceImportRepository {
  constructor(@InjectModel(DeviceImport.name) private deviceimportModel: DeviceImportModel) { }

  async create(createDeviceImportDto: CreateDeviceImportDto): Promise<DeviceImport> {
    const deviceimportData: any = { ...createDeviceImportDto };

    return this.deviceimportModel.create(deviceimportData);
  }

  async findAll(filter: any = {}): Promise<DeviceImport[]> {
    return this.deviceimportModel.find(filter).exec();
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<DeviceImport>> {
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
    return this.deviceimportModel.paginate(filter, paginateOptions);
  }

  async findById(id: string): Promise<DeviceImport | null> {
    return this.deviceimportModel.findById(id).exec();
  }

  async update(id: string, updateDeviceImportDto: UpdateDeviceImportDto): Promise<DeviceImport | null> {
    const updateData: any = { ...updateDeviceImportDto };
    updateData.updatedAt = new Date();

    return this.deviceimportModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async delete(id: string): Promise<DeviceImport | null> {
    return this.deviceimportModel.findByIdAndDelete(id).exec();
  }
}
