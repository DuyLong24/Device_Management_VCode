
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SharedDataGroupDocument = SharedDataGroup & Document;

@Schema({ timestamps: true })
export class SharedDataGroup {
    @Prop({ required: true, unique: true, index: true })
    code: string; // e.g., 'ORIGIN', 'PROJECT'

    @Prop({ required: true })
    name: string;

    @Prop()
    description: string;
}

export const SharedDataGroupSchema = SchemaFactory.createForClass(SharedDataGroup);

// ---

export type SharedDataDocument = SharedData & Document;

@Schema({ timestamps: true })
export class SharedData {
    @Prop({ required: true, unique: true, index: true })
    code: string; // e.g., 'DOMESTIC', 'IMPORT'

    @Prop({ required: true })
    name: string;

    @Prop()
    description: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'SharedDataGroup', required: true, index: true })
    groupId: SharedDataGroup;

    @Prop({ default: 0 })
    order: number;
}

export const SharedDataSchema = SchemaFactory.createForClass(SharedData);
SharedDataSchema.index({ groupId: 1, code: 1 }, { unique: true }); // Ensure unique code per group (optional but good practice, though code is globally unique in this design for simplicity? No, code should be unique per group usually, but user example shows unique codes globally slightly. Let's make code unique globally to avoid confusion or specific composite index. Re-reading user requirement: code seems unique. Let's stick to composite unique index later if needed, but for now simple unique code is safer for 'code' lookup.)
