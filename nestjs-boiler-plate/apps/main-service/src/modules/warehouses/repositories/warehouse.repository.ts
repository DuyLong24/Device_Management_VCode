import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Warehouse, WarehouseModel } from "../schemas/warehouse.schemas";
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';

@Injectable()
export class WarehouseRepository {
  constructor(@InjectModel(Warehouse.name) private warehouseModel: WarehouseModel) { }

  async create(createWarehouseDto: CreateWarehouseDto): Promise<Warehouse> {
    const warehouseData: any = { ...createWarehouseDto };

    return this.warehouseModel.create(warehouseData);
  }

  async findAll(filter: any = {}): Promise<Warehouse[]> {
    return this.warehouseModel.find(filter).exec();
  }

  async findOne(filter: any): Promise<Warehouse | null> {
    return this.warehouseModel.findOne(filter).exec();
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<Warehouse>> {
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
    return this.warehouseModel.paginate(filter, paginateOptions);
  }

  async findById(id: string): Promise<Warehouse | null> {
    return this.warehouseModel.findById(id).exec();
  }

  async update(id: string, updateWarehouseDto: UpdateWarehouseDto): Promise<Warehouse | null> {
    const updateData: any = { ...updateWarehouseDto };
    updateData.updatedAt = new Date();

    return this.warehouseModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async delete(id: string): Promise<Warehouse | null> {
    return this.warehouseModel.findByIdAndDelete(id).exec();
  }
}
