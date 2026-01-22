import { IsString, IsArray, IsEnum } from 'class-validator';

export class ValidateMacsDto {
    @IsArray()
    @IsString({ each: true })
    macs: string[];

    @IsString()
    deviceModel: string;

    @IsString()
    warehouseCode: string;

    @IsEnum(['EXPORT', 'IMPORT'])
    operation: 'EXPORT' | 'IMPORT';
}

export interface MacValidationError {
    mac: string;
    reason: 'NOT_FOUND' | 'WRONG_MODEL' | 'WRONG_WAREHOUSE' | 'DUPLICATE';
    message: string;
    currentModel?: string;
    currentWarehouse?: string;
}

export interface ValidateMacsResponse {
    valid: boolean;
    validMacs: string[];
    invalidMacs: string[];
    errors: MacValidationError[];
}
