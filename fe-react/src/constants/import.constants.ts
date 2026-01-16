

export const IMPORT_LABELS = {
    PAGE_TITLE: 'Danh sách phiếu nhập kho',
    BTN_CREATE: 'Thêm mới phiếu nhập',
    BTN_EXPORT_SERIAL: 'Xuất',
    BTN_DETAIL: 'Chi tiết',
    SEARCH_PLACEHOLDER: 'Tìm mã phiếu, NCC, người nhập...',
    NOT_FOUND: 'Không tìm thấy phiếu nhập nào',
    CREATE_NOW: 'Tạo phiếu nhập ngay',
};

export const IMPORT_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed'
};

export const IMPORT_STATUS_CONFIG = {
    [IMPORT_STATUS.PENDING]: { color: 'default', text: 'Chưa kiểm kê' },
    [IMPORT_STATUS.IN_PROGRESS]: { color: 'processing', text: 'Đang kiểm kê' },
    [IMPORT_STATUS.COMPLETED]: { color: 'success', text: 'Đã kiểm kê' }
};

export const IMPORT_ORIGIN_CONFIG: Record<string, { color: string; text: string }> = {
    DOMESTIC: { color: 'green', text: 'Nội địa' },
    IMPORT: { color: 'blue', text: 'Nhập khẩu' },
    WARRANTY_RETURN: { color: 'orange', text: 'Trả bảo hành' },
    DEFAULT: { color: 'default', text: 'Khác' }
};

export const IMPORT_TABLE_COLUMNS = {
    CODE: 'Mã phiếu nhập',
    TYPE: 'Loại hàng hóa',
    ORIGIN: 'Nguồn gốc',
    DATE: 'Ngày nhập',
    IMPORTER: 'Người nhập kho',
    SUPPLIER: 'Đơn vị xuất',
    TOTAL_QTY: 'Tổng SP',
    STATUS: 'Trạng thái kiểm kê',
    NOTE: 'Ghi chú',
    ACTION: 'Thao tác'
};
