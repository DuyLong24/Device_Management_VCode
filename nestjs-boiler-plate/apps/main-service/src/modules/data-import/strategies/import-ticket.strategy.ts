import { Injectable } from '@nestjs/common';
import { ImportStrategy, ValidationResult, ImportResult } from './import-strategy.interface';
import { DeviceService } from '../../devices/services/device.service';
import { SharedDataService } from '../../shared-data/services/shared-data.service';

@Injectable()
export class ImportTicketStrategy implements ImportStrategy {
    constructor(
        private readonly deviceService: DeviceService,
        private readonly sharedDataService: SharedDataService,
    ) { }

    async validate(data: any[], context: any): Promise<ValidationResult[]> {
        const details: ValidationResult[] = [];
        let validCount = 0;
        let invalidCount = 0;

        const macsToCheck = data.map(r => r.mac).filter(s => s);
        const models = await this.sharedDataService.getDataByGroupCode('MODEL');
        const validModelCodes = new Set(models?.map(m => m.code) || []);

        const autoCreateModel = context?.autoCreateCategory === true;

        for (const [index, row] of data.entries()) {
            const errors: string[] = [];
            const deviceCode = row['deviceCode'] || row['productCode']; // Fallback for backward compatibility
            const mac = row['mac'];
            const serial = row['serial'];
            const p2p = row['p2p'];
            const name = row['name'];

            if (!deviceCode) {
                errors.push('Thiếu Mã thiết bị (deviceCode)');
            } else {
                // Kiểm tra mã thiết bị có tồn tại trong hệ thống không
                if (!validModelCodes.has(deviceCode)) {
                    if (!autoCreateModel) {
                        errors.push(`Mã thiết bị "${deviceCode}" chưa tồn tại trong hệ thống.`);
                    } else {
                        //Logic tạo mới model
                    }
                }
            }

            if (mac) {
                // Kiểm tra mac có tồn tại trong hệ thống không
                const exists = await this.deviceService.findByMac(mac);
                if (exists) {
                    errors.push(`MAC "${mac}" đã tồn tại trong hệ thống.`);
                }
            }

            // Kiểm tra trùng lặp trong file
            const duplicateInFile = data.filter((r, i) => i !== index && r.mac === mac && mac).length > 0;
            if (duplicateInFile) {
                errors.push(`MAC "${mac}" bị trùng lặp trong file.`);
            }

            if (errors.length > 0) {
                invalidCount++;
            } else {
                validCount++;
            }

            details.push({
                row: index,
                data: {
                    ...row,
                    mac,
                    serial,
                    p2p,
                    name,
                    deviceCode
                },
                valid: errors.length === 0,
                errors
            });
        }

        return details;
    }

    async execute(data: any[], context: any): Promise<ImportResult> {
        const validRows = data;

        return {
            successCount: validRows.length,
            errorCount: 0,
            details: validRows
        };
    }
}
