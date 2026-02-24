import { axiosInstance } from '../configs/axios.config';

export interface User {
    id: string;
    username: string;
    name: string;
    email: string;
}

export const userService = {
    getAll: async () => {
        const response = await axiosInstance.get<User[]>('/users');
        return response.data;
    }
};