import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import paginate, { PaginateModel } from '../../../plugins/paginate.plugin';
import { toJSONPlugin } from '../../../plugins/toJSON.plugin';
import { User } from 'apps/main-service/src/users/entities/user.entity';
import { Category } from '../../categories/schemas/categories.schemas';

@Schema({ timestamps: true })
export class DeviceImport extends Document {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop()
  productType: string;

  @Prop({ required: true })
  origin: string;

  @Prop()
  importDate?: Date;

  @Prop()
  importedBy: string;

  @Prop({ required: false })
  supplier: string;

  @Prop()
  handoverPerson: string;

  @Prop()
  notes?: string;

  @Prop({
    type: [{
      productCode: String,
      quantity: Number,
      boxCount: Number,
      itemsPerBox: Number,
      serialImported: { type: Number, default: 0 },
      expectedSerials: { type: [String], default: [] }
    }],
    default: []
  })
  products: Array<{
    productCode: string;
    quantity: number;
    boxCount: number;
    itemsPerBox: number;
    serialImported: number;
    expectedSerials: string[];
  }>;

  @Prop({ default: 0 })
  serialImported: number;

  @Prop({ default: 'pending', enum: ['pending', 'in-progress', 'completed'] })
  inventoryStatus: string;

  @Prop({ default: 0 })
  totalItem: number;

  @Prop({ required: true })
  totalQuantity!: number;

  @Prop({ default: 'DRAFT', enum: ['DRAFT', 'PUBLIC'] })
  status!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy?: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  updatedBy: User;

  declare id?: string;
}

export const DeviceImportSchema = SchemaFactory.createForClass(DeviceImport);

DeviceImportSchema.plugin(paginate);
DeviceImportSchema.plugin(toJSONPlugin);

export type DeviceImportModel = PaginateModel<DeviceImport>;
