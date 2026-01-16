import { PartialType } from '@nestjs/mapped-types';
import { CreateDeviceImportDto } from './create-device-import.dto';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';

export class UpdateDeviceImportDto extends PartialType(CreateDeviceImportDto) {
    @IsOptional()
    @IsNumber()
    serialImported?: number;

    @IsOptional()
    @IsEnum(['pending', 'in-progress', 'completed'])
    inventoryStatus?: string;
}
