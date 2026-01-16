import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class InventorySessionPaginationDto {
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
    search?: string;

    @IsOptional()
    @IsString()
    sortBy?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    importId?: string;
}