import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserModel } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UserRepository {
  constructor(@InjectModel(User.name) private userModel: UserModel) {}

  async create(createUserDto: CreateUserDto | Partial<User>, session?: any): Promise<User> {
    const userData: any = { ...createUserDto };
    
    // Chuyển đổi dateOfBirth từ string sang Date nếu cần
    if (userData.dateOfBirth && typeof userData.dateOfBirth === 'string') {
      userData.dateOfBirth = new Date(userData.dateOfBirth);
    }
    
    // Chuyển đổi dayPasswordChange từ string sang Date nếu cần
    if (userData.dayPasswordChange && typeof userData.dayPasswordChange === 'string') {
      userData.dayPasswordChange = new Date(userData.dayPasswordChange);
    }

    if (session) {
      return this.userModel.create([userData], { session }).then(docs => docs[0]);
    } else {
      return this.userModel.create(userData);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    // Validate email format
    if (!email || typeof email !== 'string') {
      throw new Error('Email must be a valid string');
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
    
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<User | null> {
    // Validate ObjectId format
    if (!id || typeof id !== 'string') {
      throw new Error('ID must be a valid string');
    }
    
    // Check if id is a valid MongoDB ObjectId (24 hex characters)
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(id)) {
      throw new Error('Invalid ObjectId format');
    }
    
    return this.userModel.findById(id).exec();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto, session?: any): Promise<User | null> {
    // Validate ObjectId format
    if (!id || typeof id !== 'string') {
      throw new Error('ID must be a valid string');
    }
    
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(id)) {
      throw new Error('Invalid ObjectId format');
    }
    
    const updateData: any = { ...updateUserDto };
    
    // Chuyển đổi dateOfBirth từ string sang Date nếu cần
    if (updateData.dateOfBirth && typeof updateData.dateOfBirth === 'string') {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }
    
    // Chuyển đổi dayPasswordChange từ string sang Date nếu cần
    if (updateData.dayPasswordChange && typeof updateData.dayPasswordChange === 'string') {
      updateData.dayPasswordChange = new Date(updateData.dayPasswordChange);
    }

    if (session) {
      return this.userModel.findByIdAndUpdate(id, updateData, { new: true, session }).exec();
    } else {
      return this.userModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
    }
  }

  async delete(id: string, session?: any): Promise<User | null> {
    // Validate ObjectId format
    if (!id || typeof id !== 'string') {
      throw new Error('ID must be a valid string');
    }
    
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(id)) {
      throw new Error('Invalid ObjectId format');
    }
    
    if (session) {
      return this.userModel.findByIdAndDelete(id).session(session).exec();
    } else {
      return this.userModel.findByIdAndDelete(id).exec();
    }
  }
}
