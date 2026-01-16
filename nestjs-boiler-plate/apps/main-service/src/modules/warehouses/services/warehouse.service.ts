import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { Warehouse } from '../schemas/warehouse.schemas';

@Injectable()
export class WarehouseService {
  constructor(private readonly warehouseRepository: WarehouseRepository) { }

  async create(createWarehouseDto: CreateWarehouseDto): Promise<Warehouse> {
    return this.warehouseRepository.create(createWarehouseDto);
  }

  async findAll(filter: any = {}): Promise<Warehouse[]> {
    return this.warehouseRepository.findAll(filter);
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<Warehouse>> {
    return this.warehouseRepository.findAllWithPagination(filter, options);
  }

  async findById(id: string): Promise<Warehouse> {
    const warehouse = await this.warehouseRepository.findById(id);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }
    return warehouse;
  }

  async update(id: string, updateWarehouseDto: UpdateWarehouseDto): Promise<Warehouse> {
    const warehouse = await this.warehouseRepository.findById(id);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    const updatedWarehouse = await this.warehouseRepository.update(id, updateWarehouseDto);
    if (!updatedWarehouse) {
      throw new BadRequestException('Failed to update warehouse');
    }

    return updatedWarehouse;
  }

  async delete(id: string): Promise<Warehouse> {
    const warehouse = await this.warehouseRepository.findById(id);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    const deletedWarehouse = await this.warehouseRepository.delete(id);
    if (!deletedWarehouse) {
      throw new BadRequestException('Failed to delete warehouse');
    }

    return deletedWarehouse;
  }
}
