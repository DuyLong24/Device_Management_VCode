import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import paginate, { PaginateModel } from '../../../plugins/paginate.plugin';
import { toJSONPlugin } from '../../../plugins/toJSON.plugin';


@Schema({ timestamps: true })
export class DeviceExport extends Document {
  @Prop({ required: true })
  exportName!: string;

  @Prop({ required: true })
  type!: string;

  @Prop({ required: true })
  receiver!: string;

  @Prop({ required: true })
  status!: string;

  @Prop({ required: true })
  totalItems!: number;

  @Prop({ required: true })
  totalQuantity!: number;

  // Virtual for id (will be handled by toJSON plugin)
  declare id?: string;
}

export const DeviceExportSchema = SchemaFactory.createForClass(DeviceExport);

// Apply plugins
DeviceExportSchema.plugin(paginate);
DeviceExportSchema.plugin(toJSONPlugin);

export type DeviceExportModel = PaginateModel<DeviceExport>;
