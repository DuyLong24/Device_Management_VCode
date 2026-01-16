//File này giúp quản lý tập trung các mã kho và loại hành động.

export enum WarehouseCode {
    // Kho nội bộ
    PENDING_QC = 'PENDING_QC',
    READY_TO_EXPORT = 'READY_TO_EXPORT',
    DEFECT = 'DEFECT',

    // Kho bảo hành
    IN_WARRANTY = 'IN_WARRANTY',

    // Kho đã xuất
    SOLD = 'SOLD',
    SOLD_WARRANTY = 'SOLD_WARRANTY',
}

export enum TransitionType {
    IMPORT = 'IMPORT',         // Nhập mới
    QC_PASS = 'QC_PASS',       // QC Đạt
    QC_FAIL = 'QC_FAIL',       // QC Lỗi
    TRANSFER = 'TRANSFER',     // Chuyển kho thường
    EXPORT = 'EXPORT',         // Xuất bán
    SEND_WARRANTY = 'SEND_WARRANTY', // Gửi bảo hành
    RECEIVE_WARRANTY = 'RECEIVE_WARRANTY', // Nhận bảo hành
}

export enum ActionType {
    SCAN = 'scan',
    IMPORT_EXCEL = 'import_excel',
    TRANSFER = 'transfer',
    QC_BATCH = 'qc_batch',
    EXPORT_CREATE = 'export_create',
    WARRANTY_SEND = 'warranty_send',
}