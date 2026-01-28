import { axiosInstance } from '../configs/axios.config';

export interface RoleDTO {
    id: string;
    code: string;
    name: string;
    permissions: string[];
    description?: string;
}

export const roleService = {

    // Lấy tất cả roles từ backend
    getAll: async () => {
        const response = await axiosInstance.get<any>('/fnc-roles');

        // Backend trả về pagination format { results, page, limit, totalPages, totalResults }
        let rolesData: RoleDTO[] = [];

        if (Array.isArray(response.data)) {
            // Trường hợp trả về array trực tiếp
            rolesData = response.data;
        } else if (response.data && response.data.results) {
            // Trường hợp pagination
            rolesData = response.data.results;
        }

        return {
            data: rolesData,
            success: true,
            total: rolesData.length,
        };
    },

    // Lấy role theo ID
    getById: async (id: string) => {
        const response = await axiosInstance.get<RoleDTO>(`/fnc-roles/${id}`);
        return response.data;
    },

    // Lấy danh sách permissions của role
    getPermissions: async (roleId: string) => {
        const role = await roleService.getById(roleId);
        return role.permissions || [];
    },
};
