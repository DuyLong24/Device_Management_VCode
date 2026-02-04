import { createContext } from 'react';
import type { Notification } from '../services/notification.service';

export interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    isConnected: boolean;
}

export const NotificationContext =
    createContext<NotificationContextType | null>(null);
