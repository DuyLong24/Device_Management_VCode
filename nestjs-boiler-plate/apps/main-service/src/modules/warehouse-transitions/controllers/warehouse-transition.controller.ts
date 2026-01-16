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
import { WarehouseTransitionService } from '../services/warehouse-transition.service';
import { CreateWarehouseTransitionDto } from '../dto/create-warehouse-transition.dto';
import { UpdateWarehouseTransitionDto } from '../dto/update-warehouse-transition.dto';
import { WarehouseTransitionPaginationDto } from '../dto/warehouse-transition-pagination.dto';
import { createFilterAndOptions } from '../../../utils/pick.util';

@Controller('warehouse-transitions')
export class WarehouseTransitionController {
  constructor(private readonly warehouseTransitionService: WarehouseTransitionService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createWarehouseTransitionDto: CreateWarehouseTransitionDto) {
    return this.warehouseTransitionService.create(createWarehouseTransitionDto);
  }

  @Get()
  async findAll(@Query() query: WarehouseTransitionPaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      ['fromWarehouseId', 'toWarehouseId', 'isActive'], // Filter keys for exact match
      ['type'], // Search keys for regex search
      ['sortBy', 'limit', 'page', 'populate']
    );

    // Nếu có tham số phân trang, sử dụng phân trang
    if (query.page || query.limit) {
      return this.warehouseTransitionService.findAllWithPagination(filter, options);
    }
    // Nếu không, trả về tất cả với filter
    return this.warehouseTransitionService.findAll(filter);
  }

  @Get('paginated')
  async findAllPaginated(@Query() query: WarehouseTransitionPaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      ['fromWarehouseId', 'toWarehouseId', 'isActive'], // Filter keys for exact match
      ['type'], // Search keys for regex search
      ['sortBy', 'limit', 'page', 'populate']
    );

    return this.warehouseTransitionService.findAllWithPagination(filter, options);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.warehouseTransitionService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateWarehouseTransitionDto: UpdateWarehouseTransitionDto) {
    return this.warehouseTransitionService.update(id, updateWarehouseTransitionDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.warehouseTransitionService.delete(id);
  }
}
