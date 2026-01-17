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
import { DeviceExportService } from '../services/device-export.service';
import { CreateDeviceExportDto } from '../dto/create-device-export.dto';
import { UpdateDeviceExportDto } from '../dto/update-device-export.dto';
import { DeviceExportPaginationDto } from '../dto/device-export-pagination.dto';
import { createFilterAndOptions } from '../../../utils/pick.util';

@Controller('device-exports')
export class DeviceExportController {
  constructor(private readonly deviceExportService: DeviceExportService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDeviceExportDto: CreateDeviceExportDto) {
    return this.deviceExportService.create(createDeviceExportDto);
  }

  @Get()
  async findAll(@Query() query: DeviceExportPaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      ['totalItems', 'totalQuantity'], // Filter keys for exact match
      ['exportName', 'type', 'receiver', 'status'], // Search keys for regex search
      ['sortBy', 'limit', 'page', 'populate']
    );

    // Nếu có tham số phân trang, sử dụng phân trang
    if (query.page || query.limit) {
      return this.deviceExportService.findAllWithPagination(filter, options);
    }
    // Nếu không, trả về tất cả với filter
    return this.deviceExportService.findAll(filter);
  }

  @Get('paginated')
  async findAllPaginated(@Query() query: DeviceExportPaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      ['totalItems', 'totalQuantity'], // Filter keys for exact match
      ['exportName', 'type', 'receiver', 'status'], // Search keys for regex search
      ['sortBy', 'limit', 'page', 'populate']
    );

    return this.deviceExportService.findAllWithPagination(filter, options);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.deviceExportService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDeviceExportDto: UpdateDeviceExportDto) {
    return this.deviceExportService.update(id, updateDeviceExportDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.deviceExportService.delete(id);
  }
  @Post(':id/items')
  async addItems(@Param('id') id: string, @Body() body: { serials: string[] }) {
    return this.deviceExportService.addItems(id, body.serials);
  }

  @Post(':id/submit')
  async submitForApproval(@Param('id') id: string) {
    return this.deviceExportService.submitForApproval(id);
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string) {
    // TODO: Get user from request
    return this.deviceExportService.approve(id, { _id: 'mock-admin-id', username: 'Admin' });
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.deviceExportService.reject(id, body.reason);
  }

  @Post(':id/confirm')
  async confirm(@Param('id') id: string) {
    return this.deviceExportService.confirm(id);
  }
}
