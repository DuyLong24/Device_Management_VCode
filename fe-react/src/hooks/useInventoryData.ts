import { useState, useEffect } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import { importService } from '../services/import.service';
import { sharedDataService } from '../services/shared-data.service';
import { inventorySessionService } from '../services/inventory-session.service';
import type { InventorySession, ScannedItem } from '../services/inventory-session.service';
import type { DeviceImport } from '../types/import.type';

export const useInventoryData = (importId?: string, sessionIdParam?: string) => {
    const [loading, setLoading] = useState(true);
    const [importInfo, setImportInfo] = useState<DeviceImport | null>(null);
    const [session, setSession] = useState<InventorySession | null>(null);
    const [serverItems, setServerItems] = useState<ScannedItem[]>([]);
    const [sessionStatus, setSessionStatus] = useState<'init' | 'in-progress' | 'completed'>('init');
    const [otherCompletedCount, setOtherCompletedCount] = useState(0);
    const [otherCompletedItemsByModel, setOtherCompletedItemsByModel] = useState<Record<string, number>>({});
    const [deviceModels, setDeviceModels] = useState<any[]>([]);
    const [selectedDeviceCode, setSelectedDeviceCode] = useState<string | null>(null);
    const [initialSessionName, setInitialSessionName] = useState<string>('');

    useEffect(() => {
        if (importId) loadData(importId);
    }, [importId, sessionIdParam]);

    const loadData = async (id: string) => {
        setLoading(true);
        try {
            const [importRes, models] = await Promise.all([
                importService.getImportDetail(id),
                sharedDataService.getDataByGroupCode('MODEL').catch(() => [])
            ]);
            setImportInfo(importRes.data);
            setDeviceModels(models);

            if (importRes.data.devices?.length === 1) {
                setSelectedDeviceCode(importRes.data.devices[0].deviceCode);
            }

            const sessions = await inventorySessionService.getByImportId(id);
            let activeSession: InventorySession | undefined;

            if (sessionIdParam) {
                activeSession = sessions.find(s => s.id === sessionIdParam);
            } else {
                activeSession = sessions.find(s => s.status === 'processing');
            }

            // Tính toán số lượng đã kiểm ở các phiên khác
            const completedSessions = sessions.filter(s => s.status === 'completed' && s.id !== activeSession?.id);
            const othersCount = completedSessions.reduce((acc, s) => acc + (s.totalScanned || 0), 0);
            setOtherCompletedCount(othersCount);

            const itemsByModel: Record<string, number> = {};
            completedSessions.forEach(session => {
                (session.details || []).forEach((item: any) => {
                    const deviceCode = item.deviceCode || item.deviceModel;
                    if (deviceCode) {
                        itemsByModel[deviceCode] = (itemsByModel[deviceCode] || 0) + 1;
                    }
                });
            });
            setOtherCompletedItemsByModel(itemsByModel);

            if (activeSession) {
                setSession(activeSession);
                const sortedDetails = (activeSession.details || []).sort((a: any, b: any) => {
                    return new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime();
                });

                setServerItems(sortedDetails);
                setSessionStatus(activeSession.status === 'completed' ? 'completed' : 'in-progress');
            } else {
                setSessionStatus('init');
                if (!sessionIdParam) {
                    setInitialSessionName(`Kiểm kê lần 1 (${dayjs().format('DD/MM/YYYY')})`);
                }
            }
        } catch (e) {
            message.error('Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        importInfo,
        session,
        setSession,
        serverItems,
        setServerItems,
        sessionStatus,
        setSessionStatus,
        otherCompletedCount,
        otherCompletedItemsByModel,
        deviceModels,
        selectedDeviceCode,
        setSelectedDeviceCode,
        initialSessionName
    };
};
