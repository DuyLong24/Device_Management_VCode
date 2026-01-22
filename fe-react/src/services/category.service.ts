import { axiosInstance } from '../configs/axios.config';

export interface Category {
    _id: string;
    name: string;
    description?: string;
}

export const categoryService = {
    getAll: async (params?: any) => {
        let requestParams = params || {};
        if (requestParams && requestParams.queryKey) {
            requestParams = {};
        }
        const { client, meta, signal, ...rest } = requestParams;

        const response = await axiosInstance.get<Category[]>('/categories', {
            params: rest
        });
        return response.data;
    }
};