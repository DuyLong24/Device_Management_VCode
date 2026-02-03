/**
 * MAC Address Utilities
 * Hỗ trợ xử lý input từ máy quét barcode/QR code
 */

// Regex chuẩn cho MAC Address (XX:XX:XX:XX:XX:XX)
// Chấp nhận ký tự hoa thường, phân cách bằng dấu hai chấm
export const MAC_REGEX_STRICT = /^([0-9A-Fa-f]{2}[:]){5}([0-9A-Fa-f]{2})$/;

// Regex tìm kiếm MAC trong một đoạn văn bản (Global)
export const MAC_REGEX_GLOBAL = /([0-9A-Fa-f]{2}[:]){5}([0-9A-Fa-f]{2})/g;

/**
 * Kiểm tra xem một chuỗi có phải là MAC hợp lệ không
 */
export const isValidMac = (mac: string): boolean => {
    if (!mac) return false;
    return MAC_REGEX_STRICT.test(mac.trim());
};

/**
 * Trích xuất tất cả MAC Address hợp lệ từ một văn bản hỗn hợp (Raw Input)
 * Dùng cho trường hợp Paste hoặc khi Scanner gửi một cục dữ liệu lớn
 */
export const extractValidMacs = (text: string): string[] => {
    if (!text) return [];
    const matches = text.match(MAC_REGEX_GLOBAL);
    if (!matches) return [];
    return Array.from(new Set(matches)); // Remove duplicates
};

/**
 * Xử lý Input từ Scanner (Real-time Filtering)
 * Hàm này dùng cho sự kiện OnChange của TextArea
 * Logic:
 * 1. Tách dòng
 * 2. Giữ lại các dòng MAC hợp lệ (đã hoàn thành - có xuống dòng)
 * 3. Giữ lại dòng cuối cùng (đang nhập dở)
 * 4. Loại bỏ các dòng đã hoàn thành nhưng không phải MAC (Rác từ Serial, v.v)
 */
export const processScannerInput = (currentValue: string): string => {
    if (!currentValue) return '';

    // Chuẩn hóa dòng mới (Scanner có thể gửi \r\n hoặc \n)
    const rawLines = currentValue.replace(/\r\n/g, '\n').split('\n');

    // Xử lý từng dòng
    const processedLines = rawLines.map((line, index) => {
        const trimmed = line.trim();
        const isLastLine = index === rawLines.length - 1;

        // Nếu là dòng trống -> Giữ (để user có thể enter tiếp)
        if (!trimmed) return line;

        // Nếu là dòng cuối cùng (Đang nhập dở) -> Giữ nguyên để user typing/scanning tiếp
        // (Scanner bắn từng ký tự rất nhanh, ta không được xóa khi chưa xong)
        if (isLastLine) return line;

        // Nếu là dòng đã hoàn thành (đã có enter):
        // Chỉ giữ lại nếu đúng định dạng MAC
        if (isValidMac(trimmed)) {
            return trimmed; // Giữ lại (có thể format lại uppercase nếu muốn)
        }

        // Nếu không đúng MAC (ví dụ Serial Number) -> Xóa bỏ (trả về null để filter sau)
        return null;
    });

    // Lọc bỏ các dòng null (Dòng rác đã bị xóa) & Join lại
    const result = processedLines.filter(l => l !== null).join('\n');

    // [UX Improvement]: Nếu kết quả thay đổi (nghĩa là có dòng rác bị xóa),
    // con trỏ cursor có thể bị nhảy. Component gọi hàm này cần xử lý cẩn thận hoặc chấp nhận nhảy về cuối.
    return result;
};
