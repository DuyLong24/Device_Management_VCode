import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { KeycloakUserService } from './services/keycloak-user.service';
import { JwtStrategy } from './strategies/jwt.strategy';

import { UsersModule } from '../users/users.module';
import { TokenModule } from '../tokens/tokens.module';
import { FncRoleModule } from '../fnc-roles/fnc-roles.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    PassportModule,
    HttpModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('RATE_LIMIT_TTL') || 60000,
          limit: configService.get<number>('RATE_LIMIT_LIMIT') || 10,
        },
      ],
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRATION') || '15m') as any,
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    TokenModule,
    FncRoleModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    KeycloakUserService,
    JwtStrategy,
  ],
  exports: [
    AuthService,
    KeycloakUserService,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule { }
