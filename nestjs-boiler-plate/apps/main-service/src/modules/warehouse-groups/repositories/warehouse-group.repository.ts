import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { WarehouseGroup, WarehouseGroupModel } from '../schemas/warehouse-group.schemas';
import { CreateWarehouseGroupDto } from '../dto/create-warehouse-group.dto';
import { UpdateWarehouseGroupDto } from '../dto/update-warehouse-group.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';

@Injectable()
export class WarehouseGroupRepository {
  constructor(@InjectModel(WarehouseGroup.name) private warehousegroupModel: WarehouseGroupModel) { }

  async create(createWarehouseGroupDto: CreateWarehouseGroupDto): Promise<WarehouseGroup> {
    const warehousegroupData: any = { ...createWarehouseGroupDto };

    return this.warehousegroupModel.create(warehousegroupData);
  }

  async findAll(filter: any = {}): Promise<WarehouseGroup[]> {
    return this.warehousegroupModel.find(filter).exec();
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<WarehouseGroup>> {
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
    return this.warehousegroupModel.paginate(filter, paginateOptions);
  }

  async findById(id: string): Promise<WarehouseGroup | null> {
    return this.warehousegroupModel.findById(id).exec();
  }

  async update(id: string, updateWarehouseGroupDto: UpdateWarehouseGroupDto): Promise<WarehouseGroup | null> {
    const updateData: any = { ...updateWarehouseGroupDto };
    updateData.updatedAt = new Date();

    return this.warehousegroupModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async delete(id: string): Promise<WarehouseGroup | null> {
    return this.warehousegroupModel.findByIdAndDelete(id).exec();
  }
}
