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
    getGroups: async (): Promise<SharedDataGroup[]> => {
        const response = await axiosInstance.get('/shared-data/groups');
        return response.data;
    },

    getDataByGroupCode: async (groupCode: string): Promise<SharedData[]> => {
        const response = await axiosInstance.get('/shared-data/data', {
            params: { groupCode }
        });
        return response.data;
    },

    createData: async (data: Partial<SharedData>): Promise<SharedData> => {
        const response = await axiosInstance.post('/shared-data/data', data);
        return response.data;
    }
};
