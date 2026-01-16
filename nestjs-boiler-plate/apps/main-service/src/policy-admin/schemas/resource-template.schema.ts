import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ResourceTemplateDocument = ResourceTemplate & Document;

@Schema({ timestamps: true })
export class ResourceTemplate extends Document {
  @Prop({ required: true })
  module!: string;

  @Prop({ required: true })
  path!: string;

  @Prop({ 
    required: true, 
    type: [String],
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    validate: {
      validator: function(methods: string[]) {
        return methods.length > 0 && methods.every(method => 
          ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
        );
      },
      message: 'Methods must be one of: GET, POST, PUT, PATCH, DELETE'
    }
  })
  methods!: string[];

  @Prop()
  description?: string;

  declare id?: string;
}

export const ResourceTemplateSchema = SchemaFactory.createForClass(ResourceTemplate);

// Create unique compound index on module and path
ResourceTemplateSchema.index({ module: 1, path: 1 }, { unique: true });

// Create index on module for faster queries
ResourceTemplateSchema.index({ module: 1 });
