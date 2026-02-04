import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { notificationService } from '../services/notification.service';
import type { Notification } from '../services/notification.service';
import { message as antMessage } from 'antd';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, token } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    // Fetch initial notifications
    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const data = await notificationService.getAll();
            setNotifications(data);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    }, [user]);

    // Initialize Socket
    useEffect(() => {
        if (!user || socketRef.current) return;

        // URL backend (adjust port if needed, assuming 3000 based on typical NestJS setup)
        // Hardcoded for now, ideal to get from env
        const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

        const socket = io(`${SOCKET_URL}/notifications`, {
            transports: ['websocket'],
            auth: {
                token: token // Send token if needed for future Guard
            }
        });

        socket.on('connect', () => {
            setIsConnected(true);

            // Join room by userId
            if (user.id) {
                socket.emit('joinRoom', user.id);
            }
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        socket.on('new_notification', (newNotification: Notification) => {
            setNotifications(prev => [newNotification, ...prev]);

            // Show toast
            antMessage.info({
                content: newNotification.title + ': ' + newNotification.message,
                key: newNotification._id, // Debounce duplicate keys
                duration: 5,
            });
        });

        socketRef.current = socket;

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [user, token]);

    // Load initial data
    useEffect(() => {
        if (user) {
            fetchNotifications();
        }
    }, [user, fetchNotifications]);

    const markAsRead = async (id: string) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const markAllRead = async () => {
        if (!user) return;
        try {
            await notificationService.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Failed to mark all read', error);
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllRead, isConnected }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
