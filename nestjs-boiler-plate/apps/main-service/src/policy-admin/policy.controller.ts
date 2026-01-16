import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { PolicyService } from './policy.service';
import { CatalogResponseDto, BulkUpsertResourceTemplatesDto, ScanRoutesDto } from './dto/catalog.dto';
import { BulkUpsertPermissionsDto } from './dto/permissions.dto';
import { CreateRoleDto, UpdateRoleDto, BulkSetPermissionsDto } from './dto/roles.dto';
import { PublishDto } from './dto/publish.dto';
import { SimulateDto } from './dto/simulate.dto';
import { ResourceTemplate } from './schemas/resource-template.schema';
import { PermissionConfig } from './schemas/permission-config.schema';
import { FncRole } from '../fnc-roles/entities/fnc-role.entity';
import { ScanResult } from './route-scanner.service';
import { SyncResult } from './sync.service';

@Controller('policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  // Catalog endpoints
  @Get('catalog')
  async getCatalog(): Promise<CatalogResponseDto> {
    return this.policyService.getCatalog();
  }

  @Post('catalog/resource-templates:bulk-upsert')
  async bulkUpsertResourceTemplates(@Body() dto: BulkUpsertResourceTemplatesDto): Promise<ResourceTemplate[]> {
    return this.policyService.bulkUpsertResourceTemplates(dto);
  }

  @Post('catalog/scan')
  async scanRoutes(@Query() query: ScanRoutesDto): Promise<ScanResult> {
    return this.policyService.scanRoutes(query.apply, query.applyPermissions);
  }

  // Permissions endpoints
  @Get('permissions')
  async getPermissions(): Promise<PermissionConfig[]> {
    return this.policyService.getPermissions();
  }

  @Put('permissions:bulk-upsert')
  async bulkUpsertPermissions(@Body() dto: BulkUpsertPermissionsDto): Promise<PermissionConfig[]> {
    return this.policyService.bulkUpsertPermissions(dto);
  }

  @Delete('permissions/:key')
  async deletePermission(@Param('key') key: string): Promise<void> {
    return this.policyService.deletePermission(key);
  }

  // Roles endpoints (SoR = FncRole)
  @Get('roles')
  async getRoles(): Promise<FncRole[]> {
    return this.policyService.getRoles();
  }

  @Post('roles')
  async createRole(@Body() dto: CreateRoleDto): Promise<FncRole> {
    return this.policyService.createRole(dto);
  }

  @Put('roles/:code')
  async updateRole(@Param('code') code: string, @Body() dto: UpdateRoleDto): Promise<FncRole> {
    return this.policyService.updateRole(code, dto);
  }

  @Delete('roles/:code')
  async deleteRole(@Param('code') code: string): Promise<void> {
    return this.policyService.deleteRole(code);
  }

  @Post('roles/:code/permissions:bulk-set')
  async bulkSetPermissions(@Param('code') code: string, @Body() dto: BulkSetPermissionsDto): Promise<FncRole> {
    return this.policyService.bulkSetPermissions(code, dto);
  }

  // Sync Keycloak endpoints
  @Post('sync/keycloak')
  async syncKeycloak(): Promise<SyncResult> {
    return this.policyService.syncKeycloak();
  }

  // User permissions endpoints
  @Get('users/:userId/permissions')
  async getUserPermissions(@Param('userId') userId: string) {
    return this.policyService.getUserPermissions(userId);
  }

  // Debug endpoints
  @Get('debug/roles/:code/permissions')
  async debugRolePermissions(@Param('code') code: string) {
    return this.policyService.debugRolePermissions(code);
  }

  @Get('debug/opa/health')
  async opaHealth() {
    return this.policyService.opaHealth();
  }

  @Get('debug/opa/data')
  async opaData() {
    return this.policyService.opaData();
  }

  @Get('debug/opa/policies')
  async opaPolicies() {
    return this.policyService.opaPolicies();
  }

  @Get('debug/opa/policy/current')
  async getCurrentPolicy() {
    return this.policyService.getCurrentPolicy();
  }

  @Get('debug/opa/policy/merged')
  async getMergedPolicy() {
    return this.policyService.getMergedPolicy();
  }

  @Get('debug/opa/policy/content')
  async debugPolicyContent() {
    return this.policyService.debugPolicyContent();
  }

  @Post('debug/opa/policy/test')
  async testPolicyDirectly(@Body() body: { input: any }) {
    return this.policyService.testPolicyDirectly(body.input);
  }

  @Get('versions')
  async getVersions() {
    return this.policyService.getVersions();
  }

  @Get('versions/:hash')
  async getVersionByHash(@Param('hash') hash: string) {
    return this.policyService.getVersionByHash(hash);
  }

  // Publish & Simulate endpoints
  @Post('publish')
  async publish(@Body() dto: PublishDto) {
    return this.policyService.publish(dto.createdBy);
  }

  @Post('simulate')
  async simulate(@Body() dto: SimulateDto): Promise<{ allowed: boolean }> {
    return this.policyService.simulate(dto);
  }
}
