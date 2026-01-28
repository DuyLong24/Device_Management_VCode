import { axiosInstance } from '../configs/axios.config';

export interface UserDTO {
    id: string;
    email: string;
    fullName: string;     // Đã transform từ backend
    phone: string;        // Đã transform từ backend
    role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
    status: 'ACTIVE' | 'LOCKED' | 'PENDING';
    createdAt: string;
    lastLoginAt?: string;
    mustChangePassword?: boolean;
}

export interface UserFilters {
    keyword?: string;
    roleCode?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
}

export interface CreateUserData {
    email: string;
    name: string;          // Backend field name
    phoneNumber?: string;  // Backend field name
    roleCode: string;
    temporaryPassword: string;
    mustChangePassword?: boolean;
}

export interface UpdateUserData {
    name?: string;         // Backend field name
    phoneNumber?: string;  // Backend field name
    roleCode?: string;
}

export const userManagementService = {

    // Lấy danh sách users với filters và pagination
    getAll: async (filters: UserFilters = {}) => {
        const response = await axiosInstance.get<any>('/user-management', { params: filters });

        // Backend trả về pagination format
        const results = response.data?.results || [];

        return {
            data: results,
            success: true,
            total: response.data?.totalResults || results.length,
            page: response.data?.page || 1,
            totalPages: response.data?.totalPages || 1,
        };
    },

    // Tạo user mới
    create: async (data: CreateUserData) => {
        const response = await axiosInstance.post<UserDTO>('/user-management', data);
        return response.data;
    },

    // Update user
    update: async (id: string, data: UpdateUserData) => {
        const response = await axiosInstance.patch<UserDTO>(`/user-management/${id}`, data);
        return response.data;
    },

    // Lock user
    lock: async (id: string) => {
        const response = await axiosInstance.patch<UserDTO>(`/user-management/${id}/lock`);
        return response.data;
    },

    // Unlock user
    unlock: async (id: string) => {
        const response = await axiosInstance.patch<UserDTO>(`/user-management/${id}/unlock`);
        return response.data;
    },

    // Reset password
    resetPassword: async (id: string, newPassword: string, mustChange = true) => {
        const response = await axiosInstance.post(`/user-management/${id}/reset-password`, {
            newPassword,
            mustChange,
        });
        return response.data;
    },

    // Export Excel (TODO)
    exportExcel: async (filters: UserFilters = {}) => {
        // TODO: Implement Excel export
        console.log('Export with filters:', filters);
    },
};
