import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface KeycloakRole {
  id?: string;
  name: string;
  description?: string;
  composite?: boolean;
  clientRole?: boolean;
  containerId?: string;
}

interface KeycloakClientRole extends KeycloakRole {
  clientRole: true;
  containerId: string;
}

interface KeycloakRealmRole extends KeycloakRole {
  clientRole: false;
}

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
}

@Injectable()
export class KeycloakAdminService {
  private readonly kcClient: AxiosInstance;
  private readonly baseUrl: string;
  private readonly realm: string;
  private readonly clientId: string;
  private readonly adminUser: string;
  private readonly adminPass: string;
  private accessToken: string | null = null;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('KEYCLOAK_BASE_URL', 'http://localhost:8081');
    this.realm = this.configService.get<string>('KEYCLOAK_REALM', 'demo');
    this.clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID', 'your-api');
    this.adminUser = this.configService.get<string>('KEYCLOAK_ADMIN_USERNAME', 'admin');
    this.adminPass = this.configService.get<string>('KEYCLOAK_ADMIN_PASSWORD', 'admin');

    this.kcClient = axios.create({
      baseURL: `${this.baseUrl}/admin/realms/${this.realm}`,
      timeout: 30000,
    });

    // Add request interceptor to include access token
    this.kcClient.interceptors.request.use(async (config) => {
      if (!this.accessToken) {
        await this.authenticate();
      }
      config.headers.Authorization = `Bearer ${this.accessToken}`;
      return config;
    });

    // Add response interceptor to handle token refresh
    this.kcClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await this.authenticate();
          const originalRequest = error.config;
          originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
          return this.kcClient.request(originalRequest);
        }
        return Promise.reject(error);
      }
    );
  }

  private async authenticate(): Promise<void> {
    try {
      const response = await axios.post(`${this.baseUrl}/realms/master/protocol/openid-connect/token`, {
        username: this.adminUser,
        password: this.adminPass,
        grant_type: 'password',
        client_id: 'admin-cli',
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.accessToken = response.data.access_token;
    } catch (error) {
      throw new HttpException(
        `Failed to authenticate with Keycloak: ${error.message}`,
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  private async getClientId(): Promise<string> {
    try {
      const response = await this.kcClient.get('/clients', {
        params: { clientId: this.clientId },
      });
      
      if (response.data.length === 0) {
        console.warn(`Client ${this.clientId} not found in realm ${this.realm}`);
        console.warn('Available clients:', response.data.map((c: any) => c.clientId));
        
        // Try to create the client
        console.log(`Attempting to create client ${this.clientId}...`);
        return await this.createClient();
      }
      
      return response.data[0].id;
    } catch (error) {
      console.error('Get client ID error details:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        clientId: this.clientId,
        realm: this.realm
      });
      
      throw new HttpException(
        `Failed to get client ID: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async createClient(): Promise<string> {
    try {
      const clientConfig = {
        clientId: this.clientId,
        name: this.clientId,
        enabled: true,
        publicClient: false,
        standardFlowEnabled: true,
        directAccessGrantsEnabled: true,
        serviceAccountsEnabled: true,
        authorizationServicesEnabled: true,
        redirectUris: ['http://localhost:3000/*'],
        webOrigins: ['http://localhost:3000'],
      };

      const response = await this.kcClient.post('/clients', clientConfig);
      
      // Get the created client ID
      const clientResponse = await this.kcClient.get('/clients', {
        params: { clientId: this.clientId },
      });
      
      if (clientResponse.data.length === 0) {
        throw new Error('Failed to retrieve created client');
      }
      
      console.log(`Successfully created client ${this.clientId} with ID: ${clientResponse.data[0].id}`);
      return clientResponse.data[0].id;
    } catch (error) {
      console.error('Create client error:', error.response?.data || error.message);
      throw new Error(`Failed to create client ${this.clientId}: ${error.message}`);
    }
  }

  private async createOrUpdateClientRole(roleName: string, clientId: string, permission?: string): Promise<KeycloakClientRole> {
    try {
      // Try to get existing role
      const response = await this.kcClient.get(`/clients/${clientId}/roles/${roleName}`);
      const existingRole = response.data;
      
      // Update existing role with description if permission is provided
      if (permission && !existingRole.description) {
        existingRole.description = `Permission: ${permission}`;
        await this.kcClient.put(`/clients/${clientId}/roles/${roleName}`, existingRole);
      }
      
      return existingRole;
    } catch (error) {
      if (error.response?.status === 404) {
        // Create new role
        const newRole: KeycloakClientRole = {
          name: roleName,
          description: permission ? `Permission: ${permission}` : undefined,
          clientRole: true,
          containerId: clientId,
        };
        
        const response = await this.kcClient.post(`/clients/${clientId}/roles`, newRole);
        return response.data;
      }
      throw error;
    }
  }

  private async createOrUpdateRealmRole(roleName: string): Promise<KeycloakRealmRole> {
    try {
      // Try to get existing role
      const response = await this.kcClient.get(`/roles/${roleName}`);
      const existingRole = response.data;
      
      // Update existing role
      await this.kcClient.put(`/roles/${roleName}`, existingRole);
      return existingRole;
    } catch (error) {
      if (error.response?.status === 404) {
        // Create new role
        const newRole: KeycloakRealmRole = {
          name: roleName,
          clientRole: false,
        };
        
        const response = await this.kcClient.post('/roles', newRole);
        return response.data;
      }
      throw error;
    }
  }

  private async setRealmRoleComposites(roleName: string, clientRoles: string[]): Promise<void> {
    const clientId = await this.getClientId();
    
    try {
      // First, get the client role details to get their IDs
      const compositeRoles = [];
      
      for (const clientRoleName of clientRoles) {
        try {
          const response = await this.kcClient.get(`/clients/${clientId}/roles/${clientRoleName}`);
          const clientRole = response.data;
          
          compositeRoles.push({
            id: clientRole.id,
            name: clientRole.name,
            clientRole: true,
            containerId: clientId,
          });
        } catch (error) {
          console.warn(`Failed to get client role ${clientRoleName}:`, error.message);
        }
      }

      if (compositeRoles.length > 0) {
        console.log(`Setting ${compositeRoles.length} composite roles for realm role ${roleName}:`, 
          compositeRoles.map(r => r.name));
        
        await this.kcClient.post(`/roles/${roleName}/composites`, compositeRoles);
        console.log(`Successfully set composites for realm role ${roleName}`);
      } else {
        console.warn(`No valid client roles found for realm role ${roleName}`);
      }
    } catch (error) {
      console.error(`Failed to set composites for realm role ${roleName}:`, error.message);
      throw error;
    }
  }

  private async ensureProtocolMapper(clientId: string): Promise<void> {
    try {
      // Check if mapper already exists
      const response = await this.kcClient.get(`/clients/${clientId}/protocol-mappers`);
      const existingMappers = response.data;
      
      const mapperExists = existingMappers.some((mapper: any) => 
        mapper.name === 'perms' && mapper.protocolMapper === 'oidc-usermodel-client-role-mapper'
      );

      if (!mapperExists) {
        const mapper = {
          name: 'perms',
          protocol: 'openid-connect',
          protocolMapper: 'oidc-usermodel-client-role-mapper',
          config: {
            'claim.name': 'perms',
            'multivalued': 'true',
            'access.token.claim': 'true',
            'usermodel.clientRoleMapping.clientId': this.clientId,
          },
        };

        await this.kcClient.post(`/clients/${clientId}/protocol-mappers`, mapper);
      }
    } catch (error) {
      // Log the error for debugging
      console.error('Protocol mapper error details:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      // If it's a 404, the client might not exist or the endpoint is wrong
      if (error.response?.status === 404) {
        console.warn(`Client ${this.clientId} (ID: ${clientId}) not found or protocol mapper endpoint not available`);
        // Continue without protocol mapper for now
        return;
      }
      
      throw new HttpException(
        `Failed to ensure protocol mapper: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async syncRoles(roles: Array<{ code: string; permissions: string[] }>): Promise<SyncResult> {
    const result: SyncResult = { created: 0, updated: 0, skipped: 0 };
    
    try {
      const clientId = await this.getClientId();

      // Ensure protocol mapper exists (but don't fail if it doesn't work)
      try {
        await this.ensureProtocolMapper(clientId);
      } catch (error) {
        console.warn('Protocol mapper setup failed, continuing without it:', error.message);
      }

      for (const role of roles) {
        try {
          console.log(`Syncing role: ${role.code} with permissions:`, role.permissions);
          
          // Create/update client roles for each permission
          const clientRoles: string[] = [];
          for (const permission of role.permissions) {
            // Keep the same format as database (colon format)
            const clientRoleName = permission;
            console.log(`Creating client role: ${clientRoleName} for permission: ${permission}`);
            
            // Create client role with description containing the original permission
            await this.createOrUpdateClientRole(clientRoleName, clientId, permission);
            clientRoles.push(clientRoleName);
          }

          // Create/update realm role
          console.log(`Creating realm role: ${role.code}`);
          await this.createOrUpdateRealmRole(role.code);

          // Set composites - this is crucial for permission mapping
          console.log(`Setting composites for realm role ${role.code} with client roles:`, clientRoles);
          await this.setRealmRoleComposites(role.code, clientRoles);

          result.updated++;
          console.log(`Successfully synced role: ${role.code} with ${clientRoles.length} client roles`);
        } catch (error) {
          result.skipped++;
          console.error(`Failed to sync role ${role.code}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Sync roles failed:', error.message);
      throw error;
    }

    return result;
  }

  async getUserPermissions(userId: string): Promise<{
    roles: string[];
    clientRoles: string[];
    basePerms: string[];
  }> {
    try {
      const response = await this.kcClient.get(`/users/${userId}/role-mappings`);
      const realmRoles = response.data.realmMappings || [];
      const clientMappings = response.data.clientMappings || {};

      const roles = realmRoles.map((role: any) => role.name);
      const clientRoles: string[] = [];
      const basePerms: string[] = [];

      // Extract client roles and convert to permissions
      for (const [clientName, mapping] of Object.entries(clientMappings)) {
        const clientRolesList = (mapping as any).mappings || [];
        for (const clientRole of clientRolesList) {
          clientRoles.push(clientRole.name);
          // Convert client role name back to permission format (x_y -> x:y)
          const perm = clientRole.name.replace('_', ':');
          basePerms.push(perm);
        }
      }

      return { roles, clientRoles, basePerms };
    } catch (error) {
      throw new HttpException(
        `Failed to get user permissions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async debugRolePermissions(roleCode: string): Promise<{
    realmRole: any;
    clientRoles: any[];
    composites: any[];
  }> {
    try {
      const clientId = await this.getClientId();
      
      // Get realm role details
      const realmRoleResponse = await this.kcClient.get(`/roles/${roleCode}`);
      const realmRole = realmRoleResponse.data;
      
      // Get composite roles
      const compositesResponse = await this.kcClient.get(`/roles/${roleCode}/composites`);
      const composites = compositesResponse.data || [];
      
      // Get client roles details
      const clientRoles = [];
      for (const composite of composites) {
        if (composite.clientRole && composite.containerId === clientId) {
          try {
            const clientRoleResponse = await this.kcClient.get(`/clients/${clientId}/roles/${composite.name}`);
            clientRoles.push(clientRoleResponse.data);
          } catch (error) {
            console.warn(`Failed to get client role ${composite.name}:`, error.message);
          }
        }
      }
      
      return {
        realmRole,
        clientRoles,
        composites
      };
    } catch (error) {
      throw new HttpException(
        `Failed to debug role permissions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
