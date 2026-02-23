export type InventoryStatus = 'pending' | 'in-progress' | 'completed';
export type SessionStatus = 'init' | 'in-progress' | 'completed';
export type CheckResult = 'match' | 'missing' | 'excess' | 'duplicate';

export interface ImportRecord {
    id: string;
    importCode: string;
    deviceType: string;
    importDate: string;
    importedBy: string;
    supplier: string;
    totalQuantity: number;
    totalMacs: number;
    inventoryStatus: InventoryStatus;
}
export interface MacItem {
    id: string;
    deviceCode: string;
    deviceName: string;
    mac: string;
    checkResult: CheckResult;
    note?: string;
}
export interface ScannedItem {
    mac: string;
    deviceModel: string;
    deviceCode: string;
    scannedAt?: Date;
    scannedBy?: any;
    _id?: string;
}

export type LocalScannedItem = ScannedItem & { deviceCode?: string };
