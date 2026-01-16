import { IsDateString, IsBoolean, IsMongoId, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class WarehouseTransitionPaginationDto {
  // Base pagination fields
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  populate?: string;

  // Filter fields based on entity
  @IsOptional()
  @IsMongoId()
  fromWarehouseId?: string;

  @IsOptional()
  @IsMongoId()
  toWarehouseId?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  // Search fields based on string fields in entity
  @IsOptional()
  @IsString()
  typeSearch?: string;

  // Date range filters
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @IsOptional()
  @IsDateString()
  updatedFrom?: string;

  @IsOptional()
  @IsDateString()
  updatedTo?: string;
}
