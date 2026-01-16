import { axiosInstance } from '../configs/axios.config';

export interface PaginatedResponse<T> {
    results: T[];       // Danh sách bản ghi
    page: number;       // Trang hiện tại
    limit: number;      // Số lượng / page
    totalPages: number; // Tổng số trang
    totalResults: number; // Tổng số bản ghi
}

// 2. Type cho Device Entity
export interface Device {
    id: string;
    name: string;
    deviceModel: string;
    productCode?: string;
    serial: string;
    status?: string;
    qcStatus?: string;
    importDate?: string;
    warehouseId?: string;
    categoryId?: string;
    createdAt?: string;
    updatedAt?: string;
}

// 3. Type cho Query Params
export interface DeviceQueryParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    search?: string;      // Global search
    warehouseId?: string; // Filter exact
    categoryId?: string;
    createdFrom?: string; // Date range
    createdTo?: string;
}

export const deviceService = {
    getAll: async (params: DeviceQueryParams = {}) => {
        const finalParams = {
            page: 1,
            limit: 10,
            sortBy: 'createdAt:desc', // Mới nhất lên đầu
            ...params
        };

        const response = await axiosInstance.get<PaginatedResponse<Device>>('/devices', {
            params: finalParams
        });

        return response.data;
    },

    getById: async (id: string) => {
        const response = await axiosInstance.get<Device>(`/devices/${id}`);
        return response.data;
    },

    exportExcel: async (params: DeviceQueryParams = {}) => {
        const response = await axiosInstance.get('/devices/export', {
            params,
            responseType: 'blob',
        });
        return response.data;
    }
};