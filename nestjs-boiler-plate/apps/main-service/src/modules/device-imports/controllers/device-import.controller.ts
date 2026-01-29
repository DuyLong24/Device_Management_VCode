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
  UseGuards
} from '@nestjs/common';
import { Unprotected, Roles } from 'nest-keycloak-connect';
import { DeviceImportService } from '../services/device-import.service';
import { UserService } from '../../../users/services/user.service';
import { CreateDeviceImportDto } from '../dto/create-device-import.dto';
import { UpdateDeviceImportDto } from '../dto/update-device-import.dto';
import { DeviceImportPaginationDto } from '../dto/device-import-pagination.dto';
import { createFilterAndOptions } from '../../../utils/pick.util';

@Controller('device-imports')
export class DeviceImportController {
  constructor(
    private readonly deviceImportService: DeviceImportService,
    private readonly userService: UserService
  ) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDeviceImportDto: CreateDeviceImportDto, @Request() req: any) {
    let userId = null;
    if (req.user) {
      const user = await this.userService.syncFromKeycloak(req.user);
      userId = user._id.toString();
    } else {
      userId = req.headers['x-auth-user'];
    }
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
    return this.deviceImportService.findAll(filter, options);
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
  async findById(@Param('id') id: string, @Query('populate') populate: string) {
    return this.deviceImportService.findById(id, { populate });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDeviceImportDto: UpdateDeviceImportDto,
    @Request() req: any
  ) {
    let userId = null;
    if (req.user) {
      const user = await this.userService.syncFromKeycloak(req.user);
      userId = user._id.toString();
    } else {
      userId = req.headers['x-auth-user'];
    }
    return this.deviceImportService.update(id, updateDeviceImportDto, userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.deviceImportService.delete(id);
  }

  @Post(':id/complete')
  @Roles({ roles: ['admin', 'Admin', 'super_admin', 'superadmin', 'Super admin'] })
  async complete(@Param('id') id: string, @Request() req: any) {
    let userId = null;
    if (req.user) {
      const user = await this.userService.syncFromKeycloak(req.user);
      userId = user._id.toString();
    } else {
      userId = req.headers['x-auth-user'];
    }
    return this.deviceImportService.complete(id, userId);
  }


}