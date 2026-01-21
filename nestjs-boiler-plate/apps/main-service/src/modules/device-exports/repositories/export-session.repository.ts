import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { ExportSession } from '../schemas/export-session.schemas';

@Injectable()
export class ExportSessionRepository {
    constructor(@InjectModel(ExportSession.name) private exportSessionModel: Model<ExportSession>) { }

    async create(data: any): Promise<ExportSession> {
        return this.exportSessionModel.create(data);
    }

    async findById(id: string): Promise<ExportSession | null> {
        return this.exportSessionModel.findById(id).exec();
    }

    async findOne(filter: FilterQuery<ExportSession>): Promise<ExportSession | null> {
        return this.exportSessionModel.findOne(filter).exec();
    }

    async findAll(filter: FilterQuery<ExportSession>): Promise<ExportSession[]> {
        return this.exportSessionModel.find(filter).sort({ createdAt: -1 }).exec();
    }

    async update(id: string, data: any): Promise<ExportSession | null> {
        return this.exportSessionModel.findByIdAndUpdate(id, data, { new: true }).exec();
    }
}
