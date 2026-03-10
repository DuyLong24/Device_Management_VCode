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

const mapHistoryToTimeline = (rawHistory: any[]) => {
    const timeline: any[] = [];

    // Duyệt duy nhất mảng rawHistory (Single Source of Truth)
    (rawHistory || []).forEach(h => {
        const item: any = {
            date: h.createdAt,
            actor: h.actorId?.name || (!h.actorId || h.actorId === '000000000000000000000000' ? 'Hệ thống tự động' : 'Unknown'),
            note: h.note,
            rawAction: h.action,
            fromWarehouse: h.fromWarehouseId,
            toWarehouse: h.toWarehouseId,
        };

        if (h.action === 'IMPORT') {
            item.type = 'IMPORT';
            item.description = 'Nhập kho';
            timeline.push(item);
        } else if (h.action === 'WARRANTY_ACTIVATE') {
            item.type = 'WARRANTY_ACTIVATE';
            item.description = 'Kích hoạt bảo hành';
            timeline.push(item);
        } else if (h.action === 'EXPORT_PENDING') {
            item.type = 'EXPORT_PENDING';
            item.description = 'Xuất kho (Chưa kích hoạt)';
            timeline.push(item);
        } else if (h.action === 'EXPORT_WARRANTY') {
            item.type = 'EXPORT_WARRANTY';
            item.description = 'Xuất kho - Bảo hành';
            timeline.push(item);
        } else if (h.action === 'EXPORT' || h.action.startsWith('EXPORT')) {
            item.type = 'EXPORT';
            item.description = 'Xuất kho';
            timeline.push(item);
        } else if (h.action.includes('WARRANTY_SEND')) {
            item.type = 'WARRANTY_SEND';
            item.description = 'Gửui bảo hành';
            timeline.push(item);
        } else if (h.action.includes('WARRANTY_RECEIVE')) {
            item.type = 'WARRANTY_RECEIVE';
            item.description = 'Nhận từ bảo hành';
            timeline.push(item);
        } else {
            // TRANSFER / QC / WARRANTY_SWAP
            item.type = 'TRANSFER';
            item.description = `Chuyển kho: ${h.fromWarehouseId?.name || '---'} → ${h.toWarehouseId?.name || '---'}`;

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
    if (event.type === 'WARRANTY_ACTIVATE') return <CheckCircleOutlined className="text-emerald-600" />;
    if (event.type === 'EXPORT_PENDING') return <ExportOutlined className="text-orange-400" />;
    if (event.type === 'EXPORT_WARRANTY') return <ToolOutlined className="text-purple-500" />;
    if (event.type === 'WARRANTY_SEND') return <ToolOutlined className="text-yellow-500" />;
    if (event.type === 'WARRANTY_RECEIVE') return <CheckCircleOutlined className="text-green-500" />;

    if (event.type === 'TRANSFER') {
        if (event.qcResult === 'PASS') return <CheckCircleOutlined className="text-green-500" />;
        if (event.qcResult === 'FAIL') return <CloseCircleOutlined className="text-red-500" />;
        return <SwapOutlined className="text-blue-500" />;
    }
    return <SyncOutlined className="text-blue-500" />;
};

export function useIdenDetail(iden?: string) {
    const queryClient = useQueryClient();

    // 1. Fetch Device Detail
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['iden-detail', iden],
        queryFn: () => deviceService.getByIdenWithDetail(iden || ''),
        enabled: !!iden
    });

    // 2. Fetch Warehouses 
    const { data: warehouses } = useQuery({
        queryKey: ['warehouses'],
        queryFn: warehouseService.getAll
    });

    const device = data?.device;
    const history = (data?.history || []);

    const timeline = useMemo(() =>
        device ? mapHistoryToTimeline(history) : [],
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
