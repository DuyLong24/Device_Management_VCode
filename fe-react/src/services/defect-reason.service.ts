import { axiosInstance } from '../configs/axios.config';

export interface DefectReason {
    id: string;
    code: string;
    name: string;
    description?: string;
    isActive: boolean;
}

export const defectReasonService = {
    getAll: async () => {
        const response = await axiosInstance.get<{ results: DefectReason[] }>('/defect-reasons');
        return response.data;
    }
};
