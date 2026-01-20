export const ImportStatus = {
    DRAFT: 'DRAFT',
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
} as const;

export type ImportStatus = keyof typeof ImportStatus;

export type InventoryStatus = 'pending' | 'in-progress' | 'completed';

export interface ImportProduct {
    _id?: string;
    productCode: string;
    quantity: number;
    boxCount?: number;
    itemsPerBox?: number;
    serialImported?: number;
    productName?: string;
    expectedSerials?: string[];
}

export interface DeviceImport {
    id: string;
    code: string;
    status: ImportStatus;
    inventoryStatus: InventoryStatus;
    productType: string;
    origin: string;
    importDate: string;
    importedBy: string;
    supplier: string;
    handoverPerson: string;
    notes?: string;
    products: ImportProduct[];
    totalItem: number;
    totalQuantity: number;
    serialImported: number;
}

export interface CreateImportDto {
    code?: string;
    notes?: string;
    importDate: string;
    supplier: string;
    products: {
        productCode: string;
        quantity: number;
        boxCount?: number;
        itemsPerBox?: number;
        expectedSerials?: string[];
    }[];
}