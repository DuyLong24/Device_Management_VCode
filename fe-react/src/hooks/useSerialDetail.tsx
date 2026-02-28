import { useMemo } from 'react';
import dayjs from 'dayjs';
import { message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceService } from '../services/device.service';
import { warehouseService } from '../services/warehouse.service';

import {
    InboxOutlined,
    ExportOutlined,
    ToolOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    SwapOutlined,
    SyncOutlined
} from '@ant-design/icons';

const mapHistoryToTimeline = (device: any, rawHistory: any[]) => {
    const timeline: any[] = [];

    // 1. IMPORT Event
    if (device.importDate || device.importId) {
        timeline.push({
            date: device.importDate,
            type: 'IMPORT',
            description: 'Nhập kho',
            actor: device.importId?.createdBy?.name || device.importId?.importedBy || 'N/A',
            note: device.importId?.note,
        });
    }

    // 2. EXPORT Event
    if (device.currentExportId) {
        timeline.push({
            date: device.currentExportId.exportDate,
            type: 'EXPORT',
            description: 'Xuất kho',
            actor: device.currentExportId.createdBy?.name || 'N/A',
            exportSheetCode: device.currentExportId.code,
            note: device.currentExportId.note
        });
    }

    // 3. HISTORY Events
    rawHistory.forEach(h => {
        const item: any = {
            date: h.createdAt,
            actor: h.actorId?.name || (h.actorId === '000000000000000000000000' ? 'Hệ thống tự động' : 'Unknown'),
            note: h.note,
            rawAction: h.action,
            fromWarehouse: h.fromWarehouseId,
            toWarehouse: h.toWarehouseId,
        };

        if (h.action === 'IMPORT') {
            // Skip
        } else if (h.action.includes('EXPORT')) {
            if (!timeline.some(t => t.type === 'EXPORT')) {
                item.type = 'EXPORT';
                item.description = 'Xuất kho';
                timeline.push(item);
            }
        } else if (h.action.includes('WARRANTY_SEND')) {
            item.type = 'WARRANTY_SEND';
            item.description = 'Gửi bảo hành';
            timeline.push(item);
        } else if (h.action.includes('WARRANTY_RECEIVE')) {
            item.type = 'WARRANTY_RECEIVE';
            item.description = 'Nhận từ bảo hành';
            timeline.push(item);
        } else {
            // TRANSFER / QC
            item.type = 'TRANSFER';
            item.description = `Chuyển kho: ${h.fromWarehouseId?.name} -> ${h.toWarehouseId?.name}`;

            if (h.action === 'QC_PASS') item.qcResult = 'PASS';
            if (h.action === 'QC_FAIL') item.qcResult = 'FAIL';
            timeline.push(item);
        }
    });

    return timeline.sort((a, b) => {
        const timeA = a.date ? dayjs(a.date).valueOf() : Date.now();
        const timeB = b.date ? dayjs(b.date).valueOf() : Date.now();
        return timeA - timeB;
    });
};

export const getTimelineIcon = (event: any) => {
    if (event.type === 'IMPORT') return <InboxOutlined className="text-blue-500" />;
    if (event.type === 'EXPORT') return <ExportOutlined className="text-green-500" />;
    if (event.type === 'WARRANTY_SEND') return <ToolOutlined className="text-yellow-500" />;
    if (event.type === 'WARRANTY_RECEIVE') return <CheckCircleOutlined className="text-green-500" />;

    if (event.type === 'TRANSFER') {
        if (event.qcResult === 'PASS') return <CheckCircleOutlined className="text-green-500" />;
        if (event.qcResult === 'FAIL') return <CloseCircleOutlined className="text-red-500" />;
        return <SwapOutlined className="text-blue-500" />;
    }
    return <SyncOutlined className="text-blue-500" />;
};

export function useMacDetail(mac?: string) {
    const queryClient = useQueryClient();

    // 1. Fetch Device Detail
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['mac-detail', mac],
        queryFn: () => deviceService.getByMacWithDetail(mac || ''),
        enabled: !!mac
    });

    // 2. Fetch Warehouses 
    const { data: warehouses } = useQuery({
        queryKey: ['warehouses'],
        queryFn: warehouseService.getAll
    });

    const device = data?.device;
    const history = (data?.history || []);

    const timeline = useMemo(() =>
        device ? mapHistoryToTimeline(device, history) : [],
        [device, history]);

    const currentWarehouse = useMemo(() => {
        const found = warehouses?.find(w => w.id === device?.warehouseId?._id || w.id === device?.warehouseId);
        if (found) return found;

        if (device?.warehouseId && typeof device.warehouseId === 'object') {
            return device.warehouseId;
        }
        return null;
    }, [warehouses, device]);

    const availableTransitions = useMemo(() => {
        if (!currentWarehouse?.config?.quickTransfers) return [];
        return currentWarehouse.config.quickTransfers.map((qt: any) => {
            const targetWh = warehouses?.find(w => w.code === qt.to);
            return {
                ...qt,
                targetId: targetWh?.id,
                targetName: targetWh?.name
            };
        });
    }, [currentWarehouse, warehouses]);

    const { mutate: transferDevice, isPending: isTransferring } = useMutation({
        mutationFn: deviceService.bulkTransfer,
        onSuccess: () => {
            message.success('Chuyển kho thành công!');
            refetch(); // Refresh data
            queryClient.invalidateQueries({ queryKey: ['devices'] });
        },
        onError: (err: any) => message.error(err.response?.data?.message || 'Lỗi chuyển kho')
    });

    return {
        device,
        history,
        timeline,
        isLoading,
        refetch,

        currentWarehouse,
        availableTransitions,
        warehouses,

        transferDevice,
        isTransferring
    };
}
