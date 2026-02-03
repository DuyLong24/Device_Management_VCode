import { Injectable, BadRequestException } from '@nestjs/common';
import { ImportStrategy, ValidationResult, ImportResult } from './import-strategy.interface';
import { DeviceService } from '../../devices/services/device.service';

export interface ImportConfig {
    mergeStrategy: 'upsert' | 'insert' | 'update';
    duplicateKey: string;
    skipEmpty: boolean;
    autoCreateCategory: boolean;
}

@Injectable()
export class DeviceImportStrategy implements ImportStrategy {
    constructor(private readonly deviceService: DeviceService) { }

    async validate(rows: any[], context?: ImportConfig): Promise<ValidationResult[]> {
        const results: ValidationResult[] = [];
        const macs = rows.map(r => r.mac).filter(Boolean);
        const mergeStrategy = context?.mergeStrategy || 'insert';
        const duplicateKey = context?.duplicateKey || 'mac';

        const existingDevices = await this.deviceService.findAll({ mac: { $in: macs } });
        const existingMacs = new Set(existingDevices.map(d => d.mac));

        rows.forEach((row, index) => {
            const errors: string[] = [];

            // Required fields
            if (!row.mac) errors.push('Thiếu địa chỉ MAC');
            const model = row.deviceCode || row.deviceModel;
            if (!model) errors.push('Thiếu mã Model (deviceCode)');

            // Strategy Validation
            const exists = row.mac && existingMacs.has(row.mac);

            if (mergeStrategy === 'insert') {
                if (exists) errors.push('MAC đã tồn tại (Chế độ Thêm mới)');
            } else if (mergeStrategy === 'update') {
                if (!exists) errors.push('MAC chưa tồn tại (Chế độ Cập nhật)');
            }

            results.push({
                valid: errors.length === 0,
                row: index,
                data: row,
                errors
            });
        });

        return results;
    }

    async execute(rows: any[], context?: ImportConfig): Promise<ImportResult> {
        const successRows = rows.filter(r => r.valid !== false);
        const mergeStrategy = context?.mergeStrategy || 'insert';
        const skipEmpty = context?.skipEmpty || false;

        const errors: any[] = [];
        const ops: any[] = [];

        for (const row of successRows) {
            const commonFields = {
                mac: row.mac,
                serial: row.serial,
                deviceModel: row.deviceCode || row.deviceModel,
                name: row.name || row.deviceCode || row.deviceModel,
                warehouseId: row.warehouseId || context?.['warehouseId'],
                status: 'ACTIVE',
                condition: 'NEW'
            };

            if (skipEmpty) {
                Object.keys(commonFields).forEach(key => {
                    if (commonFields[key] === undefined || commonFields[key] === '' || commonFields[key] === null) {
                        delete commonFields[key];
                    }
                });
            }

            if (mergeStrategy === 'insert') {
                ops.push({
                    insertOne: {
                        document: commonFields
                    }
                });
            } else if (mergeStrategy === 'update') {
                ops.push({
                    updateOne: {
                        filter: { mac: row.mac },
                        update: { $set: commonFields }
                    }
                });
            } else if (mergeStrategy === 'upsert') {
                ops.push({
                    updateOne: {
                        filter: { mac: row.mac },
                        update: { $set: commonFields },
                        upsert: true
                    }
                });
            }
        }

        let successCount = 0;
        try {
            if (ops.length > 0) {
                const result = await this.deviceService.bulkWrite(ops);
                successCount = (result.insertedCount || 0) + (result.upsertedCount || 0) + (result.modifiedCount || 0);

                if (mergeStrategy === 'update') {
                    successCount = result.matchedCount || 0;
                }
            }
        } catch (e) {
            console.error('Import Error:', e);
            errors.push({ message: 'Lỗi lưu dữ liệu: ' + e.message });
        }

        return {
            successCount: successCount,
            errorCount: errors.length,
            errors
        };
    }
}
