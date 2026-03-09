import { axiosInstance } from '../configs/axios.config';

export interface ScanResult {
    success: string[];
    errors: { mac: string; error: string }[];
    warnings: { mac: string; warning: string }[];
}

const transformSession = (session: any) => {
    if (!session) return session;
    const transformed = { ...session };

    // Map macChecked to totalScanned for frontend consistency
    if (session.macChecked !== undefined) {
        transformed.totalScanned = session.macChecked;
    }

    return transformed;
};

export const exportSessionService = {
    getSessions: async (exportId: string) => {
        const res = await axiosInstance.get(`/device-exports/${exportId}/sessions`);
        if (Array.isArray(res.data)) {
            res.data = res.data.map(transformSession);
        }
        return res;
    },

    create: (data: { exportId: string; sessionName?: string; note?: string }) =>
        axiosInstance.post('/device-exports/sessions', data),

    getDetail: async (id: string) => {
        const res = await axiosInstance.get(`/device-exports/sessions/${id}`);
        res.data = transformSession(res.data);
        return res;
    },

    scanMac: async (id: string, mac: string) => {
        const res = await axiosInstance.post(`/device-exports/sessions/${id}/scan`, { mac });
        res.data = transformSession(res.data);
        return res;
    },

    scanBulk: (id: string, macs: string[], scanMode?: string) =>
        axiosInstance.post<ScanResult>(`/device-exports/sessions/${id}/scan-bulk`, { macs, scanMode }),

    complete: (id: string) =>
        axiosInstance.post(`/device-exports/sessions/${id}/complete`),

    removeMac: async (id: string, mac: string) => {
        const res = await axiosInstance.delete(`/device-exports/sessions/${id}/items/${mac}`);
        res.data = transformSession(res.data);
        return res;
    },
};
