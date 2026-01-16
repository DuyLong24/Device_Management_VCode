import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import paginate, { PaginateModel } from '../../plugins/paginate.plugin';
import { toJSONPlugin } from '../../plugins/toJSON.plugin';


@Schema({ timestamps: true })
export class FncRole extends Document {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  code!: string;

  @Prop({ required: true })
  permissions!: string[];

  // Virtual for id (will be handled by toJSON plugin)
  declare id?: string;
}

export const FncRoleSchema = SchemaFactory.createForClass(FncRole);

// Apply plugins
FncRoleSchema.plugin(paginate);
FncRoleSchema.plugin(toJSONPlugin);

export type FncRoleModel = PaginateModel<FncRole>;
