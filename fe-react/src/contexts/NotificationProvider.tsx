import React, { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { message as antMessage } from 'antd';

import { useAuth } from '../hooks/useAuth';
import { notificationService } from '../services/notification.service';
import type { Notification } from '../services/notification.service';
import { NotificationContext } from './NotificationContext';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, token } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const data = await notificationService.getAll();
            setNotifications(data);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        }
    }, [user]);

    useEffect(() => {
        if (!user || socketRef.current) return;

        const SOCKET_URL =
            import.meta.env.VITE_API_URL || 'http://localhost:3000';

        const socket = io(`${SOCKET_URL}/notifications`, {
            transports: ['websocket'],
            auth: { token }
        });

        socket.on('connect', () => {
            setIsConnected(true);
            socket.emit('joinRoom', user.id);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        socket.on('new_notification', (n: Notification) => {
            setNotifications(prev => [n, ...prev]);

            antMessage.info({
                content: `${n.title}: ${n.message}`,
                key: n._id,
                duration: 5,
            });
        });

        socketRef.current = socket;

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [user, token]);

    useEffect(() => {
        if (user) fetchNotifications();
    }, [user, fetchNotifications]);

    const markAsRead = async (id: string) => {
        await notificationService.markAsRead(id);
        setNotifications(prev =>
            prev.map(n => n._id === id ? { ...n, isRead: true } : n)
        );
    };

    const markAllRead = async () => {
        await notificationService.markAllRead();
        setNotifications(prev =>
            prev.map(n => ({ ...n, isRead: true }))
        );
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                markAsRead,
                markAllRead,
                isConnected
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};