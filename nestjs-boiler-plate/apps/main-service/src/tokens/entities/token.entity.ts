import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import paginate, { PaginateModel } from '../../plugins/paginate.plugin';
import { toJSONPlugin } from '../../plugins/toJSON.plugin';
import { User } from '../../users/entities/user.entity';

@Schema({ timestamps: true })
export class Token extends Document {
  @Prop({ required: true })
  token!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId!: User;

  @Prop({ required: true })
  type!: string;

  @Prop()
  expires?: Date;

  @Prop({ required: true })
  blacklisted!: boolean;

  // Virtual for id (will be handled by toJSON plugin)
  declare id?: string;
}

export const TokenSchema = SchemaFactory.createForClass(Token);

// Apply plugins
TokenSchema.plugin(paginate);
TokenSchema.plugin(toJSONPlugin);

export type TokenModel = PaginateModel<Token>;
