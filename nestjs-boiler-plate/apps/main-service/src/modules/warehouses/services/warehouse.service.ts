import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { Warehouse } from '../schemas/warehouse.schemas';
import { ERROR_MESSAGES } from 'apps/main-service/src/common/constants/messages.constants';
import { FilterQuery } from 'mongoose';

@Injectable()
export class WarehouseService {
  constructor(private readonly warehouseRepository: WarehouseRepository) { }

  async create(createWarehouseDto: CreateWarehouseDto): Promise<Warehouse> {
    try {
      return await this.warehouseRepository.create(createWarehouseDto);
    } catch (error) {
      throw new BadRequestException(ERROR_MESSAGES.WAREHOUSE.CREATE_FAILED);
    }
  }

  async findAll(filter: FilterQuery<Warehouse> = {}, options: any = {}): Promise<Warehouse[]> {
    return this.warehouseRepository.findAll(filter, options);
  }

  async findAllWithPagination(filter: FilterQuery<Warehouse> = {}, options: any = {}): Promise<PaginateResult<Warehouse>> {
    return this.warehouseRepository.findAllWithPagination(filter, options);
  }

  async findById(id: string): Promise<Warehouse> {
    const warehouse = await this.warehouseRepository.findById(id);
    if (!warehouse) {
      throw new NotFoundException(ERROR_MESSAGES.WAREHOUSE.NOT_FOUND);
    }
    return warehouse;
  }

  async findByCode(code: string): Promise<Warehouse | null> {
    const warehouses = await this.warehouseRepository.findAll({ code });
    return warehouses.length > 0 ? warehouses[0] : null;
  }

  async update(id: string, updateWarehouseDto: UpdateWarehouseDto): Promise<Warehouse> {
    const warehouse = await this.warehouseRepository.findById(id);
    if (!warehouse) {
      throw new NotFoundException(ERROR_MESSAGES.WAREHOUSE.NOT_FOUND);
    }

    const updatedWarehouse = await this.warehouseRepository.update(id, updateWarehouseDto);
    if (!updatedWarehouse) {
      throw new BadRequestException(ERROR_MESSAGES.WAREHOUSE.UPDATE_FAILED);
    }

    return updatedWarehouse;
  }

  async delete(id: string): Promise<Warehouse> {
    const warehouse = await this.warehouseRepository.findById(id);
    if (!warehouse) {
      throw new NotFoundException(ERROR_MESSAGES.WAREHOUSE.NOT_FOUND);
    }

    const deletedWarehouse = await this.warehouseRepository.delete(id);
    if (!deletedWarehouse) {
      throw new BadRequestException(ERROR_MESSAGES.WAREHOUSE.DELETE_FAILED);
    }

    return deletedWarehouse;
  }
}
