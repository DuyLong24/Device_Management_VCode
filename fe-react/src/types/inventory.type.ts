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
    totalSerials: number;
    inventoryStatus: InventoryStatus;
}
// ...
export interface SerialItem {
    id: string;
    deviceCode: string;
    deviceName: string;
    serial: string;
    checkResult: CheckResult;
    note?: string;
}
