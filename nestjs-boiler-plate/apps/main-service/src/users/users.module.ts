import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { User, UserSchema } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { UserManagementController } from './controllers/user-management.controller';
import { UserKeycloakIntegrationService } from './services/user-keycloak-integration.service';
import { UserManagementService } from './services/user-management.service';
import { FncRoleModule } from '../fnc-roles/fnc-roles.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ConfigModule,
    HttpModule,
    FncRoleModule,
  ],
  controllers: [UserController, UserManagementController],
  providers: [
    UserService,
    UserRepository,
    UserKeycloakIntegrationService,
    UserManagementService,
  ],
  exports: [
    UserService,
    UserRepository,
    UserKeycloakIntegrationService
  ],
})
export class UsersModule { }
