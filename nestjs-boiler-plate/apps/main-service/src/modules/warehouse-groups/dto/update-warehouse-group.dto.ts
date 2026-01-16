import { PartialType } from '@nestjs/mapped-types';
import { CreateWarehouseGroupDto } from './create-warehouse-group.dto';

export class UpdateWarehouseGroupDto extends PartialType(CreateWarehouseGroupDto) {}
