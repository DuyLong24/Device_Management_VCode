import { axiosInstance } from "../configs/axios.config";

export interface SharedDataGroup {
    _id: string;
    code: string;
    name: string;
    description: string;
}

export interface SharedData {
    _id: string;
    code: string;
    name: string;
    description: string;
    groupId: string;
    order: number;
}

export const sharedDataService = {
    // GROUPS
    getGroups: async (): Promise<SharedDataGroup[]> => {
        const response = await axiosInstance.get('/shared-data/groups');
        return response.data;
    },

    createGroup: async (data: Omit<SharedDataGroup, '_id'>) => {
        const response = await axiosInstance.post<SharedDataGroup>('/shared-data/groups', data);
        return response.data;
    },

    updateGroup: async (id: string, data: Partial<SharedDataGroup>) => {
        const response = await axiosInstance.put<SharedDataGroup>(`/shared-data/groups/${id}`, data);
        return response.data;
    },

    deleteGroup: async (id: string) => {
        const response = await axiosInstance.delete(`/shared-data/groups/${id}`);
        return response.data;
    },

    // DATA
    getDataByGroupCode: async (groupCode: string): Promise<SharedData[]> => {
        const response = await axiosInstance.get('/shared-data/data', {
            params: { groupCode }
        });
        return response.data;
    },

    getDataByGroupId: async (groupId: string): Promise<SharedData[]> => {
        const response = await axiosInstance.get('/shared-data/data', {
            params: { groupId }
        });
        return response.data;
    },

    createData: async (data: Omit<SharedData, '_id'>): Promise<SharedData> => {
        const response = await axiosInstance.post('/shared-data/data', data);
        return response.data;
    },

    updateData: async (id: string, data: Partial<SharedData>) => {
        const response = await axiosInstance.put<SharedData>(`/shared-data/data/${id}`, data);
        return response.data;
    },

    deleteData: async (id: string) => {
        const response = await axiosInstance.delete(`/shared-data/data/${id}`);
        return response.data;
    }
};
