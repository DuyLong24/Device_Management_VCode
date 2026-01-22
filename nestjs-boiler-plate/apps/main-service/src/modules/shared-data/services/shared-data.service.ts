
import { Injectable, OnModuleInit } from '@nestjs/common';
import { SharedDataRepository } from '../repositories/shared-data.repository';
import { CreateSharedDataDto, CreateSharedDataGroupDto } from '../dto/create-shared-data.dto';

@Injectable()
export class SharedDataService implements OnModuleInit {
    constructor(private readonly repository: SharedDataRepository) { }

    async onModuleInit() {
        console.log('SharedDataService: Seeding Init Data...');
        await this.seedInitData();
    }

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

    // Seeding Helper
    async seedInitData() {
        // 1. Seed Groups
        const groups = [
            { code: 'ORIGIN', name: 'Nguồn gốc', description: 'Nguồn gốc của thiết bị (Nội địa, Nhập khẩu...)' },
            { code: 'PROJECT', name: 'Dự án', description: 'Dự án (Hà Nội, Cà Mau...)' },
            { code: 'MODEL', name: 'Mã thiết bị', description: 'Danh sách SKU/Model thiết bị' }, // Assuming simple list for now
            { code: 'UNIT', name: 'Đơn vị tính', description: 'Đơn vị tính (Cái, Chiếc...)' },
        ];

        // Upsert Groups? Using simple check for existence or insertMany ordered:false
        await this.repository.insertManyGroups(groups);

        // 2. Fetch Groups to get IDs
        const allGroups = await this.repository.findAllGroups();
        const groupMap = new Map(allGroups.map(g => [g.code, (g as any)._id]));

        if (!process.env.SEED_SHARED_DATA && allGroups.length > 0) {
            // Optional: Skip if already seeded or env flag not set? 
            // For this task, we assume we always want to ensure these exist
        }

        const dataToSeed = [];

        // ORIGIN Data
        const originId = groupMap.get('ORIGIN');
        if (originId) {
            dataToSeed.push(
                { code: 'DOMESTIC', name: 'Nội địa', description: 'Hàng được sản xuất trong nước', groupId: originId, order: 1 },
                { code: 'IMPORT', name: 'Nhập khẩu', description: 'Hàng được nhập khẩu', groupId: originId, order: 2 },
                { code: 'WARRANTY_RETURN', name: 'Trả bảo hành', description: 'Hàng được NSX bảo hành', groupId: originId, order: 3 },
            );
        }

        // PROJECT Data
        const projectId = groupMap.get('PROJECT');
        if (projectId) {
            dataToSeed.push(
                { code: 'PRJ_HANOI', name: 'Dự án Hà Nội', description: 'Dự án được lắp đặt tại Hà Nội', groupId: projectId, order: 1 },
                { code: 'PRJ_HAGIANG', name: 'Dự án Hà Giang', description: 'Dự án được lắp đặt tại Hà Giang', groupId: projectId, order: 2 },
                { code: 'PRJ_NINHBINH', name: 'Dự án Ninh Bình', description: 'Dự án được lắp đặt tại Ninh Bình', groupId: projectId, order: 3 },
                { code: 'PRJ_CAMAU', name: 'Dự án Cà Mau', description: 'Dự án được lắp đặt tại Cà Mau', groupId: projectId, order: 4 },
            );
        }

        // MODEL Data (Sample from image)
        const modelId = groupMap.get('MODEL');
        if (modelId) {
            dataToSeed.push(
                { code: 'AV-C251137L6BT', name: 'Camera Indoor 2 MP', description: 'Camera có AI, sử dụng ngoài trời', groupId: modelId, order: 1 },
                { code: 'AV-C251141L5UA-1A-SCREEN', name: 'Màn hình 32 inch', description: 'Màn hình cỡ lớn 32 inch', groupId: modelId, order: 2 },
                // Note: Image had same code for barrier, suffixing to ensure Uniqueness
                { code: 'AV-C251141L5UA-1A-BARRIER', name: 'Barrier tự động', description: 'Barrie dùng cho dự án chấm công', groupId: modelId, order: 3 },
            );
        }

        // UNIT Data
        const unitId = groupMap.get('UNIT');
        if (unitId) {
            dataToSeed.push(
                { code: 'CAI', name: 'Cái', groupId: unitId },
                { code: 'CHIEC', name: 'Chiếc', groupId: unitId },
                { code: 'BO', name: 'Bộ', groupId: unitId },
            );
        }

        if (dataToSeed.length > 0) {
            await this.repository.insertManyData(dataToSeed);
            console.log(`Seeded ${dataToSeed.length} shared data items.`);
        }
    }
}
