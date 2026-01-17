import { axiosInstance } from '../configs/axios.config';
import type { DeviceExport, CreateExportDto } from '../types/export.type';

export const exportService = {
    getAll: async (_params: any) => {
        const response = await axiosInstance.get<DeviceExport[]>('/device-exports', {
            params: {
                sortBy: 'createdAt:desc',
                ..._params
            }
        });
        return {
            data: response.data,
            success: true,
            total: Array.isArray(response.data) ? response.data.length : 0,
        };
    },

    create: async (data: CreateExportDto) => {
        return axiosInstance.post<DeviceExport>('/device-exports', data);
    },

    getDetail: async (id: string) => {
        return axiosInstance.get<DeviceExport>(`/device-exports/${id}`);
    },

    addItems: async (id: string, serials: string[]) => {
        return axiosInstance.post<DeviceExport>(`/device-exports/${id}/items`, { serials });
    },

    confirm: async (id: string) => {
        return axiosInstance.post<DeviceExport>(`/device-exports/${id}/confirm`);
    },

    submitForApproval: async (id: string) => {
        return axiosInstance.post<DeviceExport>(`/device-exports/${id}/submit`);
    },

    approve: async (id: string) => {
        return axiosInstance.post<DeviceExport>(`/device-exports/${id}/approve`);
    },

    reject: async (id: string, reason: string) => {
        return axiosInstance.post<DeviceExport>(`/device-exports/${id}/reject`, { reason });
    },

    delete: async (id: string) => {
        return axiosInstance.delete(`/device-exports/${id}`);
    }
};
