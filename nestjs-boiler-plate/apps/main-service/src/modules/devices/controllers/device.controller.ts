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
  Request,
  UnauthorizedException,
  OnModuleInit
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Response } from 'express';
import { DeviceService } from '../services/device.service';
import { UserService } from '../../../users/services/user.service';
import { DeviceStatsService } from '../services/device-stats.service';
import { DeviceTransferService } from '../services/device-transfer.service';
import { DeviceValidationService } from '../services/device-validation.service';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';
import { DevicePaginationDto } from '../dto/device-pagination.dto';
import { ValidateMacsDto, ValidateMacsResponse } from '../dto/validate-serials.dto';
import { DeviceImportRepository } from '../../device-imports/repositories/device-import.repository';
import { DeviceExportRepository } from '../../device-exports/repositories/device-export.repository';

@Controller('devices')
export class DeviceController implements OnModuleInit {
  private deviceImportRepository: DeviceImportRepository;
  private deviceExportRepository: DeviceExportRepository;

  constructor(
    private readonly deviceService: DeviceService,
    private readonly deviceStatsService: DeviceStatsService,
    private readonly deviceTransferService: DeviceTransferService,
    private readonly deviceValidationService: DeviceValidationService,
    private readonly userService: UserService,
    private readonly moduleRef: ModuleRef
  ) { }

  onModuleInit() {
    this.deviceImportRepository = this.moduleRef.get(DeviceImportRepository, { strict: false });
    this.deviceExportRepository = this.moduleRef.get(DeviceExportRepository, { strict: false });
  }

  @Get('import-template')
  async getImportTemplate(@Res() res: Response) {
    const buffer = await this.deviceService.getImportTemplate();

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=Import_Template_${Date.now()}.xlsx`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.deviceService.create(createDeviceDto);
  }

  @Get('export')
  async exportExcel(@Query() query: DevicePaginationDto, @Res() res: Response) {
    const filter = await this.buildFilter(query);

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
    const filter = await this.buildFilter(query);

    const options = {
      page: query.page || 1,
      limit: query.limit || 10,
      sortBy: query.sortBy || 'createdAt:desc',
      populate: query.populate || 'warehouseId', // Populate để lấy tên kho
    };

    return this.deviceService.findAllWithPagination(filter, options);
  }

  @Get('stats')
  async getStatistics(@Query() query: DevicePaginationDto) {
    const filter = await this.buildFilter(query);
    return this.deviceStatsService.getStatistics(filter);
  }

  @Get('mac/:mac/detail')
  async findByMacWithDetail(@Param('mac') mac: string) {
    return this.deviceService.findByMacWithDetail(mac);
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

  private async buildFilter(query: DevicePaginationDto): Promise<any> {
    const filter: any = {};

    // 1. Lọc theo kho
    if (query.warehouseId) filter.warehouseId = query.warehouseId;
    if (query.categoryId) filter.categoryId = query.categoryId;
    if (query.importId) filter.importId = query.importId;

    // 2. Lọc theo mã serial, mã MAC, tên thiết bị, model
    if (query.serial) filter.serial = { $regex: query.serial, $options: 'i' };
    if (query.mac) {
      const macQuery = query.mac.trim();
      // Nếu query không có dấu cách, cho phép tìm kiếm với các dấu cách
      if (/^[a-fA-F0-9]+$/.test(macQuery)) {
        const fuzzyRegex = macQuery.split('').join('[:\\.-]?');
        filter.mac = { $regex: fuzzyRegex, $options: 'i' };
      } else {
        filter.mac = { $regex: macQuery, $options: 'i' };
      }
    }
    if (query.name) filter.name = { $regex: query.name, $options: 'i' };
    if (query.model) filter.deviceModel = { $regex: query.model, $options: 'i' };

    // 3. Lọc theo mã phiếu nhập/xuất
    if (query.importCode) {
      // Tìm import theo code
      const imports = await this.deviceImportRepository.findAll({ code: { $regex: query.importCode, $options: 'i' } });
      if (imports.length > 0) {
        filter.importId = { $in: imports.map(i => i._id) };
      } else {
        filter.importId = '000000000000000000000000'; // Force empty
      }
    }

    if (query.exportCode) {
      const exports = await this.deviceExportRepository.findAll({ code: { $regex: query.exportCode, $options: 'i' } });
      if (exports.length > 0) {
        filter.currentExportId = { $in: exports.map(e => e._id) };
      } else {
        filter.currentExportId = '000000000000000000000000'; // Force empty
      }
    }

    // 4. Lọc theo từ khóa (Global Search)
    if (query.search) {
      const searchStr = query.search.trim();
      const searchRegex = { $regex: searchStr, $options: 'i' };
      const orConditions: any[] = [
        { serial: searchRegex },
        { name: searchRegex },
        { deviceModel: searchRegex }
      ];

      // Tìm kiếm MAC theo định dạng fuzzy
      if (/^[a-fA-F0-9]+$/.test(searchStr)) {
        const fuzzyMacRegex = { $regex: searchStr.split('').join('[:\\.-]?'), $options: 'i' };
        orConditions.push({ mac: fuzzyMacRegex });
      } else {
        orConditions.push({ mac: searchRegex });
      }

      if (Object.keys(filter).length > 0) {
        filter.$or = orConditions;
      } else {
        Object.assign(filter, { $or: orConditions });
      }
    }

    // 5. Lọc theo ngày tạo
    if (query.createdFrom || query.createdTo) {
      filter.createdAt = {};
      if (query.createdFrom) filter.createdAt.$gte = new Date(query.createdFrom);
      if (query.createdTo) filter.createdAt.$lte = new Date(query.createdTo);
    }

    return filter;
  }

  /**
   * API Chuyển kho (Transfer)
   * Method: PATCH /devices/:id/transfer
   * Body: { toWarehouseId: string, note?: string }
   */
  @Patch(':id/transfer')
  async transfer(
    @Param('id') id: string,
    @Body() body: { toWarehouseId: string; note?: string; errorReason?: string },
    @Request() req: any
  ) {
    if (!req.user) {
      throw new UnauthorizedException('Yêu cầu thông tin người dùng (User context required)');
    }
    const user = await this.userService.syncFromKeycloak(req.user);
    const userId = user._id.toString();

    return this.deviceTransferService.transfer(id, body.toWarehouseId, userId, body.note, body.errorReason);
  }

  @Post('bulk-transfer')
  async bulkTransfer(
    @Body() body: { deviceIds: string[]; toWarehouseId: string; note?: string; errorReason?: string },
    @Request() req: any
  ) {
    if (!req.user) {
      throw new UnauthorizedException('Yêu cầu thông tin người dùng (User context required)');
    }
    const user = await this.userService.syncFromKeycloak(req.user);
    const userId = user._id.toString();

    return this.deviceTransferService.bulkTransfer(body.deviceIds, body.toWarehouseId, userId, body.note, body.errorReason);
  }

  @Post('validate-macs')
  @HttpCode(HttpStatus.OK)
  async validateMacs(
    @Body() dto: ValidateMacsDto
  ): Promise<ValidateMacsResponse> {
    return this.deviceValidationService.validateMacs(dto);
  }

  @Post('trigger-warranty-check')
  async triggerWarrantyCheck() {
    return this.deviceService.processWarrantyExpirationCheck();
  }
}