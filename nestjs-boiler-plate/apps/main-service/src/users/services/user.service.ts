import { Injectable, NotFoundException, ConflictException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { EmailVO } from '../value-objects/email.vo';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { SetPasswordDto } from '../dto/set-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { UserKeycloakIntegrationService } from './user-keycloak-integration.service';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { UpdateMyProfileDto } from '../dto/update-my-profile.dto';

import { User } from '../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly keycloakIntegrationService: UserKeycloakIntegrationService,
    @InjectConnection() private readonly connection: Connection,
  ) { }

  async create(createUserDto: CreateUserDto) {
    const { email } = createUserDto;

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Bắt đầu một session mới
    const session = await this.connection.startSession();

    try {
      // Bắt đầu transaction
      session.startTransaction();

      // Tạo user trong MongoDB với session để có thể rollback nếu cần
      const user = await this.userRepository.create(createUserDto, session);

      // Nếu tất cả đều thành công, commit transaction
      await session.commitTransaction();

      return user;
    } catch (error) {
      // Nếu có lỗi, abort transaction để rollback
      await session.abortTransaction();

      // Trả về lỗi cụ thể cho client
      if (error instanceof ConflictException || error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException('Error creating user: ' + error.message);
    } finally {
      // Kết thúc session
      session.endSession();
    }
  }

  async register(createUserDto: CreateUserDto) {
    const emailVO = new EmailVO(createUserDto.email);
    // Kiểm tra email đã tồn tại chưa
    const existingUser = await this.userRepository.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Bắt đầu một session mới
    const session = await this.connection.startSession();

    try {
      // Bắt đầu transaction
      session.startTransaction();

      // Tạo user trong MongoDB với session để có thể rollback nếu cần
      const user = await this.userRepository.create(createUserDto, session);

      // Đồng bộ sang Keycloak
      const keycloakUserId = await this.keycloakIntegrationService.syncUserToKeycloak(user);

      // Nếu đồng bộ Keycloak không thành công, throw error để rollback transaction
      if (!keycloakUserId) {
        throw new InternalServerErrorException('Failed to synchronize user to Keycloak');
      }

      // Nếu tất cả đều thành công, commit transaction
      await session.commitTransaction();

      return user;
    } catch (error) {
      // Nếu có lỗi, abort transaction để rollback
      await session.abortTransaction();

      // Trả về lỗi cụ thể cho client
      if (error instanceof ConflictException || error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException('Error registering user: ' + error.message);
    } finally {
      // Kết thúc session
      session.endSession();
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Kiểm tra email mới nếu có
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    // Bắt đầu một session mới
    const session = await this.connection.startSession();

    try {
      // Bắt đầu transaction
      session.startTransaction();

      // Cập nhật user trong MongoDB với session
      const updatedUser = await this.userRepository.update(id, updateUserDto, session);

      // Đồng bộ sang Keycloak
      const keycloakUserId = await this.keycloakIntegrationService.syncUserToKeycloak(updatedUser);

      // Nếu đồng bộ Keycloak không thành công, throw error để rollback transaction
      if (!keycloakUserId) {
        throw new InternalServerErrorException('Failed to synchronize user to Keycloak');
      }

      // Nếu tất cả đều thành công, commit transaction
      await session.commitTransaction();

      return updatedUser;
    } catch (error) {
      // Nếu có lỗi, abort transaction để rollback
      await session.abortTransaction();

      // Trả về lỗi cụ thể cho client
      if (error instanceof ConflictException || error instanceof InternalServerErrorException || error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Error updating user: ' + error.message);
    } finally {
      // Kết thúc session
      session.endSession();
    }
  }

  async delete(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Bắt đầu một session mới
    const session = await this.connection.startSession();

    try {
      // Bắt đầu transaction
      session.startTransaction();

      // Xóa user trong MongoDB với session
      const deletedUser = await this.userRepository.delete(id, session);

      // Đồng bộ sang Keycloak - xóa user từ Keycloak
      await this.keycloakIntegrationService.deleteUserFromKeycloak(user.email);

      // Nếu tất cả đều thành công, commit transaction
      await session.commitTransaction();

      return deletedUser;
    } catch (error) {
      // Nếu có lỗi, abort transaction để rollback
      await session.abortTransaction();

      // Trả về lỗi cụ thể cho client
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Error deleting user: ' + error.message);
    } finally {
      // Kết thúc session
      session.endSession();
    }
  }

  async getByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }

  async findById(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByKeycloakId(keycloakId: string) {
    return this.userRepository.findByKeycloakId(keycloakId);
  }

  async findAll() {
    return this.userRepository.findAll();
  }

  async setPassword(setPasswordDto: SetPasswordDto) {
    const { userId, newPassword } = setPasswordDto;

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cập nhật password và đánh dấu là đã thay đổi password
    const updateData = {
      password: newPassword,
      isPasswordChange: true,
      dayPasswordChange: new Date().toISOString()
    };

    // Bắt đầu một session mới
    const session = await this.connection.startSession();

    try {
      // Bắt đầu transaction
      session.startTransaction();

      // Cập nhật password trong MongoDB
      const updatedUser = await this.userRepository.update(userId, updateData, session);

      if (!updatedUser) {
        throw new BadRequestException('Failed to update password');
      }

      // Sync user với Keycloak để cập nhật password
      const keycloakUserId = await this.keycloakIntegrationService.syncUserToKeycloak({
        ...user.toObject(),
        password: newPassword
      });

      if (!keycloakUserId) {
        throw new InternalServerErrorException('Failed to synchronize password to Keycloak');
      }

      // Nếu tất cả đều thành công, commit transaction
      await session.commitTransaction();

      // Trả về user nhưng không bao gồm password
      const { password, ...userWithoutPassword } = updatedUser.toObject();
      return {
        message: 'Password set successfully',
        user: userWithoutPassword
      };
    } catch (error) {
      // Nếu có lỗi, abort transaction để rollback
      await session.abortTransaction();

      // Trả về lỗi cụ thể cho client
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException('Error setting password: ' + error.message);
    } finally {
      // Kết thúc session
      session.endSession();
    }
  }

  async changePassword(changePasswordDto: ChangePasswordDto) {
    const { userId, currentPassword, newPassword } = changePasswordDto;

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if password is hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
    const isPasswordHashed = user.password.startsWith('$2a$') ||
      user.password.startsWith('$2b$') ||
      user.password.startsWith('$2y$');

    let isPasswordValid = false;

    if (isPasswordHashed) {
      // Password is hashed, use bcrypt.compare()
      isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    } else {
      // Password is plain text (legacy), compare directly
      isPasswordValid = user.password === currentPassword;
    }

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Kiểm tra password mới không được giống password cũ
    if (currentPassword === newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash new password before storing
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật password mới
    const updateData = {
      password: hashedNewPassword,
      isPasswordChange: true,
      dayPasswordChange: new Date().toISOString()
    };

    // Bắt đầu một session mới
    const session = await this.connection.startSession();

    try {
      // Bắt đầu transaction
      session.startTransaction();

      // Cập nhật password trong MongoDB
      const updatedUser = await this.userRepository.update(userId, updateData, session);

      if (!updatedUser) {
        throw new BadRequestException('Failed to update password');
      }

      // Sync user với Keycloak để cập nhật password
      // IMPORTANT: Keycloak needs raw password, not hashed
      const keycloakUserId = await this.keycloakIntegrationService.syncUserToKeycloak({
        ...user.toObject(),
        password: newPassword // Raw password for Keycloak
      });

      if (!keycloakUserId) {
        throw new InternalServerErrorException('Failed to synchronize password to Keycloak');
      }

      // Nếu tất cả đều thành công, commit transaction
      await session.commitTransaction();

      // Trả về user nhưng không bao gồm password
      const { password, ...userWithoutPassword } = updatedUser.toObject();
      return {
        message: 'Password changed successfully',
        user: userWithoutPassword
      };
    } catch (error) {
      // Nếu có lỗi, abort transaction để rollback
      await session.abortTransaction();

      // Trả về lỗi cụ thể cho client
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException('Error changing password: ' + error.message);
    } finally {
      // Kết thúc session
      session.endSession();
    }
  }

  async updateMyProfile(userId: string, updateDto: UpdateMyProfileDto) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    //Chuẩn bị dữ liệu update
    const updateData: Partial<User> = {};

    if (updateDto.name !== undefined) {
      updateData.name = updateDto.name;
    }

    if (updateDto.phoneNumber !== undefined) {
      updateData.phoneNumber = updateDto.phoneNumber;
    }

    if (updateDto.dateOfBirth !== undefined) {
      updateData.dateOfBirth = new Date(updateDto.dateOfBirth);
    }

    // Update in MongoDB
    const updatedUser = await this.userRepository.update(userId, updateData as any);

    if (!updatedUser) {
      throw new BadRequestException('Failed to update profile');
    }

    // Sync name to Keycloak if name was updated
    if (updateDto.name) {
      try {
        await this.keycloakIntegrationService.syncUserToKeycloak({
          ...updatedUser.toObject(),
        });
      } catch (error) {
        // Log error but don't fail the request
        console.error('Failed to sync name to Keycloak:', error);
      }
    }

    // Return user without password
    const { password, ...userWithoutPassword } = updatedUser.toObject();
    return userWithoutPassword;
  }


  async assignRole(userId: string, roleCode: string) {
    const user = await this.findById(userId);

    // Bắt đầu một session mới
    const session = await this.connection.startSession();

    try {
      // Bắt đầu transaction
      session.startTransaction();

      // Cập nhật role trong MongoDB
      const updatedUser = await this.userRepository.update(userId, { funcRoleId: roleCode }, session);

      // Assign role trong Keycloak
      await this.keycloakIntegrationService.assignRoleInKeycloak(user.email, roleCode);

      // Nếu tất cả đều thành công, commit transaction
      await session.commitTransaction();

      return updatedUser;
    } catch (error) {
      // Nếu có lỗi, abort transaction để rollback
      await session.abortTransaction();

      throw new InternalServerErrorException('Error assigning role: ' + error.message);
    } finally {
      // Kết thúc session
      session.endSession();
    }
  }

  async removeRole(userId: string, roleCode: string) {
    const user = await this.findById(userId);

    // Bắt đầu một session mới
    const session = await this.connection.startSession();

    try {
      // Bắt đầu transaction
      session.startTransaction();

      // Xóa role trong MongoDB
      const updatedUser = await this.userRepository.update(userId, { funcRoleId: undefined }, session);

      // Assign default role trong Keycloak
      await this.keycloakIntegrationService.assignRoleInKeycloak(user.email, 'user');

      // Nếu tất cả đều thành công, commit transaction
      await session.commitTransaction();

      return updatedUser;
    } catch (error) {
      // Nếu có lỗi, abort transaction để rollback
      await session.abortTransaction();

      throw new InternalServerErrorException('Error removing role: ' + error.message);
    } finally {
      // Kết thúc session
      session.endSession();
    }
  }

  async syncFromKeycloak(token: any): Promise<User> {
    const keycloakId = token.sub;
    const email = token.email;
    const username = token.preferred_username || token.email;
    const name = token.name || username;

    // 1. Try find by Keycloak ID
    let user = await this.userRepository.findByKeycloakId(keycloakId);
    if (user) return user;

    // 2. Try find by Email (migration/linking)
    if (email) {
      user = await this.userRepository.findByEmail(email);
      if (user) {
        user.keycloakId = keycloakId;
        return user.save();
      }
    }

    // 3. Create new user
    const randomPassword = Math.random().toString(36).slice(-8);

    return this.userRepository.create({
      username,
      email,
      name,
      password: randomPassword,
      keycloakId,
      status: 'active'
    });
  }
}
