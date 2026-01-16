import { IsMongoId, IsNotEmpty, IsBoolean, IsOptional, IsEnum, IsArray, IsString } from 'class-validator';

export class CreateWarehouseTransitionDto {
  @IsOptional()
  @IsMongoId()
  fromWarehouseId!: string;

  @IsMongoId()
  toWarehouseId!: string;

  @IsNotEmpty()
  type!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoles?: string[];

  @IsBoolean()
  isActive!: boolean;
}
