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
import { WarehouseGroupService } from '../services/warehouse-group.service';
import { CreateWarehouseGroupDto } from '../dto/create-warehouse-group.dto';
import { UpdateWarehouseGroupDto } from '../dto/update-warehouse-group.dto';
import { WarehouseGroupPaginationDto } from '../dto/warehouse-group-pagination.dto';
import { createFilterAndOptions } from '../../../utils/pick.util';

@Controller('warehouse-groups')
export class WarehouseGroupController {
  constructor(private readonly warehouseGroupService: WarehouseGroupService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createWarehouseGroupDto: CreateWarehouseGroupDto) {
    return this.warehouseGroupService.create(createWarehouseGroupDto);
  }

  @Get()
  async findAll(@Query() query: WarehouseGroupPaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      ['orderIndex', 'isActive'],
      ['name'],
      ['sortBy', 'limit', 'page', 'populate']
    );

    // Nếu có tham số phân trang, sử dụng phân trang
    if (query.page || query.limit) {
      return this.warehouseGroupService.findAllWithPagination(filter, options);
    }
    // Nếu không, trả về tất cả với filter
    return this.warehouseGroupService.findAll(filter);
  }

  @Get('paginated')
  async findAllPaginated(@Query() query: WarehouseGroupPaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      ['orderIndex', 'isActive'], // Filter keys for exact match
      ['name'], // Search keys for regex search
      ['sortBy', 'limit', 'page', 'populate']
    );

    return this.warehouseGroupService.findAllWithPagination(filter, options);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.warehouseGroupService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateWarehouseGroupDto: UpdateWarehouseGroupDto) {
    return this.warehouseGroupService.update(id, updateWarehouseGroupDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.warehouseGroupService.delete(id);
  }
}
