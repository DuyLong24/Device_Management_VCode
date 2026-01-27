import { axiosInstance } from '../configs/axios.config';
import type { DeviceImport, CreateImportDto } from '../types/import.type';

export const importService = {
    getImports: async (_params: any) => {
        const response = await axiosInstance.get<DeviceImport[]>('/device-imports', {
            params: {
                sortBy: 'createdAt:desc',
                populate: 'createdBy',
                ..._params
            }
        });
        return {
            data: response.data,
            success: true,
            total: response.data.length,
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