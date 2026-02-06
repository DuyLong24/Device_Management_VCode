import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Patch,
  Delete,
  Param,
  HttpStatus,
  HttpCode,
  Request,
  UnauthorizedException,
  Res
} from '@nestjs/common';
import { Response } from 'express';
import { Roles } from 'nest-keycloak-connect';
import { DeviceExportService } from '../services/device-export.service';
import { ExportSessionService } from '../services/export-session.service';
import { ExportNotificationTask } from '../tasks/export-notification.task';
import { CreateDeviceExportDto } from '../dto/create-device-export.dto';
import { CreateExportSessionDto } from '../dto/create-export-session.dto';

import { UpdateDeviceExportDto } from '../dto/update-device-export.dto';
import { DeviceExportPaginationDto } from '../dto/device-export-pagination.dto';
import { createFilterAndOptions } from '../../../utils/pick.util';
import { UserService } from '../../../users/services/user.service';

@Controller('device-exports')
export class DeviceExportController {
  constructor(
    private readonly deviceExportService: DeviceExportService,
    private readonly exportSessionService: ExportSessionService,
    private readonly userService: UserService,
    private readonly exportNotificationTask: ExportNotificationTask
  ) { }


  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDeviceExportDto: CreateDeviceExportDto, @Request() req: any) {
    if (!req.user) {
      throw new UnauthorizedException('Yêu cầu thông tin người dùng (User context required)');
    }
    const user = await this.userService.syncFromKeycloak(req.user);
    const userId = user._id; // ObjectId

    // Attach createdBy (ensure DTO or Service handles it - DTO validation might strip it if not in DTO, but we can cast or update DTO)
    const dtoWithUser = { ...createDeviceExportDto, createdBy: userId };

    return this.deviceExportService.create(dtoWithUser as any);
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

  @Get('inventory-status')
  async getInventoryStatus(@Query('model') model: string) {
    if (!model) {
      throw new Error('Model is required');
    }
    return this.deviceExportService.getInventoryStatus(model);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.deviceExportService.findById(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDeviceExportDto: UpdateDeviceExportDto) {
    return this.deviceExportService.update(id, updateDeviceExportDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.deviceExportService.delete(id);
  }



  @Post(':id/submit')
  async submitForApproval(@Param('id') id: string) {
    return this.deviceExportService.submitForApproval(id);
  }

  @Post(':id/approve')
  @Roles({ roles: ['admin', 'Admin', 'super_admin', 'superadmin', 'Super admin'] })
  async approve(@Param('id') id: string, @Request() req: any) {
    if (!req.user) {
      throw new UnauthorizedException('Yêu cầu thông tin người dùng (User context required)');
    }
    const user = await this.userService.syncFromKeycloak(req.user);
    const userId = user._id.toString();
    const username = user.username || user.name;

    const userObj = {
      _id: userId,
      username: username,
      role: req.user?.realm_access?.roles?.some((r: string) => ['admin', 'super_admin'].includes(r.toLowerCase())) ? 'ADMIN' : 'USER'
    };
    return this.deviceExportService.approve(id, userObj);
  }

  @Post(':id/reject')
  @Roles({ roles: ['admin', 'Admin', 'super_admin', 'superadmin', 'Super admin'] })
  async reject(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.deviceExportService.reject(id, body.reason);
  }



  @Get(':id/export-excel')
  async exportExcel(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.deviceExportService.exportTicketExcel(id);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=Phieu_Xuat_${id}.xlsx`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  // === EXPORT SESSIONS ===

  @Get(':id/sessions')
  async getSessions(@Param('id') id: string) {
    return this.exportSessionService.getSessionsByExportId(id);
  }

  @Post('sessions')
  async createSession(@Body() dto: CreateExportSessionDto, @Request() req: any) {
    if (!req.user) {
      throw new UnauthorizedException('Yêu cầu thông tin người dùng (User context required)');
    }
    const user = await this.userService.syncFromKeycloak(req.user);
    const userId = user._id.toString();

    return this.exportSessionService.create(dto, userId);
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
  async completeSession(@Param('id') id: string, @Request() req: any) {
    if (!req.user) {
      throw new UnauthorizedException('Yêu cầu thông tin người dùng (User context required)');
    }
    const user = await this.userService.syncFromKeycloak(req.user);
    const userId = user._id.toString();

    return this.exportSessionService.completeSession(id, userId);
  }

  @Post('trigger-notifications')
  async triggerNotifications() {
    return this.exportNotificationTask.processAllNotifications();
  }
}

