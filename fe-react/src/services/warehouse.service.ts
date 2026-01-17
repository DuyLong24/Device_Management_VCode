import { axiosInstance } from '../configs/axios.config';
import type { Warehouse } from '../types/warehouse.type';

export const warehouseService = {
    getAll: async (params?: any): Promise<Warehouse[]> => {
        try {
            const response = await axiosInstance.get<Warehouse[]>('/warehouses', {
                params: {
                    sortBy: 'orderIndex:asc',
                    populate: 'groupId',
                    ...params
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error fetching warehouses:', error);
            throw error;
        }
    },

    getById: async (id: string): Promise<Warehouse> => {
        const response = await axiosInstance.get<Warehouse>(`/warehouses/${id}`);
        return response.data;
    },

    getAllGroups: async (): Promise<any[]> => {
        const response = await axiosInstance.get('/warehouse-groups');
        return response.data;
    }
};