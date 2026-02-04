import { axiosInstance } from '../configs/axios.config';

export interface Notification {
    _id: string;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    isRead: boolean;
    createdAt: string;
    metadata?: any;
}

export const notificationService = {
    getAll: async (): Promise<Notification[]> => {
        const response = await axiosInstance.get('/notifications');
        return response.data;
    },

    markAsRead: async (id: string): Promise<Notification> => {
        const response = await axiosInstance.put(`/notifications/${id}/read`);
        return response.data;
    },

    markAllRead: async (): Promise<void> => {
        await axiosInstance.put('/notifications/read-all');
    }
};
