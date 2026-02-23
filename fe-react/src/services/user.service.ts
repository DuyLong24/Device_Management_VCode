import { axiosInstance } from '../configs/axios.config';

import type { User } from '../types/user.type';

export const userService = {
    getAll: async () => {
        const response = await axiosInstance.get<User[]>('/users');
        return response.data;
    },
    getMyPermissions: async () => {
        const response = await axiosInstance.get<{ permissions: string[] }>('/users/permissions/me');
        return response.data;
    }
};