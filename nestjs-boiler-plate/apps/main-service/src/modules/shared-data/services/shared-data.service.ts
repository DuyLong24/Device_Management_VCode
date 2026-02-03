
import { Injectable } from '@nestjs/common';
import { SharedDataRepository } from '../repositories/shared-data.repository';
import { CreateSharedDataDto, CreateSharedDataGroupDto } from '../dto/create-shared-data.dto';
import { UpdateSharedDataDto, UpdateSharedDataGroupDto } from '../dto/update-shared-data.dto';

@Injectable()
export class SharedDataService {
    constructor(private readonly repository: SharedDataRepository) { }

    // Groups
    async createGroup(dto: CreateSharedDataGroupDto) {
        return this.repository.createGroup(dto);
    }

    async getGroups() {
        return this.repository.findAllGroups();
    }

    // Data
    async createData(dto: CreateSharedDataDto) {
        return this.repository.createData(dto);
    }

    async getDataByGroupCode(groupCode: string) {
        return this.repository.findDataByGroupCode(groupCode);
    }

    async getDataByGroupId(groupId: string) {
        return this.repository.findDataByGroupId(groupId);
    }

    async updateGroup(id: string, dto: UpdateSharedDataGroupDto) {
        return this.repository.updateGroup(id, dto);
    }

    async deleteGroup(id: string) {
        await this.repository.deleteDataByGroupId(id);
        return this.repository.deleteGroup(id);
    }

    async updateData(id: string, dto: UpdateSharedDataDto) {
        return this.repository.updateData(id, dto);
    }

    async deleteData(id: string) {
        return this.repository.deleteData(id);
    }
}
