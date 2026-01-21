
import { Injectable, BadRequestException } from '@nestjs/common';
import { ImportStrategy, ValidationResult, ImportResult } from './import-strategy.interface';
import { DeviceService } from '../../devices/services/device.service';

@Injectable()
export class DeviceImportStrategy implements ImportStrategy {
    constructor(private readonly deviceService: DeviceService) { }

    async validate(rows: any[], context?: any): Promise<ValidationResult[]> {
        const results: ValidationResult[] = [];
        const serials = rows.map(r => r.serial).filter(Boolean);

        // Pre-fetch existing serials for bulk check
        const existingDevices = await this.deviceService.findAll({ serial: { $in: serials } });
        const existingSerials = new Set(existingDevices.map(d => d.serial));

        rows.forEach((row, index) => {
            const errors: string[] = [];

            // Required fields
            if (!row.serial) errors.push('Thiếu mã Serial');
            if (!row.deviceModel) errors.push('Thiếu mã Model (deviceModel)');

            // Duplicate check
            if (row.serial && existingSerials.has(row.serial)) {
                errors.push('Serial đã tồn tại trên hệ thống');
            }

            // TODO: Validate Warehouse existence if provided

            results.push({
                valid: errors.length === 0,
                row: index,
                data: row,
                errors
            });
        });

        return results;
    }

    async execute(rows: any[], context?: any): Promise<ImportResult> {
        const successRows = rows.filter(r => r.valid !== false); // Assuming filtered before or trusted
        const errors: any[] = [];
        const toInsert = [];

        for (const row of successRows) {
            toInsert.push({
                serial: row.serial,
                deviceModel: row.deviceModel,
                name: row.name || row.deviceModel,
                warehouseId: context?.warehouseId, // Passed from UI context
                // Add validation/defaults
                status: 'ACTIVE',
                condition: 'NEW'
            });
        }

        let insertedCount = 0;
        try {
            if (toInsert.length > 0) {
                // Use insertMany for performance
                // Note: DeviceService might not explicitly return count in some impls, checking schema
                // Using try-catch for safety
                await this.deviceService.insertMany(toInsert as any);
                insertedCount = toInsert.length;
            }
        } catch (e) {
            // If bulk fail, might need row-by-row or better error handling
            errors.push({ message: 'Lỗi lưu dữ liệu: ' + e.message });
        }

        return {
            successCount: insertedCount,
            errorCount: errors.length,
            errors
        };
    }
}
