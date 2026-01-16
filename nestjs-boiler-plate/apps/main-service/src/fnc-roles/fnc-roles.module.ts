import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FncRoleController } from './controllers/fnc-role.controller';
import { FncRoleService } from './services/fnc-role.service';
import { FncRoleRepository } from './repositories/fnc-role.repository';
import { FncRole, FncRoleSchema } from './entities/fnc-role.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FncRole.name, schema: FncRoleSchema }])
  ],
  controllers: [FncRoleController],
  providers: [FncRoleService, FncRoleRepository],
  exports: [FncRoleService, FncRoleRepository]
})
export class FncRoleModule {}
