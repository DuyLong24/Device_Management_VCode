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
    return this.deviceexportModel.find(filter)
      .populate('createdBy', 'name username email')
      .populate('approvedBy', 'name username email')
      .populate('assignedApprover', 'name username email')
      .exec();
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<DeviceExport>> {
    const { page = 1, limit = 10, sortBy, populate } = options;

    // Build options for plugin
    const paginateOptions: any = {
      page: Number(page),
      limit: Number(limit),
      sortBy: sortBy || 'createdAt:desc',
      populate: populate || [
        { path: 'approvedBy', select: 'name username email' },
        { path: 'createdBy', select: 'name username email' },
        { path: 'assignedApprover', select: 'name username email' }
      ]
    };

    // Use the paginate plugin
    return this.deviceexportModel.paginate(filter, paginateOptions);
  }

  async findById(id: string, populates: any[] = []): Promise<DeviceExport | null> {
    let query = this.deviceexportModel.findById(id)
      .populate('createdBy', 'name username email')
      .populate('approvedBy', 'name username email')
      .populate('confirmedBy', 'name username email')
      .populate('assignedApprover', 'name username email');

    if (populates.length > 0) {
      populates.forEach(p => {
        (query as any) = query.populate(p);
      });
    }

    return query.exec();
  }

  async update(id: string, updateDeviceExportDto: UpdateDeviceExportDto): Promise<DeviceExport | null> {
    const updateData: any = { ...updateDeviceExportDto };
    updateData.updatedAt = new Date();

    return this.deviceexportModel.findByIdAndUpdate(id, updateData, { new: true }).exec() as Promise<DeviceExport | null>;
  }

  async delete(id: string): Promise<DeviceExport | null> {
    return this.deviceexportModel.findByIdAndDelete(id).exec();
  }
}
