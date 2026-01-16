import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import paginate, { PaginateModel } from '../../../plugins/paginate.plugin';
import { toJSONPlugin } from '../../../plugins/toJSON.plugin';
import { Warehouse } from '../../warehouses/schemas/warehouse.schemas';

@Schema({ timestamps: true })
export class WarehouseTransition extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Warehouse', required: false })
  fromWarehouseId!: Warehouse;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Warehouse', required: true })
  toWarehouseId!: Warehouse;

  @Prop({ required: true })
  transitionType: string;

  @Prop({ type: [String], default: [] })
  allowedRoles: string[];

  @Prop({ default: false })
  requiresApproval: boolean;

  @Prop({ default: false })
  requiresNote: boolean;

  @Prop({ required: true })
  isActive!: boolean;

  // Virtual for id (will be handled by toJSON plugin)
  declare id?: string;
}

export const WarehouseTransitionSchema = SchemaFactory.createForClass(WarehouseTransition);

// Apply plugins
WarehouseTransitionSchema.plugin(paginate);
WarehouseTransitionSchema.plugin(toJSONPlugin);

export type WarehouseTransitionModel = PaginateModel<WarehouseTransition>;
