import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import paginate, { PaginateModel } from '../../../plugins/paginate.plugin';
import { toJSONPlugin } from '../../../plugins/toJSON.plugin';


@Schema({ timestamps: true })
export class WarehouseGroup extends Document {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  orderIndex!: number;

  @Prop({ default: true })
  isActive!: boolean;

  // Virtual for id (will be handled by toJSON plugin)
  declare id?: string;
}

export const WarehouseGroupSchema = SchemaFactory.createForClass(WarehouseGroup);

// Apply plugins
WarehouseGroupSchema.plugin(paginate);
WarehouseGroupSchema.plugin(toJSONPlugin);

export type WarehouseGroupModel = PaginateModel<WarehouseGroup>;
