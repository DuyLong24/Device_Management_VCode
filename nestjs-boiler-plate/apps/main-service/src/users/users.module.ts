import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { User, UserSchema } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { UserKeycloakIntegrationService } from '../common/services/user-keycloak-integration.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ConfigModule,
    HttpModule,
  ],
  controllers: [UserController],
  providers: [
    UserService, 
    UserRepository, 
    UserKeycloakIntegrationService
  ],
  exports: [
    UserService, 
    UserRepository, 
    UserKeycloakIntegrationService
  ],
})
export class UsersModule {}
