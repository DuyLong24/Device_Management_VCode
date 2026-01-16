import { IsDateString, IsMongoId, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class DevicePaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  populate?: string;

  // --- Exact Match Filters ---
  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsMongoId()
  warehouseId?: string;

  @IsOptional()
  @IsMongoId()
  importId?: string;

  // --- Search ---
  @IsOptional()
  @IsString()
  search?: string; // Global search

  @IsOptional()
  @IsString()
  serial?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  model?: string; // Map to deviceModel

  // --- Date Range ---
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @IsOptional()
  @IsDateString()
  createdTo?: string;
}