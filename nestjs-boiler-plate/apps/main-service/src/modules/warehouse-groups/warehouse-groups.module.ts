import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WarehouseGroupController } from './controllers/warehouse-group.controller';
import { WarehouseGroupService } from './services/warehouse-group.service';
import { WarehouseGroupRepository } from './repositories/warehouse-group.repository';
import { WarehouseGroup, WarehouseGroupSchema } from './schemas/warehouse-group.schemas';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WarehouseGroup.name, schema: WarehouseGroupSchema }])
  ],
  controllers: [WarehouseGroupController],
  providers: [WarehouseGroupService, WarehouseGroupRepository],
  exports: [WarehouseGroupService, WarehouseGroupRepository]
})
export class WarehouseGroupsModule { }
