import { axiosInstance } from '../configs/axios.config';

export interface Category {
    _id: string;
    name: string;
    description?: string;
}

export const categoryService = {
    getAll: async () => {
        const response = await axiosInstance.get<Category[]>('/categories');
        return response.data;
    }
};