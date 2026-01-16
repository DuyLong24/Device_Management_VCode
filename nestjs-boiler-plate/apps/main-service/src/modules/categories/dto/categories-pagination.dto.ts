import { IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CategoryPaginationDto {
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
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Search fields based on string fields in entity
  @IsOptional()
  @IsString()
  nameSearch?: string;

  @IsOptional()
  @IsString()
  descriptionSearch?: string;

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
