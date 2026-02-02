import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { FncRoleService } from '../../fnc-roles/services/fnc-role.service';
import { UserKeycloakIntegrationService } from './user-keycloak-integration.service';
import {
    UserManagementFilterDto,
    CreateUserManagementDto,
    UpdateUserManagementDto,
    UserManagementResponseDto,
} from '../dto/user-management.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserManagementService {
    private readonly logger = new Logger(UserManagementService.name);
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        private fncRoleService: FncRoleService,
        private keycloakService: UserKeycloakIntegrationService,
        private configService: ConfigService,
    ) { }

    async findAllForManagement(filters: UserManagementFilterDto) {
        const query: any = {};

        if (filters.keyword) {
            query.$or = [
                { email: { $regex: filters.keyword, $options: 'i' } },
                { name: { $regex: filters.keyword, $options: 'i' } },
            ];
        }

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.fromDate || filters.toDate) {
            query.createdAt = {};
            if (filters.fromDate) {
                query.createdAt.$gte = new Date(filters.fromDate);
            }
            if (filters.toDate) {
                query.createdAt.$lte = new Date(filters.toDate);
            }
        }

        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            this.userModel
                .find(query)
                .populate('funcRoleId')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .exec(),
            this.userModel.countDocuments(query),
        ]);

        let filteredUsers = users;
        if (filters.roleCode) {
            filteredUsers = users.filter(
                (user) => (user.funcRoleId as any)?.code === filters.roleCode,
            );
        }

        return {
            results: filteredUsers.map((u) => this.transformToResponse(u)),
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            totalResults: filters.roleCode ? filteredUsers.length : total,
        };
    }

    async createUserForManagement(dto: CreateUserManagementDto) {
        // Kiểm tra email tồn tại trong MongoDB
        const existingInMongo = await this.userModel.findOne({ email: dto.email });
        if (existingInMongo) {
            throw new ConflictException(`Email ${dto.email} already exists in the system`);
        }

        // Kiểm tra email tồn tại trong Keycloak
        const authStrategy = this.configService.get<string>('AUTH_STRATEGY');
        if (authStrategy === 'keycloak' || authStrategy === 'both') {
            try {
                const existingInKeycloak = await this.keycloakService.checkEmailExists(dto.email);
                if (existingInKeycloak) {
                    throw new ConflictException(`Email ${dto.email} already exists in authentication system`);
                }
            } catch (error) {
                if (error instanceof ConflictException) {
                    throw error;
                }
                this.logger.warn(`Unable to check Keycloak for email existence: ${error.message}`);
            }
        }

        // Kiểm tra tồn tại với case-insensitive logic
        this.logger.debug(`Searching for role: ${dto.roleCode}`);
        let role = await this.fncRoleService.findAll({ code: dto.roleCode });

        if (!role || role.length === 0) {
            // Try case-insensitive search
            role = await this.fncRoleService.findAll({ code: { $regex: new RegExp(`^${dto.roleCode}$`, 'i') } });
        }

        if (!role || role.length === 0) {
            this.logger.error(`Role ${dto.roleCode} not found in DB`);
            throw new NotFoundException(`Role ${dto.roleCode} not found in database`);
        }

        const hashedPassword = await bcrypt.hash(dto.temporaryPassword, 10);

        // Tạo user trong MongoDB
        const user = new this.userModel({
            email: dto.email,
            username: dto.email,
            name: dto.name,
            phoneNumber: dto.phoneNumber,
            password: hashedPassword,
            funcRoleId: role[0]._id,
            status: 'ACTIVE',
            isPasswordChange: !dto.mustChangePassword,
            dayPasswordChange: new Date(),
        });


        await user.save();

        // Sync to Keycloak
        try {
            const keycloakId = await this.keycloakService.syncUserToKeycloak({
                username: user.email,
                email: user.email,
                name: user.name,
                password: dto.temporaryPassword, // Raw password
                status: user.status,
                temporary: dto.mustChangePassword,
                requiredActions: dto.mustChangePassword ? ['UPDATE_PASSWORD'] : [],
            });

            if (!keycloakId) {
                // Rollback MongoDB user if Keycloak sync fails
                await this.userModel.deleteOne({ _id: user._id });
                throw new Error('Failed to create user in Keycloak authentication system');
            }

            user.keycloakId = keycloakId;
            await user.save();

            // Assign role in Keycloak
            await this.keycloakService.assignRoleInKeycloak(user.email, dto.roleCode);
            this.logger.log(`User ${user.email} created successfully with Keycloak sync`);
        } catch (error) {
            this.logger.error('Keycloak sync error after user creation', error instanceof Error ? error.stack : error);
            const message = error instanceof Error ? error.message : 'Unknown Keycloak error';
            throw new ConflictException(`User creation failed: ${message}`);
        }

        await user.populate('funcRoleId');
        return this.transformToResponse(user);
    }

    async updateUserForManagement(userId: string, dto: UpdateUserManagementDto) {
        const user = await this.userModel.findById(userId).populate('funcRoleId');
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const oldRoleCode = (user.funcRoleId as any)?.code;

        if (dto.name) user.name = dto.name;
        if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;

        if (dto.roleCode && dto.roleCode !== oldRoleCode) {
            const role = await this.fncRoleService.findAll({ code: dto.roleCode });
            if (!role || role.length === 0) {
                throw new NotFoundException(`Role ${dto.roleCode} not found`);
            }
            user.funcRoleId = role[0]._id as any;
        }

        await user.save();

        // KEYCLOAK SYNC
        if (user.keycloakId) {
            try {
                await this.keycloakService.syncUserToKeycloak({
                    username: user.email,
                    email: user.email,
                    name: user.name,
                    password: '***', // Don't update password on edit
                    status: user.status,
                });

                // Update role if changed
                if (dto.roleCode && dto.roleCode !== oldRoleCode) {
                    await this.keycloakService.assignRoleInKeycloak(user.email, dto.roleCode);
                }
            } catch (error) {
                this.logger.error('Keycloak update failed', error instanceof Error ? error.stack : error);
            }
        }

        await user.populate('funcRoleId');
        return this.transformToResponse(user);
    }

    async lockUser(userId: string) {
        const user = await this.userModel.findById(userId).populate('funcRoleId');
        if (!user) {
            throw new NotFoundException('User not found');
        }

        user.status = 'LOCKED';
        await user.save();

        // KEYCLOAK SYNC - Disable user
        if (user.keycloakId) {
            try {
                await this.keycloakService.disableUserInKeycloak(user.keycloakId);
            } catch (error) {
                this.logger.error('Keycloak disable failed', error instanceof Error ? error.stack : error);
            }
        }

        return this.transformToResponse(user);
    }

    async unlockUser(userId: string) {
        const user = await this.userModel.findById(userId).populate('funcRoleId');
        if (!user) {
            throw new NotFoundException('User not found');
        }

        user.status = 'ACTIVE';
        await user.save();

        // ✅ KEYCLOAK SYNC - Enable user
        if (user.keycloakId) {
            try {
                await this.keycloakService.enableUserInKeycloak(user.keycloakId);
            } catch (error) {
                this.logger.error('Keycloak enable failed', error instanceof Error ? error.stack : error);
            }
        }

        return this.transformToResponse(user);
    }

    async resetPassword(userId: string, newPassword: string, mustChange = true) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // MongoDB - Hash password
        user.password = await bcrypt.hash(newPassword, 10);
        user.isPasswordChange = !mustChange;
        user.dayPasswordChange = new Date();
        await user.save();

        // KEYCLOAK SYNC - Reset password
        if (user.keycloakId) {
            try {
                await this.keycloakService.resetPasswordInKeycloak(
                    user.keycloakId,
                    newPassword,
                    mustChange, // temporary = mustChange
                );
            } catch (error) {
                this.logger.error('Keycloak password reset failed', error instanceof Error ? error.stack : error);
            }
        }
    }

    private transformToResponse(user: any): UserManagementResponseDto {
        const funcRole = user.funcRoleId;

        return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            phoneNumber: user.phoneNumber || '',
            role: this.mapRoleCodeToUI(funcRole?.code),
            status: user.status as any,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt || undefined,
            mustChangePassword: !user.isPasswordChange,
        };
    }

    private mapRoleCodeToUI(code: string): string {
        const mapping = {
            'super_admin': 'SUPER_ADMIN',
            'admin': 'ADMIN',
            'user': 'USER',
        };
        return mapping[code] || code;
    }
}
