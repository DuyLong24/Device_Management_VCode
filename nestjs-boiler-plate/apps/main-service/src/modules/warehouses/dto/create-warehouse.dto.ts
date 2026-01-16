import { IsNotEmpty, IsMongoId, IsNumber, IsOptional, IsEnum, IsString, IsObject, IsBoolean } from 'class-validator';

export class CreateWarehouseDto {
  @IsNotEmpty()
  name!: string;

  @IsNotEmpty()
  code!: string;

  @IsMongoId()
  groupId!: string;

  @IsNumber()
  orderIndex!: number;

  @IsNotEmpty()
  color!: string;

  @IsNotEmpty()
  icon!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
