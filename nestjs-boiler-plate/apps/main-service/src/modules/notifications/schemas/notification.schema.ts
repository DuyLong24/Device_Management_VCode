import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { toJSONPlugin } from '../../../plugins/toJSON.plugin';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
    INFO = 'INFO',
    SUCCESS = 'SUCCESS',
    WARNING = 'WARNING',
    ERROR = 'ERROR',
}

@Schema({ timestamps: true })
export class Notification {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    message: string;

    @Prop({ required: true, enum: NotificationType, default: NotificationType.INFO })
    type: NotificationType;

    @Prop({ type: String, ref: 'User', required: true })
    userId: string;

    @Prop({ default: false })
    isRead: boolean;

    @Prop({ type: Object })
    metadata: any;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.plugin(toJSONPlugin);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });
