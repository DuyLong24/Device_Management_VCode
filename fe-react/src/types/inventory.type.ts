export type InventoryStatus = 'pending' | 'in-progress' | 'completed';
export type SessionStatus = 'init' | 'in-progress' | 'completed';
export type CheckResult = 'match' | 'missing' | 'excess' | 'duplicate';

export interface ImportRecord {
    id: string;
    importCode: string;
    productType: string;
    importDate: string;
    importedBy: string;
    supplier: string;
    totalQuantity: number;
    totalSerials: number;
    inventoryStatus: InventoryStatus;
}

export interface InventorySession {
    id: string;
    sessionCode: string;
    sessionName: string;
    status: SessionStatus;
    totalQuantity: number;
    createdAt: string;
}

export interface SerialItem {
    id: string;
    productCode: string;
    productName: string;
    serial: string;
    checkResult: CheckResult;
    note?: string;
}
