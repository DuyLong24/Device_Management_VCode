export enum WarehouseCode {
    // Kho nội bộ
    PENDING_QC = 'PENDING_QC',
    READY_TO_EXPORT = 'READY_TO_EXPORT',
    DEFECT = 'DEFECT',
    UNDER_REPAIR = 'UNDER_REPAIR',

    // Kho bảo hành
    IN_WARRANTY = 'IN_WARRANTY',

    // Kho đã xuất
    SOLD = 'SOLD',
    NOT_ACTIVATED = 'NOT_ACTIVATED',
    SOLD_WARRANTY = 'SOLD_WARRANTY',
    REMOVED = 'REMOVED',
}

export enum TransitionType {
    IMPORT = 'IMPORT',         // Nhập mới
    QC_PASS = 'QC_PASS',       // QC Đạt
    QC_FAIL = 'QC_FAIL',       // QC Lỗi
    TRANSFER = 'TRANSFER',     // Chuyển kho thường
    EXPORT = 'EXPORT',         // Xuất bán
    EXPORT_NO_WARRANTY = 'EXPORT_NO_WARRANTY', // Xuất chưa kích hoạt
    ACTIVATE_WARRANTY = 'ACTIVATE_WARRANTY',   // Kích hoạt bảo hành (-> SOLD/IN_WARRANTY)
    SEND_WARRANTY = 'SEND_WARRANTY', // Gửi bảo hành
    RECEIVE_WARRANTY = 'RECEIVE_WARRANTY', // Nhận bảo hành
    WARRANTY_REPLACE = 'WARRANTY_REPLACE', // Bảo hành: Đổi mới (-> REMOVED)
    WARRANTY_REPAIR = 'WARRANTY_REPAIR',   // Bảo hành: Sửa xong (-> PENDING_QC)
    SCRAP = 'SCRAP',                       // Thanh lý/Hủy (-> REMOVED)
    CUSTOMER_RETURN = 'CUSTOMER_RETURN',   // Khách trả hàng (-> PENDING_QC)
    PENDING_QC_TO_UNDER_REPAIR = 'PENDING_QC_TO_UNDER_REPAIR', // QC -> Sửa chữa
}

export enum ActionType {
    SCAN = 'scan',
    IMPORT_EXCEL = 'import_excel',
    TRANSFER = 'transfer',
    QC_BATCH = 'qc_batch',
    EXPORT_CREATE = 'export_create',
    WARRANTY_SEND = 'warranty_send',
    IMPORT = "IMPORT",
}