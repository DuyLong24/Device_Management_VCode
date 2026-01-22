import { Injectable } from '@nestjs/common';
import { ImportStrategy, ValidationResult, ImportResult } from './import-strategy.interface';
import { DeviceService } from '../../devices/services/device.service';

@Injectable()
export class ImportTicketStrategy implements ImportStrategy {
    constructor(
        private readonly deviceService: DeviceService,
    ) { }

    async validate(data: any[], context: any): Promise<ValidationResult[]> {
        const details: ValidationResult[] = [];
        let validCount = 0;
        let invalidCount = 0;

        // Cache existing logical constraints if needed
        // For Import Ticket, we mostly care about:
        // 1. productCode presence (Optional check, maybe warn if new?)
        // 2. Serial uniqueness is tricky because they are NEW serials. 
        //    We should check if they ALREADY exist in DB (to prevent duplicates).

        // Get all existing serials for the incoming batch to check duplicates efficiently?
        // If batch is huge, this is hard. For now, check row by row or bulk check.

        const macsToCheck = data.map(r => r.mac).filter(s => s);
        // We can't easily check all serials at once with current deviceService without a specific method.
        // Let's assume we check individually or just rely on DB index constraint later? 
        // But this is "Validation" step. User wants to know BEFORE import.

        // Let's implement a simple check: IF serial exists -> Invalid (Target is to Import NEW items)

        for (const [index, row] of data.entries()) {
            const errors: string[] = [];
            const productCode = row['productCode']; // Mapped field
            const mac = row['mac']; // Mapped field

            if (!productCode) {
                errors.push('Thiếu Mã sản phẩm (productCode)');
            }

            if (mac) {
                // Check if mac already exists in DB
                const exists = await this.deviceService.findByMac(mac);
                if (exists) {
                    errors.push(`MAC "${mac}" đã tồn tại trong hệ thống.`);
                }
            }

            // Check duplicate in the FILE itself
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
                data: row,
                valid: errors.length === 0,
                errors
            });
        }

        return details;
    }

    async execute(data: any[], context: any): Promise<ImportResult> {
        // For Import Ticket, "Execute" doesn't save to DB.
        // It returns the structured data for the Frontend to populate the Form.

        // We act as a "Transformer" here.

        const validRows = data; // We assume controller only passes valid rows OR we filter here. 
        // Actually controller passes everything or we re-validate? 
        // Typically execute is called after validation.

        return {
            successCount: validRows.length,
            errorCount: 0,
            details: validRows // Pass back the data
        };
    }
}
