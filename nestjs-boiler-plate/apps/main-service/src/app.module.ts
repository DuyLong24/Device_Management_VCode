import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';

import { AuthModule } from './auth/auth.module';
import { PolicyAdminModule } from './policy-admin/policy-admin.module';
import { UsersModule } from './users/users.module';
import { FncRoleModule } from './fnc-roles/fnc-roles.module';
import { TokenModule } from './tokens/tokens.module';
import { HealthController } from './health/health.controller';
import { FileModule } from './file/file.module';
import { SERVICES, KAFKA_CLIENT_CONFIG } from '@app/shared';
import { OpaAuthorizationGuard } from './common/guards/opa.guard';

import { WarehouseGroupsModule } from './modules/warehouse-groups/warehouse-groups.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { WarehouseTransitionsModule } from './modules/warehouse-transitions/warehouse-transitions.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SeedService } from './common/services/seed.service';
import { DevicesModule } from './modules/devices/devices.module';
import { DeviceImportModule } from './modules/device-imports/device-imports.module';
import { DeviceExportModule } from './modules/device-exports/device-exports.module';
import { DeviceHistoryModule } from './modules/device-histories/device-historys.module';
import { InventorySessionModule } from './modules/inventory-sessions/inventory-sessions.module';
import { ExcelModule } from './common/excel/excel.module';
import { DataImportModule } from './modules/data-import/data-import.module'; // NEW

import { FncRole, FncRoleSchema } from './fnc-roles/entities/fnc-role.entity';
import { User, UserSchema } from './users/entities/user.entity';
import { WarehouseGroup, WarehouseGroupSchema } from './modules/warehouse-groups/schemas/warehouse-group.schemas';
import { Warehouse, WarehouseSchema } from './modules/warehouses/schemas/warehouse.schemas';
import { WarehouseTransition, WarehouseTransitionSchema } from './modules/warehouse-transitions/schemas/warehouse-transition.schemas';
import { DeviceHistory, DeviceHistorySchema } from './modules/device-histories/schemas/device-history.schemas';
import { Device, DeviceSchema } from './modules/devices/schemas/device.schemas';
import { Category, CategorySchema } from './modules/categories/schemas/categories.schemas';
import { DeviceImport, DeviceImportSchema } from './modules/device-imports/schemas/device-import.schemas';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL') ||
          configService.get<string>('MONGODB_URI')
      }),
      inject: [ConfigService],
    }),
    // JWT Module for token verification
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
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

    MongooseModule.forFeature([
      { name: FncRole.name, schema: FncRoleSchema },
      { name: User.name, schema: UserSchema },
      { name: WarehouseGroup.name, schema: WarehouseGroupSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: WarehouseTransition.name, schema: WarehouseTransitionSchema },
      { name: DeviceHistory.name, schema: DeviceHistorySchema },
      { name: Device.name, schema: DeviceSchema },
      { name: Category.name, schema: CategorySchema },
      { name: DeviceImport.name, schema: DeviceImportSchema },
    ]),
    // Cấu hình Kafka client để giao tiếp với Upload Service
    // ClientsModule.register([
    //   {
    //     name: SERVICES.UPLOAD_SERVICE,
    //     transport: Transport.KAFKA,
    //     options: {
    //       client: {
    //         ...KAFKA_CLIENT_CONFIG,
    //         clientId: 'main-service',
    //       },
    //       consumer: {
    //         groupId: 'main-service-consumer',
    //       },
    //     },
    //   },
    // ]),
    // AuthModule,
    UsersModule,
    FncRoleModule,
    TokenModule,
    PolicyAdminModule,
    // FileModule, // Module mới để xử lý file upload qua Kafka
    WarehouseGroupsModule,
    WarehousesModule,
    WarehouseTransitionsModule,
    CategoriesModule,
    DevicesModule,
    DeviceImportModule,
    DeviceExportModule,
    DeviceHistoryModule,
    InventorySessionModule,
    ExcelModule,
    DataImportModule,
  ],
  controllers: [HealthController],
  providers: [
    SeedService,
    {

      provide: APP_GUARD,
      useClass: OpaAuthorizationGuard,
    },
  ],
})

export class AppModule { }