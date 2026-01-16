import { axiosInstance } from '../configs/axios.config';

export interface ScannedItem {
    serial: string;
    model: string;
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

export const inventorySessionService = {
    getByImportId: async (importId: string) => {
        const response = await axiosInstance.get<InventorySession[]>('/inventory-sessions', {
            params: { importId }
        });
        return response.data;
    },

    create: async (data: { importId: string; name: string; note?: string }) => {
        const response = await axiosInstance.post('/inventory-sessions', data);
        return response.data;
    },

    update: async (id: string, data: { scannedItems?: { serial: string, model: string }[], status?: string }) => {
        const response = await axiosInstance.put(`/inventory-sessions/${id}`, data);
        return response.data;
    },

    async removeItem(sessionId: string, serial: string) {
        return axiosInstance.delete(`/inventory-sessions/${sessionId}/items/${serial}`);
    }

};
