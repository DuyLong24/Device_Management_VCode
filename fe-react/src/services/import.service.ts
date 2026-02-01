import { axiosInstance } from '../configs/axios.config';
import type { DeviceImport, CreateImportDto } from '../types/import.type';

export const importService = {
    getImports: async (_params: any) => {
        const response = await axiosInstance.get<DeviceImport[]>('/device-imports', {
            params: {
                sortBy: 'updatedAt:desc',
                populate: 'createdBy',
                ..._params
            }
        });
        const rawData: any = response.data;
        const items = Array.isArray(rawData) ? rawData : (rawData.results || []);
        const total = Array.isArray(rawData) ? rawData.length : (rawData.totalResults || items.length);

        return {
            data: items,
            success: true,
            total,
        };
    },

    createImport: async (data: CreateImportDto) => {
        return axiosInstance.post('/device-imports', data);
    },

    getImportDetail: async (id: string) => {
        return axiosInstance.get<DeviceImport>(`/device-imports/${id}?populate=createdBy`);
    },

    completeImport: async (id: string) => {
        return axiosInstance.post(`/device-imports/${id}/complete`);
    },

    updateImport: async (id: string, data: Partial<CreateImportDto>) => {
        return axiosInstance.patch<DeviceImport>(`/device-imports/${id}`, data);
    },

    deleteImport: async (id: string) => {
        return axiosInstance.delete(`/device-imports/${id}`);
    }
};