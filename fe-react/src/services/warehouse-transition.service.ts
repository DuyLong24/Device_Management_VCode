import { axiosInstance } from '../configs/axios.config';

export interface WarehouseTransition {
    id: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    transitionType: string;
    allowedRoles: string[];
    requiresApproval: boolean;
    requiresNote: boolean;
    isActive: boolean;
}

export const warehouseTransitionService = {
    getAll: async (params?: any) => {
        const response = await axiosInstance.get('/warehouse-transitions', { params });
        return response.data;
    },

    getBySourceWarehouse: async (warehouseId: string): Promise<WarehouseTransition[]> => {
        const response = await axiosInstance.get('/warehouse-transitions', {
            params: {
                fromWarehouseId: warehouseId,
                isActive: true, // Only active rules
                limit: 100 // Ensure we get all relevant transitions
            }
        });
        // Handle paginated or flat response
        return response.data.results || response.data;
    }
};
