import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import paginate, { PaginateModel } from '../../../plugins/paginate.plugin';
import { toJSONPlugin } from '../../../plugins/toJSON.plugin';
import { Category } from '../../categories/schemas/categories.schemas';
import { Warehouse } from '../../warehouses/schemas/warehouse.schemas';
import { DeviceImport } from '../../device-imports/schemas/device-import.schemas';
import { DeviceExport } from '../../device-exports/schemas/device-export.schemas';
import { User } from '../../../users/entities/user.entity';

@Schema({ timestamps: true })
export class Device extends Document {
  @Prop()
  serial?: string;

  @Prop({ required: true, unique: true })
  mac!: string;

  @Prop()
  p2p?: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  deviceModel!: string;

  @Prop({ default: 'Unit' })
  unit!: string;

  @Prop({ type: Object })
  specifications?: Record<string, any>;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Category', default: '696b38875f5e0185d5a694cd' })
  categoryId!: Category;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Warehouse', default: '6969ff74c376ce4d439185b9' })
  warehouseId!: Warehouse;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'DeviceImport', required: false })
  importId!: DeviceImport;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'DeviceExport', required: false })
  currentExportId!: DeviceExport;

  // --- QC & BẢO HÀNH ---
  @Prop({ required: true, enum: ['PASS', 'FAIL', 'PENDING'], default: 'PENDING' })
  qcStatus!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  qcBy?: User;

  @Prop()
  qcNote?: string;

  @Prop({ type: Object })
  supplier?: { warrantyDays: number };

  @Prop({ type: Object })
  customer?: { warrantyDays: number };

  @Prop()
  repairNote?: string;

  @Prop()
  warrantyActivatedDate?: Date;

  @Prop()
  warrantyNote?: string;

  // --- KHO LOẠI BỎ & HẾT BH ---
  @Prop()
  removeReason?: string;

  @Prop()
  removeDate?: Date;

  @Prop()
  warrantyExpiredDate?: Date; // Cache for easy query/sort

  @Prop()
  warehouseUpdatedAt?: Date;

  @Prop()
  importDate?: Date;

  @Prop()
  warehouseUpdatedBy?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;

  // Virtual for id (will be handled by toJSON plugin)
  declare id?: string;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);

// Apply plugins
DeviceSchema.plugin(paginate);
DeviceSchema.plugin(toJSONPlugin);

export type DeviceModel = PaginateModel<Device>;
