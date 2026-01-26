export const ExportStatus = {
    DRAFT: 'DRAFT',
    PENDING_APPROVAL: 'PENDING_APPROVAL',
    APPROVED: 'APPROVED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    REJECTED: 'REJECTED',
    CANCELLED: 'CANCELLED',
} as const;

export type ExportStatus = keyof typeof ExportStatus;

export interface ExportRequirement {
    deviceCode: string;
    deviceName?: string;
    quantity: number;
}

export interface ExportItem {
    serial: string;
    deviceModel: string;
    deviceCode: string;
    exportPrice?: number;
}

export interface DeviceExport {
    id: string;
    _id?: string;
    code: string;
    exportName: string;
    type: string; // 'SALE', 'TRANSFER', 'LIQUIDATION'

    exportReason?: string;
    project?: string;
    receiverPerson?: string;
    deliveryAddress?: string;
    notes?: string;
    rejectedReason?: string;

    receiver: string;
    customer?: string;

    status: ExportStatus;

    requirements: ExportRequirement[];
    items: ExportItem[];

    totalItems: number;
    totalQuantity: number;
    totalDeviceCodes?: number;

    exportDate?: string;
    approvedDate?: string;

    createdAt?: string;
    createdBy?: any;
    approvedBy?: any;
}

export interface CreateExportDto {
    exportName?: string;
    type: string;
    exportReason?: string;
    project?: string;
    receiver?: string;
    receiverPerson?: string;
    customer?: string;
    deliveryAddress?: string;
    notes?: string;
    requirements?: ExportRequirement[];

    totalQuantity?: number; // Auto calc
    status?: string;
}

export interface PaginatedResponse<T> {
    results: T[];
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
}
