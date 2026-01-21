import { axiosInstance } from '../configs/axios.config';
import type { DeviceImport, CreateImportDto } from '../types/import.type';

export const importService = {
    getImports: async (_params: any) => {
        const response = await axiosInstance.get<DeviceImport[]>('/device-imports', {
            params: {
                sortBy: 'createdAt:desc',
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
        return axiosInstance.get<DeviceImport>(`/device-imports/${id}`);
    },

    completeImport: async (id: string) => {
        return axiosInstance.post(`/device-imports/${id}/complete`);
    }
};