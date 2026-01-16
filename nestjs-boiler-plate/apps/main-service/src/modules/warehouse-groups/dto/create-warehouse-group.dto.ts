import { IsNotEmpty, IsNumber, IsBoolean, IsOptional, IsEnum } from 'class-validator';

export class CreateWarehouseGroupDto {
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  orderIndex!: number;

  @IsBoolean()
  isActive!: boolean;
}
