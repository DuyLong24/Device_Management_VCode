
export type DeviceType = 'Camera' | 'Màn hình' | 'Barrier' | 'Khác';
export type QCResult = 'pass' | 'fail';
export type ValidationStatus = 'valid' | 'invalid';
export type QCSource = 'INVENTORY' | 'WARRANTY_RECHECK'; // Nguồn QC
export type WarrantyRecheckType = 'REPLACE' | 'REPAIR' | null; // Loại QC lại

export interface QCPendingItem {
    key: string;
    id: string;
    serial: string;
    deviceCode: string;
    deviceName: string;
    deviceType: DeviceType;
    importCode: string;
    importDate: string;
    inventoryCompletedAt: string;
    qcSource: QCSource;
    warrantyRecheckType?: WarrantyRecheckType;
    oldSerial?: string;
    qcDate?: string;
}

export interface ScannedSerial extends QCPendingItem {
    validationStatus: ValidationStatus;
    validationMessage?: string;
}
