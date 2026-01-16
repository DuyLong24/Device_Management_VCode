import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import paginate, { PaginateModel } from '../../plugins/paginate.plugin';
import { toJSONPlugin } from '../../plugins/toJSON.plugin';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  username!: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true, private: true }) // Mark as private to exclude from JSON
  password!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ enum: ['male', 'female', 'other'] })
  gender?: string;

  @Prop({ unique: true })
  code?: string;

  @Prop()
  funcRoleId?: string;

  @Prop()
  uiRoleId?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop()
  phoneNumber?: string;

  @Prop()
  address?: string;

  @Prop({ enum: ['active', 'inactive', 'pending'], default: 'active' })
  status?: string;

  @Prop({ default: false })
  isPasswordChange?: boolean;

  @Prop({ private: true }) // Mark as private to exclude from JSON
  dayPasswordChange?: Date;

  // Virtual for id (will be handled by toJSON plugin)
  declare id?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Apply plugins
UserSchema.plugin(paginate);
UserSchema.plugin(toJSONPlugin);

// Export PaginateModel type
export type UserModel = PaginateModel<User>;

// Pre-save middleware để tự động sinh code
UserSchema.pre('save', async function(next) {
  if (!this.code && this.isNew) {
    try {
      const UserModel = this.constructor as any;
      // Tìm user có code cao nhất
      const lastUser = await UserModel.findOne(
        { code: { $regex: /^U\d{9}$/ } },
        {},
        { sort: { code: -1 } }
      );
      
      let nextNumber = 1;
      if (lastUser && lastUser.code) {
        // Lấy số từ code cuối cùng và tăng lên 1
        const lastNumber = parseInt(lastUser.code.substring(1));
        nextNumber = lastNumber + 1;
      }
      
      // Format thành U + 9 chữ số (pad với 0)
      this.code = `U${nextNumber.toString().padStart(9, '0')}`;
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});
