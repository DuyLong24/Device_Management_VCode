export const ImportStatus = {
    DRAFT: 'DRAFT',
    PUBLIC: 'PUBLIC',
} as const;

export type ImportStatus = keyof typeof ImportStatus;

export type InventoryStatus = 'pending' | 'in-progress' | 'completed';

export interface ImportDeviceDetail {
    mac: string;
    serial: string;
    p2p: string;
    name: string;
}

export interface ImportDevice {
    _id?: string;
    deviceCode: string;
    quantity: number;
    boxCount?: number;
    itemsPerBox?: number;
    macImported?: number;
    deviceName?: string;
    expectedMacs?: string[];
    expectedDetails?: ImportDeviceDetail[];
}

export interface DeviceImport {
    id: string;
    code: string;
    status: ImportStatus;
    inventoryStatus: InventoryStatus;
    deviceType: string;
    origin: string;
    importDate: string;
    importedBy: string;
    supplier: string;
    handoverPerson: string;
    notes?: string;
    devices: ImportDevice[];
    totalItem: number;
    totalQuantity: number;
    macImported: number;
    createdBy?: {
        _id: string;
        name: string;
        username: string;
    };
}

export interface CreateImportDto {
    code?: string;
    notes?: string;
    importDate: string;
    supplier: string;
    devices: Omit<ImportDevice, '_id' | 'macImported' | 'deviceName'>[];
}

export interface DeviceEntry extends Omit<ImportDevice, '_id' | 'boxCount' | 'itemsPerBox'> {
    key: string;
    boxCount: number | null | undefined;
    itemsPerBox: number | null | undefined;
}