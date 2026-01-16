import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InventorySession, InventorySessionModel } from '../schemas/inventory-session.schema';

@Injectable()
export class InventorySessionRepository {
    constructor(
        @InjectModel(InventorySession.name)
        public readonly sessionModel: InventorySessionModel
    ) { }

    async create(createDto: any): Promise<InventorySession> {
        return this.sessionModel.create(createDto);
    }

    async findAll(filter: any = {}): Promise<InventorySession[]> {
        return this.sessionModel.find(filter).sort({ createdAt: -1 }).exec();
    }

    async findById(id: string): Promise<InventorySession | null> {
        return this.sessionModel.findById(id).exec();
    }

    async update(id: string, updateDto: any): Promise<InventorySession | null> {
        return this.sessionModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    }

    async addScannedItems(id: string, items: any[], userId: string): Promise<InventorySession | null> {
        return this.sessionModel.findByIdAndUpdate(
            id,
            {
                $push: { details: { $each: items } },
                $inc: { totalScanned: items.length },
                $set: { updatedBy: userId }
            },
            { new: true }
        ).exec();
    }

    async delete(id: string): Promise<InventorySession | null> {
        return this.sessionModel.findByIdAndDelete(id).exec();
    }
}