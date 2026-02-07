import { useState, useEffect, useCallback } from 'react';
import { App } from 'antd';
import { axiosInstance } from '../configs/axios.config';
import { logger } from '../utils/logger';

export const ExportSessionStatus = {
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
} as const;

export type ExportSessionStatus = typeof ExportSessionStatus[keyof typeof ExportSessionStatus];

export interface ExportSession {
    id: string;
    sessionCode: string;
    sessionName: string;
    status: ExportSessionStatus;
    totalScanned: number;
    createdAt: string;
}

export const useExportSession = (exportId?: string) => {
    const [sessions, setSessions] = useState<ExportSession[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);

    const fetchSessions = useCallback(async () => {
        if (!exportId) return;
        setLoadingSessions(true);
        try {
            const res = await axiosInstance.get(`/device-exports/${exportId}/sessions`);
            setSessions(res.data);
        } catch (error) {
            logger.error('Failed to fetch sessions', { error });
            message.error('Không thể tải danh sách phiên xuất kho');
        } finally {
            setLoadingSessions(false);
        }
    }, [exportId]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const { message } = App.useApp();

    const createSession = async (name?: string) => {
        if (!exportId) {
            console.error('createSession: exportId is missing');
            return;
        }
        console.log('createSession: Sending request', { exportId, sessionName: name });
        try {
            await axiosInstance.post('/device-exports/sessions', {
                exportId,
                sessionName: name
            });
            message.success('Tạo phiên xuất kho thành công');
            fetchSessions();
        } catch (error) {
            logger.error('Failed to create session', { error });
            message.error('Không thể tạo phiên xuất kho');
        }
    };

    return {
        sessions,
        loadingSessions,
        createSession,
        refreshSessions: fetchSessions
    };
};
