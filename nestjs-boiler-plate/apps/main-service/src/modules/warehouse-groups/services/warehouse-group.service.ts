import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { WarehouseGroupRepository } from '../repositories/warehouse-group.repository';
import { CreateWarehouseGroupDto } from '../dto/create-warehouse-group.dto';
import { UpdateWarehouseGroupDto } from '../dto/update-warehouse-group.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { WarehouseGroup } from '../schemas/warehouse-group.schemas';

@Injectable()
export class WarehouseGroupService {
  constructor(private readonly warehouseGroupRepository: WarehouseGroupRepository) { }

  async create(createWarehouseGroupDto: CreateWarehouseGroupDto): Promise<WarehouseGroup> {
    return this.warehouseGroupRepository.create(createWarehouseGroupDto);
  }

  async findAll(filter: any = {}): Promise<WarehouseGroup[]> {
    return this.warehouseGroupRepository.findAll(filter);
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<WarehouseGroup>> {
    return this.warehouseGroupRepository.findAllWithPagination(filter, options);
  }

  async findById(id: string): Promise<WarehouseGroup> {
    const warehousegroup = await this.warehouseGroupRepository.findById(id);
    if (!warehousegroup) {
      throw new NotFoundException('WarehouseGroup not found');
    }
    return warehousegroup;
  }

  async update(id: string, updateWarehouseGroupDto: UpdateWarehouseGroupDto): Promise<WarehouseGroup> {
    const warehousegroup = await this.warehouseGroupRepository.findById(id);
    if (!warehousegroup) {
      throw new NotFoundException('WarehouseGroup not found');
    }

    const updatedWarehouseGroup = await this.warehouseGroupRepository.update(id, updateWarehouseGroupDto);
    if (!updatedWarehouseGroup) {
      throw new BadRequestException('Failed to update warehousegroup');
    }

    return updatedWarehouseGroup;
  }

  async delete(id: string): Promise<WarehouseGroup> {
    const warehousegroup = await this.warehouseGroupRepository.findById(id);
    if (!warehousegroup) {
      throw new NotFoundException('WarehouseGroup not found');
    }

    const deletedWarehouseGroup = await this.warehouseGroupRepository.delete(id);
    if (!deletedWarehouseGroup) {
      throw new BadRequestException('Failed to delete warehousegroup');
    }

    return deletedWarehouseGroup;
  }
}
