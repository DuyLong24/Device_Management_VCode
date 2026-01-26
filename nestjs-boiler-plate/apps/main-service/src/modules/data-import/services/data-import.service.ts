
import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ImportStrategy, ValidationResult } from '../strategies/import-strategy.interface';
import { DeviceImportStrategy } from '../strategies/device.import-strategy'; // NEW
import { ImportTicketStrategy } from '../strategies/import-ticket.strategy';
import { DeviceService } from '../../devices/services/device.service'; // Example dependency

@Injectable()
export class DataImportService {
    private strategies: Map<string, ImportStrategy> = new Map();
    private sessions: Map<string, {
        fileBuffer: Buffer;
        workbook?: XLSX.WorkBook;
        parsedData?: any[];
        mapping?: any;
        validationResults?: ValidationResult[];
        validRows?: any[];
        sheetName?: string;
        headerRowIndex?: number;
    }> = new Map();

    constructor(
        private readonly deviceImportStrategy: DeviceImportStrategy,
        private readonly importTicketStrategy: ImportTicketStrategy,
    ) {
        this.registerStrategy('DEVICE', this.deviceImportStrategy);
        this.registerStrategy('IMPORT_TICKET', this.importTicketStrategy);
    }

    registerStrategy(key: string, strategy: ImportStrategy) {
        this.strategies.set(key, strategy);
    }

    createSession(file: Express.Multer.File): any {
        const sessionId = Math.random().toString(36).substring(7);
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });

        this.sessions.set(sessionId, {
            fileBuffer: file.buffer,
            workbook: workbook
        });

        return {
            sessionId,
            sheets: workbook.SheetNames,
            preview: this.getPreview(sessionId, workbook.SheetNames[0], 0)
        };
    }

    getPreview(sessionId: string, sheetName: string, headerRowIndex: number = 0) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.workbook) throw new BadRequestException('Session not found');

        const sheet = session.workbook.Sheets[sheetName];
        if (!sheet) throw new BadRequestException('Sheet not found');

        // Read with header: 1 to get array of arrays
        const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (data.length <= headerRowIndex) return { headers: [], sample: [] };

        const headers = data[headerRowIndex].map(String);
        const sample = data.slice(headerRowIndex + 1, headerRowIndex + 6); // Next 5 rows

        // Update session context
        session.sheetName = sheetName;
        session.headerRowIndex = headerRowIndex;
        this.sessions.set(sessionId, session);

        return { headers, sample, totalRows: data.length - (headerRowIndex + 1) };
    }

    async validate(sessionId: string, mapping: Record<string, string>, strategyKey: string, payload?: any) {
        const session = this.sessions.get(sessionId);
        const strategy = this.strategies.get(strategyKey);

        if (!session || !session.workbook) throw new BadRequestException('Session invalid');
        if (!strategy) throw new BadRequestException(`Strategy ${strategyKey} not found`);

        const sheetName = session.sheetName || session.workbook.SheetNames[0];
        const headerRowIndex = session.headerRowIndex || 0;
        const sheet = session.workbook.Sheets[sheetName];

        const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        const headers = rawData[headerRowIndex].map(String);
        const dataRows = rawData.slice(headerRowIndex + 1);

        // Map data from Excel columns to DB fields
        // mapping: { "deviceCode": "Mã thiết bị", "quantity": "Số lượng" } -> Key is DB field, Value is Excel Header Name
        // OR mapping: { "deviceCode": "A", "quantity": "B" } if mapped by index?
        // Usually mapping is { "dbField": "ExcelHeaderName" }

        const mappedData = dataRows.map(row => {
            const obj: any = {};
            Object.keys(mapping).forEach(dbField => {
                const excelHeader = mapping[dbField];
                const colIndex = headers.indexOf(excelHeader);
                if (colIndex !== -1) {
                    obj[dbField] = row[colIndex];
                }
            });
            return obj;
        });

        const validationResults = await strategy.validate(mappedData, payload);

        session.validationResults = validationResults;
        session.mapping = mapping;
        session.parsedData = mappedData;
        session.validRows = validationResults.filter(r => r.valid).map(r => r.data);
        this.sessions.set(sessionId, session);

        const validCount = validationResults.filter(r => r.valid).length;
        const invalidCount = validationResults.length - validCount;

        return {
            total: validationResults.length,
            valid: validCount,
            invalid: invalidCount,
            details: validationResults // Return details for preview table
        };
    }

    async execute(sessionId: string, strategyKey: string, payload?: any) {
        const session = this.sessions.get(sessionId);
        const strategy = this.strategies.get(strategyKey);

        if (!session || !session.validRows) throw new BadRequestException('Session invalid or not validated');
        if (!strategy) throw new BadRequestException(`Strategy ${strategyKey} not found`);

        const result = await strategy.execute(session.validRows, payload);

        // Cleanup session
        this.sessions.delete(sessionId);

        return result;
    }
}
