import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { WarehouseTransition, WarehouseTransitionModel } from '../schemas/warehouse-transition.schemas';
import { CreateWarehouseTransitionDto } from '../dto/create-warehouse-transition.dto';
import { UpdateWarehouseTransitionDto } from '../dto/update-warehouse-transition.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';

@Injectable()
export class WarehouseTransitionRepository {
  constructor(@InjectModel(WarehouseTransition.name) private warehousetransitionModel: WarehouseTransitionModel) { }

  async create(createWarehouseTransitionDto: CreateWarehouseTransitionDto): Promise<WarehouseTransition> {
    const warehousetransitionData: any = { ...createWarehouseTransitionDto };

    return this.warehousetransitionModel.create(warehousetransitionData);
  }

  async findAll(filter: any = {}): Promise<WarehouseTransition[]> {
    return this.warehousetransitionModel.find(filter).exec();
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<WarehouseTransition>> {
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
    return this.warehousetransitionModel.paginate(filter, paginateOptions);
  }

  async findById(id: string): Promise<WarehouseTransition | null> {
    return this.warehousetransitionModel.findById(id).exec();
  }

  async update(id: string, updateWarehouseTransitionDto: UpdateWarehouseTransitionDto): Promise<WarehouseTransition | null> {
    const updateData: any = { ...updateWarehouseTransitionDto };
    updateData.updatedAt = new Date();

    return this.warehousetransitionModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async delete(id: string): Promise<WarehouseTransition | null> {
    return this.warehousetransitionModel.findByIdAndDelete(id).exec();
  }
}
