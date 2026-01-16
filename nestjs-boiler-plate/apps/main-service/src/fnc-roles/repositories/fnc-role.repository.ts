import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FncRole, FncRoleModel } from '../entities/fnc-role.entity';
import { CreateFncRoleDto } from '../dto/create-fnc-role.dto';
import { UpdateFncRoleDto } from '../dto/update-fnc-role.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';

@Injectable()
export class FncRoleRepository {
  constructor(@InjectModel(FncRole.name) private fncroleModel: FncRoleModel) {}

  async create(createFncRoleDto: CreateFncRoleDto): Promise<FncRole> {
    const fncroleData: any = { ...createFncRoleDto };
    
    return this.fncroleModel.create(fncroleData);
  }

  async findAll(filter: any = {}): Promise<FncRole[]> {
    return this.fncroleModel.find(filter).exec();
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<FncRole>> {
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
    return this.fncroleModel.paginate(filter, paginateOptions);
  }

  async findById(id: string): Promise<FncRole | null> {
    return this.fncroleModel.findById(id).exec();
  }

  async update(id: string, updateFncRoleDto: UpdateFncRoleDto): Promise<FncRole | null> {
    const updateData: any = { ...updateFncRoleDto };
    updateData.updatedAt = new Date();
    
    return this.fncroleModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async delete(id: string): Promise<FncRole | null> {
    return this.fncroleModel.findByIdAndDelete(id).exec();
  }
}
