export enum ExportStatus {
    DRAFT = 'DRAFT',  // Nháp  
    PENDING_APPROVAL = 'PENDING_APPROVAL',  // Chờ duyệt
    APPROVED = 'APPROVED',  // Đã duyệt
    IN_PROGRESS = 'IN_PROGRESS',  // Đang xuất
    COMPLETED = 'COMPLETED',  // Hoàn thành
    REJECTED = 'REJECTED',  // Từ chối
    CANCELLED = 'CANCELLED'  // Hủy
}

export enum ExportReason {
    SALE = 'SALE',  // Xuất bán hàng
    WARRANTY = 'WARRANTY',  // Xuất bảo hành
    TRANSFER = 'TRANSFER',  // Điều chuyển
    OTHER = 'OTHER'  // Khác
}

// Định nghĩa các chuyển đổi trạng thái hợp lệ (state machine)

export const ALLOWED_STATUS_TRANSITIONS: Record<ExportStatus, ExportStatus[]> = {
    [ExportStatus.DRAFT]: [ExportStatus.PENDING_APPROVAL, ExportStatus.CANCELLED],
    [ExportStatus.PENDING_APPROVAL]: [ExportStatus.APPROVED, ExportStatus.REJECTED, ExportStatus.DRAFT],
    [ExportStatus.APPROVED]: [ExportStatus.IN_PROGRESS, ExportStatus.CANCELLED],
    [ExportStatus.IN_PROGRESS]: [ExportStatus.COMPLETED, ExportStatus.CANCELLED],
    [ExportStatus.COMPLETED]: [],
    [ExportStatus.REJECTED]: [ExportStatus.DRAFT],
    [ExportStatus.CANCELLED]: []
};

// Kiểm tra chuyển đổi hợp lệ
export function isValidStatusTransition(from: ExportStatus, to: ExportStatus): boolean {
    return ALLOWED_STATUS_TRANSITIONS[from]?.includes(to) || false;
}
