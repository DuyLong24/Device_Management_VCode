import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Warehouse, WarehouseModel } from "../schemas/warehouse.schemas";
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { FilterQuery } from 'mongoose';

@Injectable()
export class WarehouseRepository {
  constructor(@InjectModel(Warehouse.name) private warehouseModel: WarehouseModel) { }

  async create(createWarehouseDto: CreateWarehouseDto): Promise<Warehouse> {
    const warehouseData = { ...createWarehouseDto };
    return this.warehouseModel.create(warehouseData);
  }

  async findAll(filter: FilterQuery<Warehouse> = {}, options: any = {}): Promise<Warehouse[]> {
    const { sortBy, populate } = options;
    let query = this.warehouseModel.find(filter);

    if (sortBy) {
      const [field, order] = sortBy.split(':');
      query = query.sort({ [field]: order === 'desc' ? -1 : 1 });
    }

    if (populate) {
      query = query.populate(populate);
    }

    return query.exec();
  }

  async findOne(filter: FilterQuery<Warehouse>): Promise<Warehouse | null> {
    return this.warehouseModel.findOne(filter).exec();
  }

  async findAllWithPagination(filter: FilterQuery<Warehouse> = {}, options: any = {}): Promise<PaginateResult<Warehouse>> {
    const { page = 1, limit = 10, sortBy, populate } = options;

    const paginateOptions: any = {
      page: Number(page),
      limit: Number(limit),
      sort: sortBy || 'createdAt:desc',
      populate: populate
    };

    return this.warehouseModel.paginate(filter, paginateOptions);
  }

  async findById(id: string): Promise<Warehouse | null> {
    return this.warehouseModel.findById(id).exec();
  }

  async update(id: string, updateWarehouseDto: UpdateWarehouseDto): Promise<Warehouse | null> {
    const updateData = { ...updateWarehouseDto, updatedAt: new Date() };
    return this.warehouseModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async delete(id: string): Promise<Warehouse | null> {
    return this.warehouseModel.findByIdAndDelete(id).exec();
  }
}
