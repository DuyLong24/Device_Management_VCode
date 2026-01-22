import { IsDateString, IsMongoId, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class DeviceImportPaginationDto {
  // Base pagination fields
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  populate?: string;

  // Filter fields based on entity
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsDateString()
  importDate?: Date;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalItem?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalQuantity?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsMongoId()
  handoverPerson?: string;

  // Search fields based on string fields in entity
  @IsOptional()
  @IsString()
  codeSearch?: string;

  @IsOptional()
  @IsString()
  supplierIdSearch?: string;

  @IsOptional()
  @IsString()
  statusSearch?: string;

  @IsOptional()
  @IsString()
  originSearch?: string;

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
