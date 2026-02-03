
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SharedData, SharedDataDocument, SharedDataGroup, SharedDataGroupDocument } from '../schemas/shared-data.schemas';

@Injectable()
export class SharedDataRepository {
    constructor(
        @InjectModel(SharedDataGroup.name) private groupModel: Model<SharedDataGroupDocument>,
        @InjectModel(SharedData.name) private dataModel: Model<SharedDataDocument>,
    ) { }

    // Group Operations
    async createGroup(data: any): Promise<SharedDataGroup> {
        return this.groupModel.create(data);
    }

    async findAllGroups(): Promise<SharedDataGroup[]> {
        return this.groupModel.find().exec();
    }

    async findGroupByCode(code: string): Promise<SharedDataGroup> {
        return this.groupModel.findOne({ code }).exec();
    }

    // Data Operations
    async createData(data: any): Promise<SharedData> {
        return this.dataModel.create(data);
    }

    async findDataByGroupId(groupId: string): Promise<SharedData[]> {
        return this.dataModel.find({ groupId }).sort({ order: 1, createdAt: 1 }).exec();
    }

    async findDataByGroupCode(groupCode: string): Promise<SharedData[]> {
        const group = await this.findGroupByCode(groupCode);
        if (!group) return [];
        return this.findDataByGroupId((group as any)._id);
    }

    async findOneDataByCode(code: string): Promise<SharedData> {
        return this.dataModel.findOne({ code }).exec();
    }

    async insertManyGroups(groups: any[]) {
        return this.groupModel.insertMany(groups, { ordered: false }).catch(e => {
            if (e.code !== 11000) console.error('Insert Groups Error', e);
        });
    }

    async insertManyData(data: any[]) {
        return this.dataModel.insertMany(data, { ordered: false }).catch(e => {
            if (e.code !== 11000) console.error('Insert Data Error', e);
        });
    }

    // Update/Delete Group
    async updateGroup(id: string, data: any): Promise<SharedDataGroup | null> {
        return this.groupModel.findByIdAndUpdate(id, data, { new: true }).exec();
    }

    async deleteGroup(id: string): Promise<SharedDataGroup | null> {
        return this.groupModel.findByIdAndDelete(id).exec();
    }

    async findGroupById(id: string): Promise<SharedDataGroup | null> {
        return this.groupModel.findById(id).exec();
    }

    // Update/Delete Data
    async updateData(id: string, data: any): Promise<SharedData | null> {
        return this.dataModel.findByIdAndUpdate(id, data, { new: true }).exec();
    }

    async deleteData(id: string): Promise<SharedData | null> {
        return this.dataModel.findByIdAndDelete(id).exec();
    }

    async findDataById(id: string): Promise<SharedData | null> {
        return this.dataModel.findById(id).exec();
    }

    async deleteDataByGroupId(groupId: string): Promise<any> {
        return this.dataModel.deleteMany({ groupId }).exec();
    }
}
