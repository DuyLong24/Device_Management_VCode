import { IsString, IsArray, IsEnum } from 'class-validator';

export class ValidateSerialsDto {
    @IsArray()
    @IsString({ each: true })
    serials: string[];

    @IsString()
    deviceModel: string;

    @IsString()
    warehouseCode: string;

    @IsEnum(['EXPORT', 'IMPORT'])
    operation: 'EXPORT' | 'IMPORT';
}

export interface SerialValidationError {
    serial: string;
    reason: 'NOT_FOUND' | 'WRONG_MODEL' | 'WRONG_WAREHOUSE' | 'DUPLICATE';
    message: string;
    currentModel?: string;
    currentWarehouse?: string;
}

export interface ValidateSerialsResponse {
    valid: boolean;
    validSerials: string[];
    invalidSerials: string[];
    errors: SerialValidationError[];
}
