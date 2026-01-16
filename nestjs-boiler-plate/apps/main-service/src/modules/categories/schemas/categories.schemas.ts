import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import paginate, { PaginateModel } from '../../../plugins/paginate.plugin';
import { toJSONPlugin } from '../../../plugins/toJSON.plugin';


@Schema({ timestamps: true })
export class Category extends Document {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  // Virtual for id (will be handled by toJSON plugin)
  declare id?: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Apply plugins
CategorySchema.plugin(paginate);
CategorySchema.plugin(toJSONPlugin);

export type CategoryModel = PaginateModel<Category>;
