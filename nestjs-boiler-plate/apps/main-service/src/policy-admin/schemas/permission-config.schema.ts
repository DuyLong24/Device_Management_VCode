import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PermissionConfigDocument = PermissionConfig & Document;

interface ResourceMapping {
  path: string;
  methods: string[];
}

@Schema({ timestamps: true })
export class PermissionConfig extends Document {
  @Prop({ 
    required: true, 
    unique: true,
    validate: {
      validator: function(key: string) {
        return /^[a-z0-9_-]+:[a-z0-9_-]+$/.test(key);
      },
      message: 'Permission key must be in format: module:action'
    }
  })
  key!: string;

  @Prop({ required: true })
  module!: string;

  @Prop({ required: true })
  action!: string;

  @Prop({ 
    required: true, 
    type: [{
      path: { type: String, required: true },
      methods: { 
        type: [String], 
        required: true,
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        validate: {
          validator: function(methods: string[]) {
            return methods.length > 0 && methods.every(method => 
              ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
            );
          },
          message: 'Methods must be one of: GET, POST, PUT, PATCH, DELETE'
        }
      }
    }],
    validate: {
      validator: function(resources: ResourceMapping[]) {
        return resources.length > 0;
      },
      message: 'At least one resource mapping is required'
    }
  })
  resources!: ResourceMapping[];

  declare id?: string;
}

export const PermissionConfigSchema = SchemaFactory.createForClass(PermissionConfig);

// Create unique index on key
PermissionConfigSchema.index({ key: 1 }, { unique: true });

// Create index on module for faster queries
PermissionConfigSchema.index({ module: 1 });

// Create index on module and action for faster queries
PermissionConfigSchema.index({ module: 1, action: 1 });
