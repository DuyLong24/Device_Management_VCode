import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Put,
  Delete,
  Param,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { WarehouseService } from '../services/warehouse.service';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
import { WarehousePaginationDto } from '../dto/warehouse-pagination.dto';
import { createFilterAndOptions } from '../../../utils/pick.util';

@Controller('warehouses')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createWarehouseDto: CreateWarehouseDto) {
    return this.warehouseService.create(createWarehouseDto);
  }

  @Get()
  async findAll(@Query() query: WarehousePaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      ['groupId', 'orderIndex'], // Filter keys for exact match
      ['name', 'code', 'color', 'icon'], // Search keys for regex search
      ['sortBy', 'limit', 'page', 'populate']
    );

    // Nếu có tham số phân trang, sử dụng phân trang
    if (query.page || query.limit) {
      return this.warehouseService.findAllWithPagination(filter, options);
    }
    // Nếu không, trả về tất cả với filter
    return this.warehouseService.findAll(filter);
  }

  @Get('paginated')
  async findAllPaginated(@Query() query: WarehousePaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      ['groupId', 'orderIndex'], // Filter keys for exact match
      ['name', 'code', 'color', 'icon'], // Search keys for regex search
      ['sortBy', 'limit', 'page', 'populate']
    );

    return this.warehouseService.findAllWithPagination(filter, options);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.warehouseService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateWarehouseDto: UpdateWarehouseDto) {
    return this.warehouseService.update(id, updateWarehouseDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.warehouseService.delete(id);
  }
}
