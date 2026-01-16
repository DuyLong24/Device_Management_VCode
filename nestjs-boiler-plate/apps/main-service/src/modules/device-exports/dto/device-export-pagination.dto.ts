import { IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class DeviceExportPaginationDto {
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
  exportName?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  receiver?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalItems?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalQuantity?: number;

  // Search fields based on string fields in entity
  @IsOptional()
  @IsString()
  exportNameSearch?: string;

  @IsOptional()
  @IsString()
  typeSearch?: string;

  @IsOptional()
  @IsString()
  receiverSearch?: string;

  @IsOptional()
  @IsString()
  statusSearch?: string;

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
