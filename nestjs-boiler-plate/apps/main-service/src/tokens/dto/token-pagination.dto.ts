import { IsBoolean, IsDateString, IsMongoId, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class TokenPaginationDto {
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
  token?: string;

  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsDateString()
  expires?: Date;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  blacklisted?: boolean;

  // Search fields based on string fields in entity
  @IsOptional()
  @IsString()
  tokenSearch?: string;

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
