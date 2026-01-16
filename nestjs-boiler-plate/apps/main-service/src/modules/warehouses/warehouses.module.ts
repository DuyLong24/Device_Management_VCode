import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WarehouseController } from './controllers/warehouse.controller';
import { WarehouseService } from './services/warehouse.service';
import { WarehouseRepository } from './repositories/warehouse.repository';
import { Warehouse, WarehouseSchema } from './schemas/warehouse.schemas';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Warehouse.name, schema: WarehouseSchema }])
  ],
  controllers: [WarehouseController],
  providers: [WarehouseService, WarehouseRepository],
  exports: [WarehouseService, WarehouseRepository]
})
export class WarehousesModule { }
