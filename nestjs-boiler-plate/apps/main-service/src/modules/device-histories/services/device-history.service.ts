import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DeviceHistoryRepository } from '../repositories/device-history.repository';
import { CreateDeviceHistoryDto } from '../dto/create-device-history.dto';
import { UpdateDeviceHistoryDto } from '../dto/update-device-history.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { DeviceHistory } from '../schemas/device-history.schemas';

@Injectable()
export class DeviceHistoryService {
  constructor(private readonly deviceHistoryRepository: DeviceHistoryRepository) { }

  async create(createDeviceHistoryDto: CreateDeviceHistoryDto): Promise<DeviceHistory> {
    return this.deviceHistoryRepository.create(createDeviceHistoryDto);
  }

  async findAll(filter: any = {}): Promise<DeviceHistory[]> {
    return this.deviceHistoryRepository.findAll(filter);
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<DeviceHistory>> {
    return this.deviceHistoryRepository.findAllWithPagination(filter, options);
  }

  async findById(id: string): Promise<DeviceHistory> {
    const devicehistory = await this.deviceHistoryRepository.findById(id);
    if (!devicehistory) {
      throw new NotFoundException('DeviceHistory not found');
    }
    return devicehistory;
  }

  async update(id: string, updateDeviceHistoryDto: UpdateDeviceHistoryDto): Promise<DeviceHistory> {
    const devicehistory = await this.deviceHistoryRepository.findById(id);
    if (!devicehistory) {
      throw new NotFoundException('DeviceHistory not found');
    }

    const updatedDeviceHistory = await this.deviceHistoryRepository.update(id, updateDeviceHistoryDto);
    if (!updatedDeviceHistory) {
      throw new BadRequestException('Failed to update devicehistory');
    }

    return updatedDeviceHistory;
  }

  async delete(id: string): Promise<DeviceHistory> {
    const devicehistory = await this.deviceHistoryRepository.findById(id);
    if (!devicehistory) {
      throw new NotFoundException('DeviceHistory not found');
    }

    const deletedDeviceHistory = await this.deviceHistoryRepository.delete(id);
    if (!deletedDeviceHistory) {
      throw new BadRequestException('Failed to delete devicehistory');
    }

    return deletedDeviceHistory;
  }
}
