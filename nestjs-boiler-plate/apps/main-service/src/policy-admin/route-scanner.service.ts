import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ResourceTemplate } from './schemas/resource-template.schema';
import { PermissionConfig } from './schemas/permission-config.schema';

export interface ScannedRoute {
  module: string;
  path: string;
  methods: string[];
  controller: string;
  description?: string;
}

export interface ScanResult {
  resourceTemplates: ScannedRoute[];
  suggestedPermissions: Record<string, string[]>;
}

@Injectable()
export class RouteScannerService {
  constructor(
    @InjectModel(ResourceTemplate.name) private resourceTemplateModel: Model<ResourceTemplate>,
    @InjectModel(PermissionConfig.name) private permissionConfigModel: Model<PermissionConfig>,
  ) {}

  private generateSuggestedPermissions(module: string): string[] {
    return [
      `${module}_get`,
      `${module}_post`,
      `${module}_put`,
      `${module}_patch`,
      `${module}_delete`,
      `${module}_manage`,
    ];
  }

  async scanRoutes(): Promise<ScanResult> {
    console.log('🔍 === ROUTE SCANNING START ===');
    
    // For now, return hardcoded routes based on common patterns
    // This can be enhanced later with actual reflection-based scanning
    const resourceTemplates: ScannedRoute[] = [
      // Users module
      {
        module: 'users',
        path: '/users',
        methods: ['GET'],
        controller: 'UsersController',
        description: 'Get all users'
      },
      {
        module: 'users',
        path: '/users',
        methods: ['POST'],
        controller: 'UsersController',
        description: 'Create user'
      },
      {
        module: 'users',
        path: '/users/:id',
        methods: ['GET'],
        controller: 'UsersController',
        description: 'Get user by ID'
      },
      {
        module: 'users',
        path: '/users/:id',
        methods: ['PUT'],
        controller: 'UsersController',
        description: 'Update user'
      },
      {
        module: 'users',
        path: '/users/:id',
        methods: ['DELETE'],
        controller: 'UsersController',
        description: 'Delete user'
      },
      
      // FncRoles module
      {
        module: 'fnc-roles',
        path: '/fnc-roles',
        methods: ['GET'],
        controller: 'FncRoleController',
        description: 'Get all functional roles'
      },
      {
        module: 'fnc-roles',
        path: '/fnc-roles',
        methods: ['POST'],
        controller: 'FncRoleController',
        description: 'Create functional role'
      },
      {
        module: 'fnc-roles',
        path: '/fnc-roles/:id',
        methods: ['GET'],
        controller: 'FncRoleController',
        description: 'Get functional role by ID'
      },
      {
        module: 'fnc-roles',
        path: '/fnc-roles/:id',
        methods: ['PUT'],
        controller: 'FncRoleController',
        description: 'Update functional role'
      },
      {
        module: 'fnc-roles',
        path: '/fnc-roles/:id',
        methods: ['DELETE'],
        controller: 'FncRoleController',
        description: 'Delete functional role'
      },
      
      // Tokens module
      {
        module: 'tokens',
        path: '/tokens',
        methods: ['GET'],
        controller: 'TokenController',
        description: 'Get all tokens'
      },
      {
        module: 'tokens',
        path: '/tokens',
        methods: ['POST'],
        controller: 'TokenController',
        description: 'Create token'
      },
      {
        module: 'tokens',
        path: '/tokens/:id',
        methods: ['GET'],
        controller: 'TokenController',
        description: 'Get token by ID'
      },
      {
        module: 'tokens',
        path: '/tokens/:id',
        methods: ['PUT'],
        controller: 'TokenController',
        description: 'Update token'
      },
      {
        module: 'tokens',
        path: '/tokens/:id',
        methods: ['DELETE'],
        controller: 'TokenController',
        description: 'Delete token'
      },
      
      // Auth module
      {
        module: 'auth',
        path: '/auth/login',
        methods: ['POST'],
        controller: 'AuthController',
        description: 'User login'
      },
      {
        module: 'auth',
        path: '/auth/logout',
        methods: ['POST'],
        controller: 'AuthController',
        description: 'User logout'
      },
      {
        module: 'auth',
        path: '/auth/refresh',
        methods: ['POST'],
        controller: 'AuthController',
        description: 'Refresh token'
      },
      
      // Health module
      {
        module: 'health',
        path: '/health',
        methods: ['GET'],
        controller: 'HealthController',
        description: 'Health check'
      }
    ];

    const suggestedPermissions: Record<string, string[]> = {
      'users': this.generateSuggestedPermissions('users'),
      'fnc-roles': this.generateSuggestedPermissions('fnc-roles'),
      'tokens': this.generateSuggestedPermissions('tokens'),
      'auth': this.generateSuggestedPermissions('auth'),
      'health': this.generateSuggestedPermissions('health'),
    };

    console.log(`✅ Route scanning completed:`);
    console.log(`  - ${resourceTemplates.length} routes found`);
    console.log(`  - ${Object.keys(suggestedPermissions).length} modules scanned`);
    console.log(`  - ${Object.values(suggestedPermissions).flat().length} permission sets generated`);

    return { resourceTemplates, suggestedPermissions };
  }

  async applyScanResults(apply: boolean = false, applyPermissions: boolean = false): Promise<ScanResult> {
    const scanResult = await this.scanRoutes();

    if (apply) {
      // Bulk upsert resource templates
      for (const template of scanResult.resourceTemplates) {
        await this.resourceTemplateModel.findOneAndUpdate(
          { module: template.module, path: template.path },
          {
            module: template.module,
            path: template.path,
            methods: template.methods,
          },
          { upsert: true, new: true }
        );
      }
    }

    if (applyPermissions) {
      // Create default permission configs for each module
      for (const [module, permissions] of Object.entries(scanResult.suggestedPermissions)) {
        for (const permission of permissions) {
          const [moduleCode, action] = permission.split(':');
          
          // Get resource templates for this module
          const templates = await this.resourceTemplateModel.find({ module: moduleCode });
          
          if (templates.length > 0) {
            const resources = templates.map(template => ({
              path: template.path,
              methods: this.getMethodsForAction(action, template.methods),
            })).filter(resource => resource.methods.length > 0);

            if (resources.length > 0) {
              await this.permissionConfigModel.findOneAndUpdate(
                { key: permission },
                {
                  key: permission,
                  module: moduleCode,
                  action,
                  resources,
                },
                { upsert: true, new: true }
              );
            }
          }
        }
      }
    }

    return scanResult;
  }

  private getMethodsForAction(action: string, availableMethods: string[]): string[] {
    const actionMethodMap: Record<string, string[]> = {
      'get': ['GET'],
      'post': ['POST'],
      'put': ['PUT'],
      'patch': ['PATCH'],
      'delete': ['DELETE'],
      'manage': ['POST', 'PUT', 'PATCH'],
    };

    const requiredMethods = actionMethodMap[action] || [];
    return requiredMethods.filter(method => availableMethods.includes(method));
  }
}
