import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import paginate, { PaginateModel } from '../../../plugins/paginate.plugin';
import { toJSONPlugin } from '../../../plugins/toJSON.plugin';
import { Device } from '../../devices/schemas/device.schemas';
import { Warehouse } from '../../warehouses/schemas/warehouse.schemas';
import { User } from 'apps/main-service/src/users/entities/user.entity';

@Schema({ timestamps: true })
export class DeviceHistory extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Device', required: true })
  deviceId!: Device;

  @Prop({ required: true })
  action!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Warehouse', required: true })
  fromWarehouseId!: Warehouse;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Warehouse', required: true })
  toWarehouseId!: Warehouse;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  actorId!: User;

  @Prop({ required: true })
  note!: string;

  // Virtual for id (will be handled by toJSON plugin)
  declare id?: string;
}

export const DeviceHistorySchema = SchemaFactory.createForClass(DeviceHistory);

// Apply plugins
DeviceHistorySchema.plugin(paginate);
DeviceHistorySchema.plugin(toJSONPlugin);

export type DeviceHistoryModel = PaginateModel<DeviceHistory>;
