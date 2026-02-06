import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ExcelColumn } from './interfaces/excel-column.interface';

@Injectable()
export class ExcelService {

    /**
     * Xuất danh sách dạng Bảng (Table) chuẩn
     * @param data Mảng dữ liệu từ DB
     * @param columns Cấu hình cột
     * @param sheetName Tên sheet
     */
    async exportTableData<T>(
        data: T[],
        columns: ExcelColumn[],
        sheetName: string = 'Sheet1'
    ): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(sheetName);

        // 1. Setup Header Row
        worksheet.columns = columns.map(col => ({
            header: col.header,
            key: col.key,
            width: col.width || 20,
        }));

        // 2. Add Data Rows
        data.forEach((item: any, index: number) => {
            const rowData: any = {};

            columns.forEach(col => {
                // Lấy giá trị gốc (Hỗ trợ nested key như 'warehouseId.name')
                let value = this.getValueByPath(item, col.key);

                // Nếu có format riêng
                if (col.format) {
                    value = col.format(value, item, index + 1);
                }

                rowData[col.key] = value;
            });

            const row = worksheet.addRow(rowData);

            // Apply Alignment cho từng cell data
            columns.forEach((col, colIndex) => {
                if (col.alignment) {
                    row.getCell(colIndex + 1).alignment = {
                        vertical: 'middle',
                        horizontal: col.alignment,
                        wrapText: true
                    };
                } else {
                    // Mặc định wrap text
                    row.getCell(colIndex + 1).alignment = { vertical: 'middle', wrapText: true };
                }
            });
        });

        // 3. Apply Styling (Standardize)
        this.styleWorksheet(worksheet);

        return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
    }

    /**
     * Xuất báo cáo dạng Master-Detail (Thông tin chung ở trên, Bảng dữ liệu ở dưới)
     */
    async exportMasterDetail<T>(
        info: { label: string; value: any }[],
        data: T[],
        columns: ExcelColumn[],
        sheetName: string = 'Report'
    ): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(sheetName);

        // 1. Info Section
        let currentRow = 1;
        info.forEach(item => {
            const row = worksheet.getRow(currentRow);
            row.getCell(1).value = item.label;
            row.getCell(1).font = { bold: true, name: 'Times New Roman' };
            row.getCell(2).value = item.value;
            row.getCell(2).font = { name: 'Times New Roman' };
            currentRow++;
        });

        currentRow++; // Space

        // 2. Table Header
        const headerRow = worksheet.getRow(currentRow);
        columns.forEach((col, index) => {
            const cell = headerRow.getCell(index + 1);
            cell.value = col.header;
            cell.font = { bold: true, color: { argb: 'FFFFFF' }, name: 'Times New Roman' };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' } // Blue header
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

            // Set width
            worksheet.getColumn(index + 1).width = col.width || 20;
        });
        currentRow++;

        // 3. Table Data
        data.forEach((item: any, index) => {
            const row = worksheet.getRow(currentRow);
            columns.forEach((col, colIndex) => {
                let value = this.getValueByPath(item, col.key);
                if (col.format) value = col.format(value, item, index + 1);

                const cell = row.getCell(colIndex + 1);
                cell.value = value;
                cell.font = { name: 'Times New Roman' };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                cell.alignment = { vertical: 'middle', wrapText: true, horizontal: col.alignment || 'left' };
            });
            currentRow++;
        });

        return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
    }

    // --- PRIVATE HELPERS ---

    private getValueByPath(obj: any, path: string): any {
        if (!path) return undefined;
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }

    private styleWorksheet(worksheet: ExcelJS.Worksheet) {
        // Style Header: Bold, Center, Background Xám, Border
        const headerRow = worksheet.getRow(1);
        headerRow.height = 30;

        headerRow.eachCell((cell) => {
            cell.font = { bold: true, size: 12, name: 'Times New Roman', color: { argb: 'FF000000' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFEEEEEE' }, // Xám nhạt
            };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
        });

        // Style Data: Font Times New Roman, Border
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                row.font = { name: 'Times New Roman', size: 11 };
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' },
                    };
                });
            }
        });
    }
}