import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import paginate, { PaginateModel } from '../../../plugins/paginate.plugin';
import { toJSONPlugin } from '../../../plugins/toJSON.plugin';

@Schema({ timestamps: true })
export class DefectReason extends Document {
    @Prop({ required: true, unique: true })
    code!: string;

    @Prop({ required: true })
    name!: string;

    @Prop()
    description?: string;

    @Prop({ default: true })
    isActive!: boolean;

    // Virtual for id
    declare id?: string;
}

export const DefectReasonSchema = SchemaFactory.createForClass(DefectReason);

DefectReasonSchema.plugin(paginate);
DefectReasonSchema.plugin(toJSONPlugin);

export type DefectReasonModel = PaginateModel<DefectReason>;
