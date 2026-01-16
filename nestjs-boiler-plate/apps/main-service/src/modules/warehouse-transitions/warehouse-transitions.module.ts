import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WarehouseTransitionController } from './controllers/warehouse-transition.controller';
import { WarehouseTransitionService } from './services/warehouse-transition.service';
import { WarehouseTransitionRepository } from './repositories/warehouse-transition.repository';
import { WarehouseTransition, WarehouseTransitionSchema } from './schemas/warehouse-transition.schemas';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WarehouseTransition.name, schema: WarehouseTransitionSchema }])
  ],
  controllers: [WarehouseTransitionController],
  providers: [WarehouseTransitionService, WarehouseTransitionRepository],
  exports: [WarehouseTransitionService, WarehouseTransitionRepository]
})
export class WarehouseTransitionsModule { }
