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
import { ExportSessionService } from '../services/export-session.service';
import { CreateDeviceExportDto } from '../dto/create-device-export.dto';
import { CreateExportSessionDto } from '../dto/create-export-session.dto';

import { UpdateDeviceExportDto } from '../dto/update-device-export.dto';
import { DeviceExportPaginationDto } from '../dto/device-export-pagination.dto';
import { createFilterAndOptions } from '../../../utils/pick.util';

@Controller('device-exports')
export class DeviceExportController {
  constructor(
    private readonly deviceExportService: DeviceExportService,
    private readonly exportSessionService: ExportSessionService
  ) { }


  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDeviceExportDto: CreateDeviceExportDto) {
    return this.deviceExportService.create(createDeviceExportDto);
  }

  @Get()
  async findAll(@Query() query: DeviceExportPaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      ['totalItems', 'totalQuantity'],
      ['exportName', 'type', 'receiver', 'status'],
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
    const mockUser = { _id: '64b0f0f0f0f0f0f0f0f0f0f0', username: 'Manager', role: 'MANAGER' };
    return this.deviceExportService.approve(id, mockUser);
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.deviceExportService.reject(id, body.reason);
  }

  @Post(':id/confirm')
  async confirm(@Param('id') id: string) {
    return this.deviceExportService.confirm(id);
  }

  // === EXPORT SESSIONS ===

  @Get(':id/sessions')
  async getSessions(@Param('id') id: string) {
    return this.exportSessionService.getSessionsByExportId(id);
  }

  @Post('sessions')
  async createSession(@Body() dto: CreateExportSessionDto) {
    const mockUser = '64b0f0f0f0f0f0f0f0f0f0f0';
    return this.exportSessionService.create(dto, mockUser);
  }

  @Get('sessions/:id')
  async getSessionById(@Param('id') id: string) {
    return this.exportSessionService.findById(id);
  }

  @Post('sessions/:id/scan')
  async scanSerial(@Param('id') id: string, @Body() body: { serial: string }) {
    return this.exportSessionService.scanSerial(id, body.serial);
  }

  @Post('sessions/:id/scan-bulk')
  async scanBulk(@Param('id') id: string, @Body() body: { serials: string[] }) {
    return this.exportSessionService.scanBulk(id, body.serials);
  }

  @Delete('sessions/:id/items/:serial')
  async removeSerial(@Param('id') id: string, @Param('serial') serial: string) {
    return this.exportSessionService.removeSerial(id, serial);
  }

  @Post('sessions/:id/complete')
  async completeSession(@Param('id') id: string) {
    const mockUser = '64b0f0f0f0f0f0f0f0f0f0f0';
    return this.exportSessionService.completeSession(id, mockUser);
  }
}

