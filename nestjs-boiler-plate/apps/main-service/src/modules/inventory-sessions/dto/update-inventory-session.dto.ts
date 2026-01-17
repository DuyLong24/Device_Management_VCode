import { IsOptional, IsString, ValidateNested, IsArray, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

class ScannedDetailDto {
    @IsString()
    serial: string;

    @IsString()
    deviceModel: string;

    @IsOptional()
    @IsString()
    productCode?: string;
}

export class UpdateInventorySessionDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    note?: string;

    @IsOptional()
    @IsEnum(['processing', 'completed', 'cancelled'])
    status?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ScannedDetailDto)
    scannedItems?: ScannedDetailDto[];
}