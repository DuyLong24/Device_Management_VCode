import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Put,
  Delete,
  Param,
  HttpStatus,
  HttpCode,
  Patch,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { Roles, AuthenticatedUser } from 'nest-keycloak-connect';
import { UserService } from '../services/user.service';
import { FncRoleService } from '../../fnc-roles/services/fnc-role.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { SetPasswordDto } from '../dto/set-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { UpdateMyProfileDto } from '../dto/update-my-profile.dto';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly fncRoleService: FncRoleService,
  ) { }

  @Get('me')
  async getMyProfile(@AuthenticatedUser() user: any) {
    if (!user || !user.sub) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Tự động đồng bộ từ Keycloak sang MongoDB
    const mongoUser = await this.userService.syncFromKeycloak(user);

    // Populate funcRoleId to get role details
    await mongoUser.populate('funcRoleId');
    const role = mongoUser.funcRoleId as any;

    // Return profile data
    return {
      id: mongoUser._id || mongoUser.id,
      username: mongoUser.username,
      email: mongoUser.email,
      name: mongoUser.name,
      phoneNumber: mongoUser.phoneNumber || null,
      dateOfBirth: mongoUser.dateOfBirth || null,
      roles: role ? [role.code] : [],
      permissions: role?.permissions || [],
      createdAt: (mongoUser as any).createdAt,
    };
  }

  @Get('permissions/me')
  async getMyPermissions(@AuthenticatedUser() user: any) {
    if (!user || !user.sub) {
      return { permissions: [] };
    }

    // Tự động đồng bộ từ Keycloak sang MongoDB
    const mongoUser = await this.userService.syncFromKeycloak(user);
    if (!mongoUser || !mongoUser.funcRoleId) {
      return { permissions: [] };
    }

    // Lấy role theo ID
    const role = await this.fncRoleService.findById(mongoUser.funcRoleId);
    if (!role) {
      return { permissions: [] };
    }

    // Kiểm tra super admin
    if (role.code === 'super_admin' || role.code === 'SUPER_ADMIN') {
      return { permissions: ['*'] };
    }

    return { permissions: role.permissions || [] };
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  async changeMyPassword(
    @AuthenticatedUser() user: any,
    @Body() changePasswordDto: Omit<ChangePasswordDto, 'userId'>
  ) {
    if (!user || !user.sub) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    const keycloakId = user.sub;
    const mongoUser = await this.userService.findByKeycloakId(keycloakId);

    if (!mongoUser) {
      throw new NotFoundException('Thông tin tài khoản không tồn tại');
    }

    // Gọi service changePassword với userId từ user đã xác thực
    const fullDto: ChangePasswordDto = {
      ...changePasswordDto,
      userId: mongoUser._id?.toString() || mongoUser.id,
    };

    return this.userService.changePassword(fullDto);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  async updateMyProfile(
    @AuthenticatedUser() user: any,
    @Body() updateDto: UpdateMyProfileDto
  ) {
    if (!user || !user.sub) {
      throw new NotFoundException('User not authenticated');
    }

    const keycloakId = user.sub;
    const mongoUser = await this.userService.findByKeycloakId(keycloakId);

    if (!mongoUser) {
      throw new NotFoundException('User profile not found');
    }

    const userId = mongoUser._id?.toString() || mongoUser.id;
    return this.userService.updateMyProfile(userId, updateDto);
  }

  @Post()
  // @Roles({ roles: ['super_admin', 'superadmin', 'Super admin'] })
  @HttpCode(HttpStatus.CREATED)
  // @Permissions('create_user', 'manage_users')
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  // @Roles({ roles: ['admin', 'Admin', 'super_admin', 'superadmin', 'Super admin'] })
  async findAll() {
    return this.userService.findAll();
  }

  @Get('by-email')
  async getByEmail(@Query('email') email: string) {
    return this.userService.getByEmail(email);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Put(':id')
  // @Roles({ roles: ['super_admin', 'superadmin', 'Super admin'] })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  // @Roles({ roles: ['super_admin', 'superadmin', 'Super admin'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.userService.delete(id);
  }

  @Patch(':id/set-password')
  async setPassword(@Param('id') id: string, @Body() setPasswordDto: SetPasswordDto) {
    // Override userId từ param để đảm bảo consistency
    setPasswordDto.userId = id;
    return this.userService.setPassword(setPasswordDto);
  }

  @Patch(':id/change-password')
  async changePassword(@Param('id') id: string, @Body() changePasswordDto: ChangePasswordDto) {
    // Override userId từ param để đảm bảo consistency
    changePasswordDto.userId = id;
    return this.userService.changePassword(changePasswordDto);
  }

  @Patch(':id/assign-role')
  async assignRole(@Param('id') id: string, @Body() { roleCode }: { roleCode: string }) {
    await this.userService.assignRole(id, roleCode);
    return { message: `Role ${roleCode} assigned successfully` };
  }

  @Patch(':id/remove-role')
  async removeRole(@Param('id') id: string, @Body() { roleCode }: { roleCode: string }) {
    await this.userService.removeRole(id, roleCode);
    return { message: `Role ${roleCode} removed successfully` };
  }
}
