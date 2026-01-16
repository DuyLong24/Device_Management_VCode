import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { WarehouseTransitionRepository } from '../repositories/warehouse-transition.repository';
import { CreateWarehouseTransitionDto } from '../dto/create-warehouse-transition.dto';
import { UpdateWarehouseTransitionDto } from '../dto/update-warehouse-transition.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { WarehouseTransition } from '../schemas/warehouse-transition.schemas';

@Injectable()
export class WarehouseTransitionService {
  constructor(private readonly warehouseTransitionRepository: WarehouseTransitionRepository) { }

  async create(createWarehouseTransitionDto: CreateWarehouseTransitionDto): Promise<WarehouseTransition> {
    return this.warehouseTransitionRepository.create(createWarehouseTransitionDto);
  }

  async findAll(filter: any = {}): Promise<WarehouseTransition[]> {
    return this.warehouseTransitionRepository.findAll(filter);
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<WarehouseTransition>> {
    return this.warehouseTransitionRepository.findAllWithPagination(filter, options);
  }

  async findById(id: string): Promise<WarehouseTransition> {
    const warehousetransition = await this.warehouseTransitionRepository.findById(id);
    if (!warehousetransition) {
      throw new NotFoundException('WarehouseTransition not found');
    }
    return warehousetransition;
  }

  async update(id: string, updateWarehouseTransitionDto: UpdateWarehouseTransitionDto): Promise<WarehouseTransition> {
    const warehousetransition = await this.warehouseTransitionRepository.findById(id);
    if (!warehousetransition) {
      throw new NotFoundException('WarehouseTransition not found');
    }

    const updatedWarehouseTransition = await this.warehouseTransitionRepository.update(id, updateWarehouseTransitionDto);
    if (!updatedWarehouseTransition) {
      throw new BadRequestException('Failed to update warehousetransition');
    }

    return updatedWarehouseTransition;
  }

  async delete(id: string): Promise<WarehouseTransition> {
    const warehousetransition = await this.warehouseTransitionRepository.findById(id);
    if (!warehousetransition) {
      throw new NotFoundException('WarehouseTransition not found');
    }

    const deletedWarehouseTransition = await this.warehouseTransitionRepository.delete(id);
    if (!deletedWarehouseTransition) {
      throw new BadRequestException('Failed to delete warehousetransition');
    }

    return deletedWarehouseTransition;
  }
}
