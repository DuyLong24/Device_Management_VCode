import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../../users/entities/user.entity';
import { DeviceExport } from './device-export.schemas';

export enum ExportSessionStatus {
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class ExportSession extends Document {
    @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'DeviceExport' })
    exportId: DeviceExport;

    @Prop({ required: true })
    sessionCode: string;

    @Prop({ required: true })
    sessionName: string;

    @Prop({ type: String, enum: ExportSessionStatus, default: ExportSessionStatus.IN_PROGRESS })
    status: ExportSessionStatus;

    @Prop()
    note: string;

    @Prop({ default: 0 })
    serialTotal: number; // Tổng số lượng cần quét trong phiên này

    @Prop({ default: 0 })
    serialChecked: number; // Số lượng đã quét thành công

    @Prop({
        type: [{
            serial: { type: String, required: true },
            deviceCode: { type: String, required: true },
            deviceModel: { type: String },
            scannedAt: { type: Date, default: Date.now }
        }], default: []
    })
    items: {
        serial: string;
        deviceCode: string;
        deviceModel: string;
        scannedAt: Date;
    }[];

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    createdBy: User;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    completedBy: User;

    @Prop()
    completedAt: Date;
}

export const ExportSessionSchema = SchemaFactory.createForClass(ExportSession);
