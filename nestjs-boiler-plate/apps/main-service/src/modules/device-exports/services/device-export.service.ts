import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DeviceExportRepository } from '../repositories/device-export.repository';
import { CreateDeviceExportDto } from '../dto/create-device-export.dto';
import { UpdateDeviceExportDto } from '../dto/update-device-export.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { DeviceExport } from '../schemas/device-export.schemas';

@Injectable()
export class DeviceExportService {
  constructor(private readonly deviceExportRepository: DeviceExportRepository) { }

  async create(createDeviceExportDto: CreateDeviceExportDto): Promise<DeviceExport> {
    return this.deviceExportRepository.create(createDeviceExportDto);
  }

  async findAll(filter: any = {}): Promise<DeviceExport[]> {
    return this.deviceExportRepository.findAll(filter);
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<DeviceExport>> {
    return this.deviceExportRepository.findAllWithPagination(filter, options);
  }

  async findById(id: string): Promise<DeviceExport> {
    const deviceexport = await this.deviceExportRepository.findById(id);
    if (!deviceexport) {
      throw new NotFoundException('DeviceExport not found');
    }
    return deviceexport;
  }

  async update(id: string, updateDeviceExportDto: UpdateDeviceExportDto): Promise<DeviceExport> {
    const deviceexport = await this.deviceExportRepository.findById(id);
    if (!deviceexport) {
      throw new NotFoundException('DeviceExport not found');
    }

    const updatedDeviceExport = await this.deviceExportRepository.update(id, updateDeviceExportDto);
    if (!updatedDeviceExport) {
      throw new BadRequestException('Failed to update deviceexport');
    }

    return updatedDeviceExport;
  }

  async delete(id: string): Promise<DeviceExport> {
    const deviceexport = await this.deviceExportRepository.findById(id);
    if (!deviceexport) {
      throw new NotFoundException('DeviceExport not found');
    }

    const deletedDeviceExport = await this.deviceExportRepository.delete(id);
    if (!deletedDeviceExport) {
      throw new BadRequestException('Failed to delete deviceexport');
    }

    return deletedDeviceExport;
  }
}
