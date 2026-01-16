import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PolicyController } from './policy.controller';
import { PolicyService } from './policy.service';
import { SyncService } from './sync.service';
import { RouteScannerService } from './route-scanner.service';
import { OpaService } from './opa.service';
import { KeycloakAdminService } from './keycloak-admin.service';
import { ResourceTemplate, ResourceTemplateSchema } from './schemas/resource-template.schema';
import { PermissionConfig, PermissionConfigSchema } from './schemas/permission-config.schema';
import { Version, VersionSchema } from './schemas/version.schema';
// TODO: Import FncRole from existing project
import { FncRole, FncRoleSchema } from '../fnc-roles/entities/fnc-role.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FncRole.name, schema: FncRoleSchema },
      { name: ResourceTemplate.name, schema: ResourceTemplateSchema },
      { name: PermissionConfig.name, schema: PermissionConfigSchema },
      { name: Version.name, schema: VersionSchema },
    ]),
  ],
  controllers: [PolicyController],
  providers: [
    PolicyService,
    SyncService,
    RouteScannerService,
    OpaService,
    KeycloakAdminService,
  ],
  exports: [PolicyService, SyncService, RouteScannerService, OpaService, KeycloakAdminService],
})
export class PolicyAdminModule {}
