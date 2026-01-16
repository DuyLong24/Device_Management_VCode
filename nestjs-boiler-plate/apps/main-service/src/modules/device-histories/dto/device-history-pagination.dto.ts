import { IsDateString, IsMongoId, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class DeviceHistoryPaginationDto {
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
  deviceId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsMongoId()
  fromWarehouseId?: string;

  @IsOptional()
  @IsMongoId()
  toWarehouseId?: string;

  @IsOptional()
  @IsMongoId()
  actorId?: string;

  @IsOptional()
  @IsString()
  note?: string;

  // Search fields based on string fields in entity
  @IsOptional()
  @IsString()
  actionSearch?: string;

  @IsOptional()
  @IsString()
  noteSearch?: string;

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
