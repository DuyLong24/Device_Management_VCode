import { Type } from 'class-transformer';
import { IsEmail, IsString, IsEnum, IsOptional, IsBoolean, MinLength, IsDateString, IsInt } from 'class-validator';

// Filters for listing users
export class UserManagementFilterDto {
    @IsOptional()
    @IsString()
    keyword?: string; // Search email hoặc name

    @IsOptional()
    @IsString()
    roleCode?: string; // Mã role: 'super_admin', 'admin', 'user'

    @IsOptional()
    @IsEnum(['ACTIVE', 'LOCKED', 'PENDING'])
    status?: string;

    @IsOptional()
    @IsDateString()
    fromDate?: string;

    @IsOptional()
    @IsDateString()
    toDate?: string;

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    page?: number = 1;

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    limit?: number = 20;
}

// DTO để tạo user mới
export class CreateUserManagementDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(1)
    name: string;

    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @IsString()
    roleCode: 'super_admin' | 'admin' | 'user';

    @IsString()
    @MinLength(8)
    temporaryPassword: string;

    @IsOptional()
    @IsBoolean()
    mustChangePassword?: boolean = true;
}

// DTO để update user
export class UpdateUserManagementDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @IsOptional()
    @IsString()
    roleCode?: 'super_admin' | 'admin' | 'user';
}

// DTO để reset password
export class ResetPasswordDto {
    @IsString()
    @MinLength(8)
    newPassword: string;

    @IsOptional()
    @IsBoolean()
    mustChange?: boolean = true;
}

// Response DTO (transformed cho frontend)
export class UserManagementResponseDto {
    id: string;
    email: string;
    name: string;
    phoneNumber: string;
    role: string;
    status: 'ACTIVE' | 'LOCKED' | 'PENDING';
    createdAt: Date;
    lastLoginAt?: Date;
    mustChangePassword?: boolean;
}
