import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VersionDocument = Version & Document;

@Schema({ timestamps: true })
export class Version extends Document {
  @Prop({ required: true })
  hash!: string;

  @Prop({ required: true, type: Object })
  snapshot!: Record<string, any>;

  @Prop({ required: true })
  createdBy!: string;

  declare id?: string;
}

export const VersionSchema = SchemaFactory.createForClass(Version);

// Create index on hash for faster lookups
VersionSchema.index({ hash: 1 });

// Create index on createdAt for chronological queries
VersionSchema.index({ createdAt: -1 });
