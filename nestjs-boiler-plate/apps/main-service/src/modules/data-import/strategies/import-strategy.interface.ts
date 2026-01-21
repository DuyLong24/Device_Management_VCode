
import { Injectable } from '@nestjs/common';

export interface ValidationResult {
    valid: boolean;
    row: number;
    data: any; // Transformed data
    errors: string[];
}

export interface ImportResult {
    successCount: number;
    errorCount: number;
    details?: any[]; // Added details for generic result payload
    errors?: any[];
}

export interface ImportStrategy {
    validate(data: any[], context?: any): Promise<ValidationResult[]>;
    execute(data: any[], context?: any): Promise<ImportResult>;
}
