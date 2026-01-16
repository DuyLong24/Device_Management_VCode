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
import { DeviceHistoryService } from '../services/device-history.service';
import { CreateDeviceHistoryDto } from '../dto/create-device-history.dto';
import { UpdateDeviceHistoryDto } from '../dto/update-device-history.dto';
import { DeviceHistoryPaginationDto } from '../dto/device-history-pagination.dto';
import { createFilterAndOptions } from '../../../utils/pick.util';

@Controller('device-historys')
export class DeviceHistoryController {
  constructor(private readonly deviceHistoryService: DeviceHistoryService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDeviceHistoryDto: CreateDeviceHistoryDto) {
    return this.deviceHistoryService.create(createDeviceHistoryDto);
  }

  @Get()
  async findAll(@Query() query: DeviceHistoryPaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      ['deviceId', 'fromWarehouseId', 'toWarehouseId', 'actorId'], // Filter keys for exact match
      ['action', 'note'], // Search keys for regex search
      ['sortBy', 'limit', 'page', 'populate']
    );

    // Nếu có tham số phân trang, sử dụng phân trang
    if (query.page || query.limit) {
      return this.deviceHistoryService.findAllWithPagination(filter, options);
    }
    // Nếu không, trả về tất cả với filter
    return this.deviceHistoryService.findAll(filter);
  }

  @Get('paginated')
  async findAllPaginated(@Query() query: DeviceHistoryPaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      ['deviceId', 'fromWarehouseId', 'toWarehouseId', 'actorId'], // Filter keys for exact match
      ['action', 'note'], // Search keys for regex search
      ['sortBy', 'limit', 'page', 'populate']
    );

    return this.deviceHistoryService.findAllWithPagination(filter, options);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.deviceHistoryService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDeviceHistoryDto: UpdateDeviceHistoryDto) {
    return this.deviceHistoryService.update(id, updateDeviceHistoryDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.deviceHistoryService.delete(id);
  }
}
