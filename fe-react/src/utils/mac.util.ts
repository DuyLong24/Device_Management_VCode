/**
 * MAC Address Utilities
 * Hỗ trợ xử lý input từ máy quét barcode/QR code
 */

// Regex chuẩn cho MAC (XX:XX:XX:XX:XX:XX)
export const MAC_REGEX_STRICT = /^([0-9A-Fa-f]{2}[:]){5}([0-9A-Fa-f]{2})$/;

// Regex tìm kiếm MAC trong một văn bản (Global)
export const MAC_REGEX_GLOBAL = /([0-9A-Fa-f]{2}[:]){5}([0-9A-Fa-f]{2})/g;

// Regex chuẩn cho Serial (Chỉ chấp nhận ký tự SỐ 0-9)
export const SERIAL_REGEX_STRICT = /^\d+$/;

// Regex tìm kiếm Serial trong một văn bản
export const SERIAL_REGEX_GLOBAL = /\d+/g;

import type { ScanMode } from '../hooks/useScanMode';

export const isValidScan = (text: string, mode: ScanMode): boolean => {
    if (!text) return false;
    return mode === 'mac' ? MAC_REGEX_STRICT.test(text.trim()) : SERIAL_REGEX_STRICT.test(text.trim());
};

export const extractValidScans = (text: string, mode: ScanMode): string[] => {
    if (!text) return [];

    // Split by common delimiters (newline, comma, space)
    const tokens = text.split(/[\n\s,]+/).map(t => t.trim()).filter(Boolean);

    const validTokens = tokens.filter(token => {
        if (mode === 'mac') {
            return MAC_REGEX_STRICT.test(token);
        } else {
            // Strict digit check
            return SERIAL_REGEX_STRICT.test(token);
        }
    });

    return Array.from(new Set(validTokens));
};

export const processScannerInput = (currentValue: string, mode: ScanMode): string => {
    if (!currentValue) return '';

    const rawLines = currentValue.replace(/\r\n/g, '\n').split('\n');

    const processedLines = rawLines.map((line, index) => {
        const trimmed = line.trim();
        const isLastLine = index === rawLines.length - 1;

        if (!trimmed) return line;

        if (isLastLine) return line;

        if (isValidScan(trimmed, mode)) {
            return trimmed;
        }

        const extracted = extractValidScans(trimmed, mode);
        if (extracted.length > 0) {
            return extracted.join('\n');
        }

        return null;
    });

    const result = processedLines.filter(l => l !== null).join('\n');
    return result;
};
