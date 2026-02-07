import * as XLSX from 'xlsx';
import { message } from 'antd';

/**
 * Parse file Excel và trích xuất MAC từ cột được chỉ định
 * @param file File Excel cần parse
 * @param options Các tùy chọn cấu hình
 * @returns Mảng các chuỗi MAC
 */
export async function parseExcelMacs(
    file: File,
    options?: {
        skipFirstRow?: boolean;
        columnIndex?: number;
    }
): Promise<string[]> {
    const { skipFirstRow = true, columnIndex = 0 } = options || {};

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                // Chuyển đổi sang mảng 2 chiều (2D array)
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

                const macs: string[] = [];
                const startRow = skipFirstRow ? 1 : 0;

                for (let i = startRow; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (row && row[columnIndex]) {
                        const mac = String(row[columnIndex]).trim();
                        if (mac) {
                            macs.push(mac);
                        }
                    }
                }

                message.success(`Đã đọc được ${macs.length} MAC từ file Excel`);
                resolve(macs);
            } catch (err) {
                console.error('Excel parsing error:', err);
                message.error('Lỗi đọc file Excel. Vui lòng kiểm tra định dạng.');
                reject(err);
            }
        };

        reader.onerror = () => {
            message.error('Lỗi đọc file');
            reject(new Error('File read error'));
        };

        reader.readAsBinaryString(file);
    });
}

/**
 * Merge hai mảng MAC và loại bỏ các phần tử trùng lặp (duplicate)
 * @param existing Các MAC hiện có
 * @param newMacs Các MAC mới cần merge
 * @returns Mảng các MAC duy nhất (unique)
 */
export function mergeMacs(existing: string[], newMacs: string[]): string[] {
    return [...new Set([...existing, ...newMacs])];
}

/**
 * Validate định dạng MAC (kiểm tra cơ bản)
 * @param serial MAC cần validate
 * @returns true nếu định dạng hợp lệ
 */
export function isValidMac(mac: string): boolean {
    if (!mac || mac.length === 0) return false;
    // Cho phép các ký tự chữ số (alphanumeric) và dấu gạch nối
    return /^[A-Z0-9-]+$/i.test(mac);
}