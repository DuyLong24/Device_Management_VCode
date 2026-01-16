import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DeviceExportRepository } from '../repositories/device-export.repository';
import { CreateDeviceExportDto } from '../dto/create-device-export.dto';
import { UpdateDeviceExportDto } from '../dto/update-device-export.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { DeviceExport } from '../schemas/device-export.schemas';
import { ERROR_MESSAGES } from 'apps/main-service/src/common/constants/messages.constants';
import { FilterQuery } from 'mongoose';

@Injectable()
export class DeviceExportService {
  constructor(private readonly deviceExportRepository: DeviceExportRepository) { }

  async create(createDeviceExportDto: CreateDeviceExportDto): Promise<DeviceExport> {
    try {
      return await this.deviceExportRepository.create(createDeviceExportDto);
    } catch (error) {
      throw new BadRequestException(ERROR_MESSAGES.DEVICE_EXPORT.CREATE_FAILED);
    }
  }

  async findAll(filter: FilterQuery<DeviceExport> = {}): Promise<DeviceExport[]> {
    return this.deviceExportRepository.findAll(filter);
  }

  async findAllWithPagination(filter: FilterQuery<DeviceExport> = {}, options: any = {}): Promise<PaginateResult<DeviceExport>> {
    return this.deviceExportRepository.findAllWithPagination(filter, options);
  }

  async findById(id: string): Promise<DeviceExport> {
    const deviceexport = await this.deviceExportRepository.findById(id);
    if (!deviceexport) {
      throw new NotFoundException(ERROR_MESSAGES.DEVICE_EXPORT.NOT_FOUND);
    }
    return deviceexport;
  }

  async update(id: string, updateDeviceExportDto: UpdateDeviceExportDto): Promise<DeviceExport> {
    const deviceexport = await this.deviceExportRepository.findById(id);
    if (!deviceexport) {
      throw new NotFoundException(ERROR_MESSAGES.DEVICE_EXPORT.NOT_FOUND);
    }

    const updatedDeviceExport = await this.deviceExportRepository.update(id, updateDeviceExportDto);
    if (!updatedDeviceExport) {
      throw new BadRequestException(ERROR_MESSAGES.DEVICE_EXPORT.UPDATE_FAILED);
    }

    return updatedDeviceExport;
  }

  async delete(id: string): Promise<DeviceExport> {
    const deviceexport = await this.deviceExportRepository.findById(id);
    if (!deviceexport) {
      throw new NotFoundException(ERROR_MESSAGES.DEVICE_EXPORT.NOT_FOUND);
    }

    const deletedDeviceExport = await this.deviceExportRepository.delete(id);
    if (!deletedDeviceExport) {
      throw new BadRequestException(ERROR_MESSAGES.DEVICE_EXPORT.DELETE_FAILED);
    }

    return deletedDeviceExport;
  }
}
