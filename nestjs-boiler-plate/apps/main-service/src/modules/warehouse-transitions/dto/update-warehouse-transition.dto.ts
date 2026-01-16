import { PartialType } from '@nestjs/mapped-types';
import { CreateWarehouseTransitionDto } from './create-warehouse-transition.dto';

export class UpdateWarehouseTransitionDto extends PartialType(CreateWarehouseTransitionDto) {}
