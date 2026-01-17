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
  Res,
  Patch,
} from '@nestjs/common';
import { Response } from 'express';
import { DeviceService } from '../services/device.service';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';
import { DevicePaginationDto } from '../dto/device-pagination.dto';

@Controller('devices')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.deviceService.create(createDeviceDto);
  }

  @Get('export')
  async exportExcel(@Query() query: DevicePaginationDto, @Res() res: Response) {
    const filter = this.buildFilter(query);

    const buffer = await this.deviceService.exportExcel(filter);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=Danh_sach_thiet_bi_${Date.now()}.xlsx`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get()
  async findAll(@Query() query: DevicePaginationDto) {
    const filter = this.buildFilter(query);

    const options = {
      page: query.page || 1,
      limit: query.limit || 10,
      sortBy: query.sortBy || 'createdAt:desc',
      populate: query.populate || 'warehouseId', // Populate để lấy tên kho
    };

    return this.deviceService.findAllWithPagination(filter, options);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.deviceService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
    return this.deviceService.update(id, updateDeviceDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.deviceService.delete(id);
  }

  private buildFilter(query: DevicePaginationDto): any {
    const filter: any = {};

    // 1. Exact Match
    if (query.warehouseId) filter.warehouseId = query.warehouseId;
    if (query.categoryId) filter.categoryId = query.categoryId;
    if (query.importId) filter.importId = query.importId;

    // 2. Partial Match (Search fields)
    if (query.serial) filter.serial = { $regex: query.serial, $options: 'i' };
    if (query.name) filter.name = { $regex: query.name, $options: 'i' };
    if (query.model) filter.deviceModel = { $regex: query.model, $options: 'i' };

    // 3. Global Search (Priority)
    if (query.search) {
      const searchRegex = { $regex: query.search, $options: 'i' };
      const orConditions = [
        { serial: searchRegex },
        { name: searchRegex },
        { deviceModel: searchRegex }
      ];
      if (Object.keys(filter).length > 0) {
        filter.$or = orConditions;
      } else {
        Object.assign(filter, { $or: orConditions });
      }
    }

    // 4. Date Range
    if (query.createdFrom || query.createdTo) {
      filter.createdAt = {};
      if (query.createdFrom) filter.createdAt.$gte = new Date(query.createdFrom);
      if (query.createdTo) filter.createdAt.$lte = new Date(query.createdTo);
    }

    return filter;
  }

  /**
   * [NEW] API Chuyển kho (Transfer)
   * Method: PATCH /devices/:id/transfer
   * Body: { toWarehouseId: string, note?: string }
   */
  @Patch(':id/transfer')
  async transfer(
    @Param('id') id: string,
    @Body() body: { toWarehouseId: string; note?: string },
    // @User() user: any // Sau này sẽ lấy từ Token
  ) {
    // Tạm thời hardcode userId
    const userId = '69685cb83e015da83ef00a85';

    return this.deviceService.transfer(id, body.toWarehouseId, userId, body.note);
  }

  @Post('bulk-transfer')
  async bulkTransfer(
    @Body() body: { deviceIds: string[]; toWarehouseId: string; note?: string },
  ) {
    const userId = '69685cb83e015da83ef00a85'; // Hardcoded for now
    return this.deviceService.bulkTransfer(body.deviceIds, body.toWarehouseId, userId, body.note);
  }
}