import { axiosInstance } from '../configs/axios.config';

export interface ScanResult {
    success: string[];
    errors: { serial: string; error: string }[];
    warnings: { serial: string; warning: string }[];
}

export const exportSessionService = {
    getSessions: (exportId: string) => axiosInstance.get(`/device-exports/${exportId}/sessions`),

    create: (data: { exportId: string; sessionName?: string; note?: string }) =>
        axiosInstance.post('/device-exports/sessions', data),

    getDetail: (id: string) => axiosInstance.get(`/device-exports/sessions/${id}`),

    scanSerial: (id: string, serial: string) =>
        axiosInstance.post(`/device-exports/sessions/${id}/scan`, { serial }),

    scanBulk: (id: string, serials: string[]) =>
        axiosInstance.post<ScanResult>(`/device-exports/sessions/${id}/scan-bulk`, { serials }),

    complete: (id: string) =>
        axiosInstance.post(`/device-exports/sessions/${id}/complete`),

    removeSerial: (id: string, serial: string) =>
        axiosInstance.delete(`/device-exports/sessions/${id}/items/${serial}`),
};
