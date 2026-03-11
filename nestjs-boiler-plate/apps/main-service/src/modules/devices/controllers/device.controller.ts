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
  Req,
  Patch,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Response, Request as ExpressRequest } from 'express';
import { DeviceQueryBuilder } from '../utils/device-query.builder';
import { DeviceService } from '../services/device.service';
import { UserService } from '../../../users/services/user.service';
import { DeviceStatsService } from '../services/device-stats.service';
import { DeviceTransferService } from '../services/device-transfer.service';
import { DeviceValidationService } from '../services/device-validation.service';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';
import { DevicePaginationDto } from '../dto/device-pagination.dto';
import { ValidateMacsDto, ValidateMacsResponse } from '../dto/validate-serials.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('devices')
export class DeviceController {
  constructor(
    private readonly deviceService: DeviceService,
    private readonly deviceStatsService: DeviceStatsService,
    private readonly deviceTransferService: DeviceTransferService,
    private readonly deviceValidationService: DeviceValidationService,
    private readonly userService: UserService,
    @InjectModel('DeviceImport') private readonly deviceImportModel: Model<any>,
    @InjectModel('DeviceExport') private readonly deviceExportModel: Model<any>,
  ) { }

  onModuleInit() {
    // Removed ModuleRef anti-pattern
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
    const filter = DeviceQueryBuilder.build(query);

    const buffer = await this.deviceService.exportExcel(filter);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=Danh_sach_thiet_bi_${Date.now()}.xlsx`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  // Resolve importCode → importId, exportCode → currentExportId từ raw query
  private async resolveCodeFilters(rawQuery: any): Promise<{ importId?: any; currentExportId?: any }> {
    const result: any = {};
    if (rawQuery.importCode) {
      const imports = await this.deviceImportModel.find({ code: { $regex: rawQuery.importCode, $options: 'i' } }, '_id').lean();
      result.importId = imports.length > 0
        ? { $in: imports.map((i: any) => i._id) }
        : '000000000000000000000000';
    }
    if (rawQuery.exportCode) {
      const exports = await this.deviceExportModel.find({ code: { $regex: rawQuery.exportCode, $options: 'i' } }, '_id').lean();
      result.currentExportId = exports.length > 0
        ? { $in: exports.map((e: any) => e._id) }
        : '000000000000000000000000';
    }
    return result;
  }

  @Get()
  async findAll(@Query() query: DevicePaginationDto, @Req() req: ExpressRequest) {
    const filter = { ...DeviceQueryBuilder.build(query), ...await this.resolveCodeFilters(req.query) };

    const options = {
      page: query.page || 1,
      limit: query.limit || 10,
      sortBy: query.sortBy || 'createdAt:desc',
      populate: query.populate || [
        { path: 'warehouseId', select: 'name code color icon' },
        { path: 'qcBy', select: 'name email' },
        {
          path: 'importId',
          select: 'code importDate createdBy',
          populate: { path: 'createdBy', select: 'name' }
        }
      ],
    };

    return this.deviceService.findAllWithPagination(filter, options);
  }

  @Get('stats')
  async getStatistics(@Query() query: DevicePaginationDto) {
    const filter = DeviceQueryBuilder.build(query);
    return this.deviceStatsService.getStatistics(filter);
  }

  @Get('iden/:iden/detail')
  async findByIdenWithDetail(@Param('iden') iden: string) {
    return this.deviceService.findByIdenWithDetail(iden);
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

  /**
   * API Chuyển kho (Transfer)
   * Method: PATCH /devices/:id/transfer
   * Body: { toWarehouseId: string, note?: string }
   */
  @Patch(':id/transfer')
  async transfer(
    @Param('id') id: string,
    @Body() body: { toWarehouseId: string; note?: string; errorReason?: string; defectReason?: string; originDeviceId?: string },
    @Request() req: any
  ) {
    if (!req.user) {
      throw new UnauthorizedException('Yêu cầu thông tin người dùng (User context required)');
    }
    const user = await this.userService.syncFromKeycloak(req.user);
    const userId = user._id.toString();

    return this.deviceTransferService.transfer(id, body.toWarehouseId, userId, body.note, body.errorReason, body.defectReason, body.originDeviceId);
  }

  @Get('stats/defect-rate')
  @ApiOperation({ summary: 'Thống kê tỷ lệ lỗi và tỷ trọng các nguyên nhân (Dashboard)' })
  async getDefectRateStats(@Query('importId') importId?: string) {
    return this.deviceService.getDefectRateStats(importId);
  }

  @Post('bulk-transfer')
  async bulkTransfer(
    @Body() body: { deviceIds: string[]; toWarehouseId: string; note?: string; errorReason?: string; defectReason?: string; originDeviceId?: string },
    @Request() req: any
  ) {
    if (!req.user) {
      throw new UnauthorizedException('Yêu cầu thông tin người dùng (User context required)');
    }
    const user = await this.userService.syncFromKeycloak(req.user);
    const userId = user._id.toString();

    return this.deviceTransferService.bulkTransfer(body.deviceIds, body.toWarehouseId, userId, body.note, body.errorReason, body.defectReason, body.originDeviceId);
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