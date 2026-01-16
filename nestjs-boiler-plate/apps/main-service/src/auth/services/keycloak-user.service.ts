import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface KeycloakUser {
  id?: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  emailVerified?: boolean;
  credentials?: Array<{
    type: string;
    value: string;
    temporary: boolean;
  }>;
}

export interface KeycloakRole {
  id?: string;
  name: string;
  description?: string;
}

@Injectable()
export class KeycloakUserService {
  private readonly logger = new Logger(KeycloakUserService.name);
  private readonly baseUrl: string;
  private readonly realm: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly adminUsername: string;
  private readonly adminPassword: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('KEYCLOAK_BASE_URL') || '';
    this.realm = this.configService.get<string>('KEYCLOAK_REALM') || '';
    this.clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET') || '';
    this.adminUsername = this.configService.get<string>('KEYCLOAK_ADMIN_USERNAME') || '';
    this.adminPassword = this.configService.get<string>('KEYCLOAK_ADMIN_PASSWORD') || '';
  }

  async getAdminToken(): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/realms/master/protocol/openid_connect/token`,
          new URLSearchParams({
            grant_type: 'password',
            client_id: 'admin-cli',
            username: this.adminUsername,
            password: this.adminPassword,
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      return response.data.access_token;
    } catch (error) {
      this.logger.error('Failed to get admin token', error);
      throw new BadRequestException('Failed to authenticate with Keycloak');
    }
  }

  async createUser(user: KeycloakUser): Promise<string> {
    try {
      const adminToken = await this.getAdminToken();

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/admin/realms/${this.realm}/users`,
          user,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      // Extract user ID from Location header
      const location = response.headers.location;
      if (location) {
        const userId = location.split('/').pop();
        this.logger.log(`User created successfully: ${userId}`);
        return userId;
      }

      throw new BadRequestException('Failed to create user in Keycloak');
    } catch (error) {
      this.logger.error('Failed to create user', error);
      throw new BadRequestException('Failed to create user in Keycloak');
    }
  }

  async updateUser(userId: string, user: Partial<KeycloakUser>): Promise<void> {
    try {
      const adminToken = await this.getAdminToken();

      await firstValueFrom(
        this.httpService.put(
          `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}`,
          user,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`User updated successfully: ${userId}`);
    } catch (error) {
      this.logger.error('Failed to update user', error);
      throw new BadRequestException('Failed to update user in Keycloak');
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const adminToken = await this.getAdminToken();

      await firstValueFrom(
        this.httpService.delete(
          `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          },
        ),
      );

      this.logger.log(`User deleted successfully: ${userId}`);
    } catch (error) {
      this.logger.error('Failed to delete user', error);
      throw new BadRequestException('Failed to delete user in Keycloak');
    }
  }

  async getUserByEmail(email: string): Promise<KeycloakUser | null> {
    try {
      const adminToken = await this.getAdminToken();

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/admin/realms/${this.realm}/users?email=${email}`,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          },
        ),
      );

      const users = response.data;
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      this.logger.error('Failed to get user by email', error);
      return null;
    }
  }

  async assignRoleToUser(userId: string, roleName: string): Promise<void> {
    try {
      const adminToken = await this.getAdminToken();

      // First, get the role by name
      const roleResponse = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/admin/realms/${this.realm}/roles/${roleName}`,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          },
        ),
      );

      const role = roleResponse.data;

      // Assign role to user
      await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
          [role],
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Role ${roleName} assigned to user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to assign role to user', error);
      throw new BadRequestException('Failed to assign role in Keycloak');
    }
  }

  async removeRoleFromUser(userId: string, roleName: string): Promise<void> {
    try {
      const adminToken = await this.getAdminToken();

      // First, get the role by name
      const roleResponse = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/admin/realms/${this.realm}/roles/${roleName}`,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          },
        ),
      );

      const role = roleResponse.data;

      // Remove role from user
      await firstValueFrom(
        this.httpService.delete(
          `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
          {
            data: [role],
            headers: {
              Authorization: `Bearer ${adminToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Role ${roleName} removed from user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to remove role from user', error);
      throw new BadRequestException('Failed to remove role in Keycloak');
    }
  }

  async syncUserToKeycloak(user: any): Promise<string | null> {
    try {
      // Check if user already exists in Keycloak
      const existingUser = await this.getUserByEmail(user.email);
      
      const keycloakUser: KeycloakUser = {
        username: user.username,
        email: user.email,
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
        enabled: user.status === 'active',
        emailVerified: true,
      };

      if (existingUser) {
        // Update existing user
        await this.updateUser(existingUser.id!, keycloakUser);
        return existingUser.id!;
      } else {
        // Create new user
        return await this.createUser(keycloakUser);
      }
    } catch (error) {
      this.logger.error('Failed to sync user to Keycloak', error);
      return null;
    }
  }
}
