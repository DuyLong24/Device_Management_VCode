import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class UserKeycloakIntegrationService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async syncUserToKeycloak(user: any): Promise<string | null> {
    const authStrategy = this.configService.get<string>('AUTH_STRATEGY');
    
    if (authStrategy !== 'keycloak' && authStrategy !== 'both') {
      return null; // Skip Keycloak sync if not using Keycloak
    }

    try {
      // Get admin token
      const adminToken = await this.getAdminToken();
      if (!adminToken) {
        console.error('Failed to get Keycloak admin token');
        return null;
      }

      // Check if user exists
      const existingUser = await this.getUserByEmail(user.email, adminToken);
      
      const keycloakUser = {
        username: user.username,
        email: user.email,
        credentials: [{ type: 'password', value: user.password, temporary: false }],
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
        enabled: user.status === 'active',
        emailVerified: true,
      };

      if (existingUser) {
        await this.updateKeycloakUser(existingUser.id, keycloakUser, adminToken);
        return existingUser.id;
      } else {
        return await this.createKeycloakUser(keycloakUser, adminToken);
      }
    } catch (error) {
      console.error('Failed to sync user to Keycloak:', error);
      return null;
    }
  }

  async deleteUserFromKeycloak(userEmail: string): Promise<void> {
    const authStrategy = this.configService.get<string>('AUTH_STRATEGY');
    
    if (authStrategy !== 'keycloak' && authStrategy !== 'both') {
      return; // Skip if not using Keycloak
    }

    try {
      const adminToken = await this.getAdminToken();
      if (!adminToken) return;

      const keycloakUser = await this.getUserByEmail(userEmail, adminToken);
      if (keycloakUser?.id) {
        await this.deleteKeycloakUser(keycloakUser.id, adminToken);
      }
    } catch (error) {
      console.error('Failed to delete user from Keycloak:', error);
    }
  }

  async assignRoleInKeycloak(userEmail: string, roleCode: string): Promise<void> {
    const authStrategy = this.configService.get<string>('AUTH_STRATEGY');
    
    if (authStrategy !== 'keycloak' && authStrategy !== 'both') {
      return; // Skip if not using Keycloak
    }

    try {
      const adminToken = await this.getAdminToken();
      if (!adminToken) return;

      const keycloakUser = await this.getUserByEmail(userEmail, adminToken);
      if (keycloakUser?.id) {
        await this.assignRole(keycloakUser.id, roleCode, adminToken);
      }
    } catch (error) {
      console.error('Failed to assign role in Keycloak:', error);
    }
  }

  private async getAdminToken(): Promise<string | null> {
    try {
      const baseUrl = this.configService.get<string>('KEYCLOAK_BASE_URL');
      const adminUsername = this.configService.get<string>('KEYCLOAK_ADMIN_USERNAME');
      const adminPassword = this.configService.get<string>('KEYCLOAK_ADMIN_PASSWORD');
      const clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET');
      const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID');

      if (!baseUrl || !adminUsername || !adminPassword || !clientSecret) {
        return null;
      }

      const response = await this.httpService.axiosRef.post(
        `${baseUrl}/realms/master/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'password',
          client_id: clientId,
          username: adminUsername,
          password: adminPassword,
          client_secret: clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return response.data.access_token;
    } catch (error) {
      console.error('Failed to get admin token:', error);
      return null;
    }
  }

  private async getUserByEmail(email: string, adminToken: string): Promise<any> {
    try {
      const baseUrl = this.configService.get<string>('KEYCLOAK_BASE_URL');
      const realm = this.configService.get<string>('KEYCLOAK_REALM');

      const response = await this.httpService.axiosRef.get(
        `${baseUrl}/admin/realms/${realm}/users?email=${email}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
      );

      const users = response.data;
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Failed to get user by email:', error);
      return null;
    }
  }

  private async createKeycloakUser(user: any, adminToken: string): Promise<string | null> {
    try {
      const baseUrl = this.configService.get<string>('KEYCLOAK_BASE_URL');
      const realm = this.configService.get<string>('KEYCLOAK_REALM');

      const response = await this.httpService.axiosRef.post(
        `${baseUrl}/admin/realms/${realm}/users`,
        user,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const location = response.headers.location;
      if (location) {
        return location.split('/').pop() || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to create user in Keycloak:', error);
      return null;
    }
  }

  private async updateKeycloakUser(userId: string, user: any, adminToken: string): Promise<void> {
    try {
      const baseUrl = this.configService.get<string>('KEYCLOAK_BASE_URL');
      const realm = this.configService.get<string>('KEYCLOAK_REALM');

      await this.httpService.axiosRef.put(
        `${baseUrl}/admin/realms/${realm}/users/${userId}`,
        user,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error) {
      console.error('Failed to update user in Keycloak:', error);
    }
  }

  private async deleteKeycloakUser(userId: string, adminToken: string): Promise<void> {
    try {
      const baseUrl = this.configService.get<string>('KEYCLOAK_BASE_URL');
      const realm = this.configService.get<string>('KEYCLOAK_REALM');

      await this.httpService.axiosRef.delete(
        `${baseUrl}/admin/realms/${realm}/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
      );
    } catch (error) {
      console.error('Failed to delete user from Keycloak:', error);
    }
  }

  private async assignRole(userId: string, roleName: string, adminToken: string): Promise<void> {
    try {
      const baseUrl = this.configService.get<string>('KEYCLOAK_BASE_URL');
      const realm = this.configService.get<string>('KEYCLOAK_REALM');

      // Get role by name
      const roleResponse = await this.httpService.axiosRef.get(
        `${baseUrl}/admin/realms/${realm}/roles/${roleName}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
      );

      const role = roleResponse.data;

      // Assign role to user
      await this.httpService.axiosRef.post(
        `${baseUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`,
        [role],
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error) {
      console.error('Failed to assign role in Keycloak:', error);
    }
  }
}
