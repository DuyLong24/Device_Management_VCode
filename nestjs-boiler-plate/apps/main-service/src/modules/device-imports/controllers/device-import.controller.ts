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
  HttpCode,
  Request,
  UseGuards
} from '@nestjs/common';
import { DeviceImportService } from '../services/device-import.service';
import { CreateDeviceImportDto } from '../dto/create-device-import.dto';
import { UpdateDeviceImportDto } from '../dto/update-device-import.dto';
import { DeviceImportPaginationDto } from '../dto/device-import-pagination.dto';
import { createFilterAndOptions } from '../../../utils/pick.util';

@Controller('device-imports')
export class DeviceImportController {
  constructor(private readonly deviceImportService: DeviceImportService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDeviceImportDto: CreateDeviceImportDto, @Request() req: any) {
    const userId = req.user?.id || req.user?.sub || req.headers['x-auth-user'] || null;
    return this.deviceImportService.create(createDeviceImportDto, userId);
  }

  @Get()
  async findAll(@Query() query: DeviceImportPaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      ['importDate', 'handoverPerson'],
      ['code', 'supplierId', 'status', 'origin'],
      ['sortBy', 'limit', 'page', 'populate']
    );

    if (query.page || query.limit) {
      return this.deviceImportService.findAllWithPagination(filter, options);
    }
    return this.deviceImportService.findAll(filter);
  }

  @Get('paginated')
  async findAllPaginated(@Query() query: DeviceImportPaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      ['importDate', 'handoverPerson'],
      ['code', 'supplierId', 'status', 'origin'],
      ['sortBy', 'limit', 'page', 'populate']
    );
    return this.deviceImportService.findAllWithPagination(filter, options);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.deviceImportService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDeviceImportDto: UpdateDeviceImportDto,
    @Request() req: any
  ) {
    const userId = req.user?.id || req.user?.sub || req.headers['x-auth-user'] || 'system';
    return this.deviceImportService.update(id, updateDeviceImportDto, userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.deviceImportService.delete(id);
  }
}