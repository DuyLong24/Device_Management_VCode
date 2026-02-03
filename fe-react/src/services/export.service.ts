import { axiosInstance } from '../configs/axios.config';
import type { DeviceExport, CreateExportDto, PaginatedResponse } from '../types/export.type';

export const exportService = {
    getAll: async (_params: any) => {
        const response = await axiosInstance.get<PaginatedResponse<DeviceExport>>('/device-exports', {
            params: {
                sortBy: 'updatedAt:desc',
                ..._params
            }
        });

        const items = response.data?.results || [];

        return {
            data: items,
            success: true,
            total: response.data?.totalResults || items.length,
        };
    },

    create: async (data: CreateExportDto) => {
        return axiosInstance.post<DeviceExport>('/device-exports', data);
    },

    update: async (id: string, data: Partial<CreateExportDto>) => {
        return axiosInstance.patch<DeviceExport>(`/device-exports/${id}`, data);
    },

    getDetail: async (id: string) => {
        return axiosInstance.get<DeviceExport>(`/device-exports/${id}`);
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
    },

    getInventoryStatus: async (model: string) => {
        return axiosInstance.get<{ inStock: number; reserved: number; available: number }>('/device-exports/inventory-status', {
            params: { model }
        });
    }
};
