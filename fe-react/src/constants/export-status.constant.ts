// Tất cả các trạng thái của phiếu xuất kho

export const EXPORT_STATUS = {
    DRAFT: 'DRAFT',
    PENDING_APPROVAL: 'PENDING_APPROVAL',
    APPROVED: 'APPROVED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    REJECTED: 'REJECTED',
    CANCELLED: 'CANCELLED'
} as const;

export type ExportStatusType = typeof EXPORT_STATUS[keyof typeof EXPORT_STATUS];

export const EXPORT_STATUS_LABELS: Record<ExportStatusType, string> = {
    [EXPORT_STATUS.DRAFT]: 'Nháp',
    [EXPORT_STATUS.PENDING_APPROVAL]: 'Chờ duyệt',
    [EXPORT_STATUS.APPROVED]: 'Đã duyệt',
    [EXPORT_STATUS.IN_PROGRESS]: 'Đang xuất',
    [EXPORT_STATUS.COMPLETED]: 'Hoàn thành',
    [EXPORT_STATUS.REJECTED]: 'Từ chối',
    [EXPORT_STATUS.CANCELLED]: 'Hủy'
};

// Colors cho Ant Design Tag component
export const EXPORT_STATUS_COLORS: Record<ExportStatusType, string> = {
    [EXPORT_STATUS.DRAFT]: 'default',
    [EXPORT_STATUS.PENDING_APPROVAL]: 'warning',
    [EXPORT_STATUS.APPROVED]: 'blue',
    [EXPORT_STATUS.IN_PROGRESS]: 'processing',
    [EXPORT_STATUS.COMPLETED]: 'success',
    [EXPORT_STATUS.REJECTED]: 'error',
    [EXPORT_STATUS.CANCELLED]: 'default'
};


// Export Type/Reason

export const EXPORT_TYPE = {
    SALE: 'SALE',
    TRANSFER: 'TRANSFER',
    WARRANTY: 'WARRANTY',
    OTHER: 'OTHER'
} as const;

export type ExportTypeType = typeof EXPORT_TYPE[keyof typeof EXPORT_TYPE];


// Colors cho export types
export const EXPORT_TYPE_COLORS: Record<ExportTypeType, string> = {
    [EXPORT_TYPE.SALE]: 'blue',
    [EXPORT_TYPE.TRANSFER]: 'orange',
    [EXPORT_TYPE.WARRANTY]: 'green',
    [EXPORT_TYPE.OTHER]: 'default'
};

// Labels cho export types
export const EXPORT_TYPE_LABELS: Record<ExportTypeType, string> = {
    [EXPORT_TYPE.SALE]: 'Xuất bán hàng',
    [EXPORT_TYPE.TRANSFER]: 'Điều chuyển',
    [EXPORT_TYPE.WARRANTY]: 'Xuất bảo hành',
    [EXPORT_TYPE.OTHER]: 'Khác'
};
