import { axiosInstance } from '../configs/axios.config';

export interface ScannedItem {
    mac: string;
    serial?: string;
    deviceModel: string;
    scannedAt?: string;
    _id?: string;
}

export interface InventorySession {
    id: string;
    code: string;
    name: string;
    importId: string;
    status: 'processing' | 'completed' | 'cancelled';
    details: ScannedItem[];
    totalScanned: number;
    note?: string;
    createdAt: string;
    createdBy: string;
}

const transformSession = (session: any) => {
    if (!session) return session;
    const transformed = { ...session };
    if (session.details && Array.isArray(session.details)) {
        transformed.details = session.details.map((item: any) => ({
            ...item,
            mac: item.mac || item.serial,
        }));
    }
    return transformed;
};

export const inventorySessionService = {
    getByImportId: async (importId: string) => {
        const response = await axiosInstance.get<InventorySession[]>('/inventory-sessions', {
            params: { importId }
        });
        if (Array.isArray(response.data)) {
            response.data = response.data.map(transformSession);
        }
        return response.data;
    },

    create: async (data: { importId: string; name: string; note?: string }) => {
        const response = await axiosInstance.post('/inventory-sessions', data);
        return transformSession(response.data);
    },

    update: async (id: string, data: { scannedItems?: { mac: string, deviceModel: string, deviceCode?: string }[], status?: string, scanMode?: 'mac' | 'serial' }) => {
        const response = await axiosInstance.put(`/inventory-sessions/${id}`, data);
        return transformSession(response.data);
    },

    async removeItem(sessionId: string, mac: string) {
        const response = await axiosInstance.delete(`/inventory-sessions/${sessionId}/items/${mac}`);
        return transformSession(response.data);
    }

};
