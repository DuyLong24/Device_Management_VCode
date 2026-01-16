import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import paginate, { PaginateModel } from '../../../plugins/paginate.plugin';
import { toJSONPlugin } from '../../../plugins/toJSON.plugin';
import { WarehouseGroup } from '../../warehouse-groups/schemas/warehouse-group.schemas';

@Schema({ timestamps: true })
export class Warehouse extends Document {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  code!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'WarehouseGroup', required: true })
  groupId!: WarehouseGroup;

  @Prop({ required: true })
  orderIndex!: number;

  @Prop({ required: true })
  color!: string;

  @Prop({ required: true })
  icon!: string;

  @Prop()
  description?: string;

  // --- CẤU HÌNH UI ĐỘNG ---
  @Prop({ type: Object, default: {} })
  config!: {
    columns: Array<{ key: string; title: string; type: string }>;
    filters: Array<{ key: string; type: string; label: string; source?: string }>;
    actions: string[];
    quickTransfers?: Array<{ to: string; label: string; style: string }>;
  };

  @Prop({ default: true })
  isActive!: boolean;

  // Virtual for id (will be handled by toJSON plugin)
  declare id?: string;
}

export const WarehouseSchema = SchemaFactory.createForClass(Warehouse);

// Apply plugins
WarehouseSchema.plugin(paginate);
WarehouseSchema.plugin(toJSONPlugin);

export type WarehouseModel = PaginateModel<Warehouse>;
