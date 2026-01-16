import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import { FncRole } from '../fnc-roles/entities/fnc-role.entity';
import { ResourceTemplate } from './schemas/resource-template.schema';
import { PermissionConfig } from './schemas/permission-config.schema';
import { Version } from './schemas/version.schema';
import { RouteScannerService, ScanResult } from './route-scanner.service';
import { OpaService } from './opa.service';
import { SyncService, SyncResult } from './sync.service';
import { CatalogResponseDto } from './dto/catalog.dto';
import { CreateRoleDto, UpdateRoleDto, BulkSetPermissionsDto } from './dto/roles.dto';
import { BulkUpsertPermissionsDto } from './dto/permissions.dto';
import { BulkUpsertResourceTemplatesDto } from './dto/catalog.dto';
import { SimulateDto } from './dto/simulate.dto';

@Injectable()
export class PolicyService {
  constructor(
    @InjectModel(FncRole.name) private fncRoleModel: Model<FncRole>,
    @InjectModel(ResourceTemplate.name) private resourceTemplateModel: Model<ResourceTemplate>,
    @InjectModel(PermissionConfig.name) private permissionConfigModel: Model<PermissionConfig>,
    @InjectModel(Version.name) private versionModel: Model<Version>,
    private readonly routeScannerService: RouteScannerService,
    private readonly opaService: OpaService,
    private readonly syncService: SyncService,
  ) {}

  async getCatalog(): Promise<CatalogResponseDto> {
    const resourceTemplates = await this.resourceTemplateModel.find().exec();
    const permissionConfigs = await this.permissionConfigModel.find().exec();

    // Extract unique modules
    const modules = new Set<string>();
    resourceTemplates.forEach(template => modules.add(template.module));

    // Extract unique actions
    const actions = new Set<string>();
    permissionConfigs.forEach(config => actions.add(config.action));

    const modulesList = Array.from(modules).map(code => ({
      code,
      name: code.charAt(0).toUpperCase() + code.slice(1), // Capitalize first letter
    }));

    return {
      modules: modulesList,
      actions: Array.from(actions),
      resourceTemplates: resourceTemplates.map(template => ({
        module: template.module,
        path: template.path,
        methods: template.methods,
        description: template.description,
      })),
    };
  }

  async bulkUpsertResourceTemplates(dto: BulkUpsertResourceTemplatesDto): Promise<ResourceTemplate[]> {
    const results: ResourceTemplate[] = [];

    for (const template of dto.templates) {
      const result = await this.resourceTemplateModel.findOneAndUpdate(
        { module: template.module, path: template.path },
        template,
        { upsert: true, new: true }
      );
      results.push(result);
    }

    return results;
  }

  async scanRoutes(apply: boolean = false, applyPermissions: boolean = false) {
    return this.routeScannerService.applyScanResults(apply, applyPermissions);
  }

  async getPermissions(): Promise<PermissionConfig[]> {
    return this.permissionConfigModel.find().exec();
  }

  async bulkUpsertPermissions(dto: BulkUpsertPermissionsDto): Promise<PermissionConfig[]> {
    const results: PermissionConfig[] = [];

    for (const permission of dto.permissions) {
      const [module, action] = permission.key.split(':');
      
      const result = await this.permissionConfigModel.findOneAndUpdate(
        { key: permission.key },
        {
          key: permission.key,
          module,
          action,
          resources: permission.resources,
        },
        { upsert: true, new: true }
      );
      results.push(result);
    }

    return results;
  }

  async deletePermission(key: string): Promise<void> {
    const result = await this.permissionConfigModel.deleteOne({ key });
    if (result.deletedCount === 0) {
      throw new HttpException('Permission not found', HttpStatus.NOT_FOUND);
    }
  }

  async getRoles(): Promise<FncRole[]> {
    return this.fncRoleModel.find().exec();
  }

  async createRole(dto: CreateRoleDto): Promise<FncRole> {
    // Check if role with same code already exists
    const existingRole = await this.fncRoleModel.findOne({ code: dto.code });
    if (existingRole) {
      throw new HttpException('Role with this code already exists', HttpStatus.CONFLICT);
    }

    const role = new this.fncRoleModel(dto);
    return role.save();
  }

  async updateRole(code: string, dto: UpdateRoleDto): Promise<FncRole> {
    const role = await this.fncRoleModel.findOneAndUpdate(
      { code },
      dto,
      { new: true }
    );

    if (!role) {
      throw new HttpException('Role not found', HttpStatus.NOT_FOUND);
    }

    return role;
  }

  async deleteRole(code: string): Promise<void> {
    const result = await this.fncRoleModel.deleteOne({ code });
    if (result.deletedCount === 0) {
      throw new HttpException('Role not found', HttpStatus.NOT_FOUND);
    }
  }

  async bulkSetPermissions(code: string, dto: BulkSetPermissionsDto): Promise<FncRole> {
    const role = await this.fncRoleModel.findOneAndUpdate(
      { code },
      { permissions: dto.permissions },
      { new: true }
    );

    if (!role) {
      throw new HttpException('Role not found', HttpStatus.NOT_FOUND);
    }

    return role;
  }

  async syncKeycloak() {
    return this.syncService.syncKeycloak();
  }

  async getUserPermissions(userId: string) {
    return this.syncService.getUserBasePermissions(userId);
  }

  async debugRolePermissions(roleCode: string) {
    return this.syncService.debugRolePermissions(roleCode);
  }

  async opaHealth(): Promise<boolean> {
    return this.opaService.healthCheck();
  }

  async opaData(): Promise<any> {
    return this.opaService.getData();
  }

  async opaPolicies(): Promise<any> {
    return this.opaService.getPolicies();
  }

  async getCurrentPolicy(): Promise<string> {
    return this.opaService.getCurrentPolicy();
  }

  async getMergedPolicy(): Promise<string> {
    return this.opaService.getMergedPolicy();
  }

  async debugPolicyContent(): Promise<{ existing: string; generated: string; merged: string }> {
    return this.opaService.debugPolicyContent();
  }

  async testPolicyDirectly(input: any): Promise<{ result: boolean; explanation?: string }> {
    const mergedPolicy = await this.opaService.getMergedPolicy();
    return this.opaService.testPolicyDirectly(mergedPolicy, input);
  }

  async getVersions(): Promise<Version[]> {
    return this.versionModel.find().sort({ createdAt: -1 }).exec();
  }

  async getVersionByHash(hash: string): Promise<Version | null> {
    return this.versionModel.findOne({ hash }).exec();
  }

  async publish(createdBy: string = 'system'): Promise<{ hash: string; version: Version }> {
    // Build app payload from database
    const resourceTemplates = await this.resourceTemplateModel.find().exec();
    const permissionConfigs = await this.permissionConfigModel.find().exec();
    const roles = await this.fncRoleModel.find().exec();

    // Build permissions object
    const permissions: Record<string, { resources: Array<{ path: string; methods: string[] }> }> = {};
    for (const config of permissionConfigs) {
      permissions[config.key] = { resources: config.resources };
    }

    // Build roles object
    const rolesData: Record<string, { name: string; permissions: string[] }> = {};
    for (const role of roles) {
      rolesData[role.code] = {
        name: role.name,
        permissions: role.permissions,
      };
    }

    // Build catalog
    const modules = new Set<string>();
    const actions = new Set<string>();
    
    resourceTemplates.forEach(template => modules.add(template.module));
    permissionConfigs.forEach(config => actions.add(config.action));

    const catalog = {
      modules: Array.from(modules).map(code => ({
        code,
        name: code.charAt(0).toUpperCase() + code.slice(1),
      })),
      actions: Array.from(actions),
      resourceTemplates: resourceTemplates.map(template => ({
        module: template.module,
        path: template.path,
        methods: template.methods,
      })),
    };

    const appPayload = { app: { permissions, roles: rolesData, catalog } };

    console.log('Publishing app payload:', JSON.stringify(appPayload, null, 2));

    // Generate hash
    const hash = createHash('sha256').update(JSON.stringify(appPayload)).digest('hex');

    // Check if version with same hash already exists
    let version;
    const existingVersion = await this.versionModel.findOne({ hash });
    if (existingVersion) {
      console.log(`Version with hash ${hash} already exists, using existing version`);
      version = existingVersion;
    } else {
      // Save version
      version = new this.versionModel({
        hash,
        snapshot: appPayload,
        createdBy,
      });
      await version.save();
      console.log(`✅ Version saved with hash: ${hash}`);
    }

    // Publish to OPA
    await this.opaService.publishApp(appPayload);

    return { hash, version };
  }

  async simulate(dto: SimulateDto): Promise<{ allowed: boolean }> {
    const allowed = await this.opaService.evaluate(dto);
    return { allowed };
  }
}
