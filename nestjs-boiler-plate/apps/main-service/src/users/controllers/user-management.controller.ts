import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { UserManagementService } from '../services/user-management.service';
import {
    UserManagementFilterDto,
    CreateUserManagementDto,
    UpdateUserManagementDto,
    ResetPasswordDto,
} from '../dto/user-management.dto';

@Controller('user-management')
export class UserManagementController {
    constructor(private userManagementService: UserManagementService) { }

    /**
     * GET /users/management - Lấy danh sách users
     */
    @Get()
    async getUsers(@Query() filters: UserManagementFilterDto) {
        return this.userManagementService.findAllForManagement(filters);
    }

    @Get('test')
    async test() {
        return { message: 'User Management Controller is working' };
    }

    /**
     * GET /user-management/by-permission?permission=export.list.approve
     */
    @Get('by-permission')
    async getUsersByPermission(@Query('permission') permission: string) {
        if (!permission) {
            return [];
        }
        return this.userManagementService.findUsersByPermission(permission);
    }

    /**
     * POST /users/management - Tạo user mới
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createUser(@Body() dto: CreateUserManagementDto) {
        return this.userManagementService.createUserForManagement(dto);
    }

    /**
     * PATCH /users/management/:id - Update user
     */
    @Patch(':id')
    async updateUser(
        @Param('id') id: string,
        @Body() dto: UpdateUserManagementDto,
    ) {
        return this.userManagementService.updateUserForManagement(id, dto);
    }

    /**
     * PATCH /users/management/:id/lock - Lock user
     */
    @Patch(':id/lock')
    async lockUser(@Param('id') id: string) {
        return this.userManagementService.lockUser(id);
    }

    /**
     * PATCH /users/management/:id/unlock - Unlock user
     */
    @Patch(':id/unlock')
    async unlockUser(@Param('id') id: string) {
        return this.userManagementService.unlockUser(id);
    }

    /**
     * POST /users/management/:id/reset-password - Reset password
     */
    @Post(':id/reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(
        @Param('id') id: string,
        @Body() dto: ResetPasswordDto,
    ) {
        await this.userManagementService.resetPassword(
            id,
            dto.newPassword,
            dto.mustChange ?? true,
        );
        return { success: true, message: 'Password reset successfully' };
    }
}
