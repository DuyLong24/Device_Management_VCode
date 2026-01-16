import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FncRole } from '../fnc-roles/entities/fnc-role.entity';
import { KeycloakAdminService } from './keycloak-admin.service';

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  total: number;
}

@Injectable()
export class SyncService {
  constructor(
    @InjectModel(FncRole.name) private fncRoleModel: Model<FncRole>,
    private readonly keycloakAdminService: KeycloakAdminService,
  ) {}

  async syncKeycloak(): Promise<SyncResult> {
    try {
      // Read all FncRoles from MongoDB
      const roles = await this.fncRoleModel.find().exec();
      
      if (roles.length === 0) {
        return { created: 0, updated: 0, skipped: 0, total: 0 };
      }

      // Transform roles for Keycloak sync
      const keycloakRoles = roles.map(role => ({
        code: role.code,
        permissions: role.permissions,
      }));

      // Sync with Keycloak
      const syncResult = await this.keycloakAdminService.syncRoles(keycloakRoles);

      return {
        ...syncResult,
        total: roles.length,
      };
    } catch (error) {
      throw new Error(`Failed to sync with Keycloak: ${error.message}`);
    }
  }

  async getUserBasePermissions(userId: string): Promise<{
    roles: string[];
    clientRoles: string[];
    basePerms: string[];
  }> {
    return this.keycloakAdminService.getUserPermissions(userId);
  }

  async debugRolePermissions(roleCode: string): Promise<{
    realmRole: any;
    clientRoles: any[];
    composites: any[];
  }> {
    return this.keycloakAdminService.debugRolePermissions(roleCode);
  }
}
