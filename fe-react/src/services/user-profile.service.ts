import { axiosInstance } from '../configs/axios.config';

export interface UserProfile {
    id: string;
    username: string;
    email: string;
    name: string;
    phoneNumber?: string | null;
    dateOfBirth?: string | null;
    roles: string[];
    permissions: string[];
    createdAt: Date;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

export const userService = {
    getMyProfile: async (): Promise<UserProfile> => {
        const response = await axiosInstance.get<UserProfile>('/users/me');
        return response.data;
    },

    changePassword: async (data: ChangePasswordRequest): Promise<{ message: string }> => {
        const response = await axiosInstance.post<{ message: string }>('/users/me/change-password', data);
        return response.data;
    },

    updateMyProfile: async (data: Partial<UserProfile>): Promise<UserProfile> => {
        const response = await axiosInstance.patch<UserProfile>('/users/me', data);
        return response.data;
    },
};
