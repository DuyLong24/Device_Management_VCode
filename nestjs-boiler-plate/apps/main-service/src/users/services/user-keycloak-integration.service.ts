import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class UserKeycloakIntegrationService {
  private readonly logger = new Logger(UserKeycloakIntegrationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) { }

  async syncUserToKeycloak(user: any): Promise<string | null> {
    const authStrategy = this.configService.get<string>('AUTH_STRATEGY');
    this.logger.log(`[KeycloakSync] Strategy: ${authStrategy}`);

    if (authStrategy !== 'keycloak' && authStrategy !== 'both') {
      this.logger.log('[KeycloakSync] Skipping sync: Strategy is not keycloak or both');
      return null;
    }

    try {
      // Lấy admin token
      const adminToken = await this.getAdminToken();
      if (!adminToken) {
        this.logger.error('[KeycloakSync] Failed to get Keycloak admin token');
        return null;
      }

      // Kiểm tra xem user đã tồn tại chưa
      this.logger.log(`[KeycloakSync] Checking existence for email: ${user.email}`);
      const existingUser = await this.getUserByEmail(user.email, adminToken);

      const keycloakUser = {
        username: user.username,
        email: user.email,
        credentials: user.password ? [{ type: 'password', value: user.password, temporary: false }] : undefined,
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
        enabled: user.status === 'ACTIVE',
        emailVerified: true,
      };

      if (existingUser) {
        this.logger.log(`[KeycloakSync] User found (ID: ${existingUser.id}). Updating...`);
        // Không cập nhật mật khẩu trong quá trình đồng bộ nếu không được cung cấp hoặc là placeholder
        if (!user.password || user.password === '***') {
          delete keycloakUser.credentials;
        }
        delete (keycloakUser as any).username;

        await this.updateKeycloakUser(existingUser.id, keycloakUser, adminToken);
        this.logger.log(`[KeycloakSync] Update successful for ID: ${existingUser.id}`);
        return existingUser.id;
      } else {
        this.logger.log(`[KeycloakSync] User not found. Creating...`);
        const newId = await this.createKeycloakUser(keycloakUser, adminToken);
        this.logger.log(`[KeycloakSync] Creation successful. New ID: ${newId}`);
        return newId;
      }
    } catch (error: any) {
      this.logger.error('[KeycloakSync] Fatal error during sync:', error.response?.data || error.message);
      return null;
    }
  }

  async deleteUserFromKeycloak(userEmail: string): Promise<void> {
    const authStrategy = this.configService.get<string>('AUTH_STRATEGY');
    if (authStrategy !== 'keycloak' && authStrategy !== 'both') return;

    try {
      const adminToken = await this.getAdminToken();
      if (!adminToken) return;

      const keycloakUser = await this.getUserByEmail(userEmail, adminToken);
      if (keycloakUser?.id) {
        await this.deleteKeycloakUser(keycloakUser.id, adminToken);
      }
    } catch (error) {
      this.logger.error('Failed to delete user from Keycloak:', error);
    }
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const authStrategy = this.configService.get<string>('AUTH_STRATEGY');
    if (authStrategy !== 'keycloak' && authStrategy !== 'both') {
      return false;
    }

    try {
      const adminToken = await this.getAdminToken();
      if (!adminToken) {
        this.logger.warn('[KeycloakSync] Unable to get admin token for email check');
        return false;
      }

      const existingUser = await this.getUserByEmail(email, adminToken);
      return !!existingUser;
    } catch (error) {
      this.logger.error(`[KeycloakSync] Error checking email existence: ${error.message}`);
      return false; // Fail open
    }
  }


  async assignRoleInKeycloak(userEmail: string, roleCode: string): Promise<void> {
    const authStrategy = this.configService.get<string>('AUTH_STRATEGY');
    if (authStrategy !== 'keycloak' && authStrategy !== 'both') return;

    try {
      const adminToken = await this.getAdminToken();
      if (!adminToken) {
        throw new Error('Không thể lấy token admin từ Keycloak');
      }

      const keycloakUser = await this.getUserByEmail(userEmail, adminToken);
      if (!keycloakUser?.id) {
        throw new Error(`User ${userEmail} không tồn tại trong Keycloak`);
      }

      this.logger.log(`[KeycloakSync] Gán quyền '${roleCode}' cho user ${keycloakUser.id}`);
      await this.assignRole(keycloakUser.id, roleCode, adminToken);
    } catch (error) {
      this.logger.error(`[KeycloakSync] Không thể gán quyền '${roleCode}' cho user ${userEmail}:`, error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Không thể gán quyền '${roleCode}' cho user ${userEmail}: ${message}`);
    }
  }

  async resetPasswordInKeycloak(
    keycloakUserId: string,
    newPassword: string,
    temporary: boolean = true,
  ): Promise<void> {
    const authStrategy = this.configService.get<string>('AUTH_STRATEGY');
    if (authStrategy !== 'keycloak' && authStrategy !== 'both') return;

    try {
      this.logger.log(`[KeycloakSync] Resetting password for Keycloak ID: ${keycloakUserId}`);
      const adminToken = await this.getAdminToken();
      if (!adminToken) return;

      const baseUrl = this.configService.get<string>('KEYCLOAK_BASE_URL');
      const realm = this.configService.get<string>('KEYCLOAK_REALM');

      await this.httpService.axiosRef.put(
        `${baseUrl}/admin/realms/${realm}/users/${keycloakUserId}/reset-password`,
        {
          type: 'password',
          value: newPassword,
          temporary: temporary,
        },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(`[KeycloakSync] Password reset successful`);
    } catch (error: any) {
      this.logger.error('Failed to reset password in Keycloak:', error.response?.data || error.message);
    }
  }

  async enableUserInKeycloak(keycloakUserId: string): Promise<void> {
    const authStrategy = this.configService.get<string>('AUTH_STRATEGY');
    if (authStrategy !== 'keycloak' && authStrategy !== 'both') return;

    try {
      this.logger.log(`[KeycloakSync] Enabling user ${keycloakUserId}`);
      const adminToken = await this.getAdminToken();
      if (!adminToken) return;

      await this.updateKeycloakUserById(keycloakUserId, { enabled: true }, adminToken);
    } catch (error) {
      this.logger.error('Failed to enable user in Keycloak:', error);
    }
  }

  async disableUserInKeycloak(keycloakUserId: string): Promise<void> {
    const authStrategy = this.configService.get<string>('AUTH_STRATEGY');
    if (authStrategy !== 'keycloak' && authStrategy !== 'both') return;

    try {
      this.logger.log(`[KeycloakSync] Disabling user ${keycloakUserId}`);
      const adminToken = await this.getAdminToken();
      if (!adminToken) return;

      await this.updateKeycloakUserById(keycloakUserId, { enabled: false }, adminToken);
    } catch (error) {
      this.logger.error('Failed to disable user in Keycloak:', error);
    }
  }

  private async getAdminToken(): Promise<string | null> {
    try {
      const baseUrl = this.configService.get<string>('KEYCLOAK_BASE_URL');
      const adminUsername = this.configService.get<string>('KEYCLOAK_ADMIN_USERNAME') || this.configService.get<string>('KEYCLOAK_ADMIN');
      const adminPassword = this.configService.get<string>('KEYCLOAK_ADMIN_PASSWORD');
      const clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET');
      const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID');

      // DEBUG LOG
      this.logger.debug('[KeycloakSync] Getting Admin Token with:', {
        baseUrl,
        hasUsername: !!adminUsername,
        username: adminUsername,
        hasPassword: !!adminPassword
      });

      if (!baseUrl || !adminUsername || !adminPassword) {
        this.logger.error('[KeycloakSync] Missing Keycloak Admin Credentials in .env');
        return null;
      }

      const body = new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: adminUsername,
        password: adminPassword,
      });

      const response = await this.httpService.axiosRef.post(
        `${baseUrl}/realms/master/protocol/openid-connect/token`,
        body.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return response.data.access_token;
    } catch (error: any) {
      this.logger.error('[KeycloakSync] Failed to get admin token:', error.response?.data || error.message);
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
    } catch (error: any) {
      this.logger.error('[KeycloakSync] Failed to get user by email:', error.response?.data || error.message);
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
    } catch (error: any) {
      this.logger.error('[KeycloakSync] Failed to create user in Keycloak:', error.response?.data || error.message);
      return null;
    }
  }

  private async updateKeycloakUser(userId: string, user: any, adminToken: string): Promise<void> {
    try {
      const baseUrl = this.configService.get<string>('KEYCLOAK_BASE_URL');
      const realm = this.configService.get<string>('KEYCLOAK_REALM');

      this.logger.log(`[KeycloakSync] Sending update request to: ${baseUrl}/admin/realms/${realm}/users/${userId}`);

      // Fix Security: Do not log credentials
      const { credentials, ...userPayloadWithoutCredentials } = user;
      this.logger.debug(`[KeycloakSync] Payload: ${JSON.stringify(userPayloadWithoutCredentials)}`);

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
    } catch (error: any) {
      this.logger.error('[KeycloakSync] Failed to update user in Keycloak:', error.response?.data || error.message);
      throw error;
    }
  }

  private async updateKeycloakUserById(userId: string, updates: any, adminToken: string): Promise<void> {
    try {
      const baseUrl = this.configService.get<string>('KEYCLOAK_BASE_URL');
      const realm = this.configService.get<string>('KEYCLOAK_REALM');

      await this.httpService.axiosRef.put(
        `${baseUrl}/admin/realms/${realm}/users/${userId}`,
        updates,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error: any) {
      this.logger.error('Failed to update user by ID in Keycloak:', error.response?.data || error.message);
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
    } catch (error: any) {
      this.logger.error('Failed to delete user from Keycloak:', error.response?.data || error.message);
    }
  }

  private async assignRole(userId: string, roleName: string, adminToken: string): Promise<void> {
    try {
      const baseUrl = this.configService.get<string>('KEYCLOAK_BASE_URL');
      const realm = this.configService.get<string>('KEYCLOAK_REALM');

      // map role trong app với role trong keycloak
      const roleMapping: Record<string, string> = {
        'super_admin': 'Super admin',
        'admin': 'Admin',
        'user': 'User',
      };
      const kcRoleName = roleMapping[roleName] || roleName;

      const roleResponse = await this.httpService.axiosRef.get(
        `${baseUrl}/admin/realms/${realm}/roles/${kcRoleName}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
      );

      const role = roleResponse.data;

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
    } catch (error: any) {
      const errorDetail = error.response?.data || error.message;
      this.logger.error(`[KeycloakSync] Failed to assign role '${roleName}':`, errorDetail);

      // error message
      if (error.response?.status === 404) {
        throw new Error(`Quyền '${roleName}' không tồn tại trong Keycloak`);
      }
      throw new Error(`Failed to assign role: ${JSON.stringify(errorDetail)}`);
    }
  }
}

