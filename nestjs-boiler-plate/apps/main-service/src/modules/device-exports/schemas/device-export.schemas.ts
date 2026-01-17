import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import paginate, { PaginateModel } from '../../../plugins/paginate.plugin';
import { toJSONPlugin } from '../../../plugins/toJSON.plugin';
import { User } from '../../../users/entities/user.entity';

export enum ExportStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum ExportReason {
  SALE = 'SALE',
  TRANSFER = 'TRANSFER',
  LIQUIDATION = 'LIQUIDATION',
  OTHER = 'OTHER',
}

@Schema()
export class ExportRequirement {
  @Prop({ required: true })
  productCode: string;

  @Prop()
  productName: string;

  @Prop({ required: true, default: 1 })
  quantity: number;
}
export const ExportRequirementSchema = SchemaFactory.createForClass(ExportRequirement);

@Schema()
export class ExportItem {
  @Prop({ required: true })
  serial: string;

  @Prop()
  deviceModel: string;

  @Prop()
  productCode: string;

  @Prop()
  exportPrice: number;
}
export const ExportItemSchema = SchemaFactory.createForClass(ExportItem);


@Schema({ timestamps: true })
export class DeviceExport extends Document {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true })
  exportName: string;

  @Prop({ default: 'NORMAL' })
  type: string;

  @Prop()
  receiver: string;

  @Prop()
  receiverPerson: string;

  @Prop()
  project: string;

  @Prop()
  customer: string;

  @Prop()
  deliveryAddress: string;

  @Prop({ type: String, enum: ExportReason, default: ExportReason.SALE })
  exportReason: ExportReason;

  @Prop({ type: String, enum: ExportStatus, default: ExportStatus.DRAFT })
  status: ExportStatus;

  @Prop()
  notes: string;

  @Prop()
  rejectedReason: string;

  @Prop({ type: [ExportRequirement], default: [] })
  requirements: ExportRequirement[];

  @Prop({ type: [ExportItem], default: [] })
  items: ExportItem[];

  @Prop({ default: 0 })
  totalQuantity: number;

  @Prop({ default: 0 })
  totalItems: number; // Total scanned

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  approvedBy: User;

  @Prop()
  approvedDate: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  confirmedBy: User;

  @Prop()
  exportDate: Date;
  declare id?: string;
}

export const DeviceExportSchema = SchemaFactory.createForClass(DeviceExport);

// Apply plugins
DeviceExportSchema.plugin(paginate);
DeviceExportSchema.plugin(toJSONPlugin);

export type DeviceExportModel = PaginateModel<DeviceExport>;
