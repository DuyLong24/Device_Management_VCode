import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useParams } from 'react-router-dom';
import { deviceService } from '../services/device.service';
import { warehouseService } from '../services/warehouse.service';
import { warehouseTransitionService, type WarehouseTransition } from '../services/warehouse-transition.service';
import { sharedDataService } from '../services/shared-data.service';
import { useDebounce } from './useDebounce';

export const useWarehouseData = () => {
    const { code } = useParams();
    const queryClient = useQueryClient();
    const { message } = App.useApp();

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Filters
    const [searchText, setSearchText] = useState('');
    const debouncedSearch = useDebounce(searchText, 500);
    const [importCode, setImportCode] = useState('');
    const debouncedImportCode = useDebounce(importCode, 500);
    const [exportCode, setExportCode] = useState('');
    const debouncedExportCode = useDebounce(exportCode, 500);
    const [selectedDeviceModel, setSelectedDeviceModel] = useState<string | undefined>(undefined);

    // Selection
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [priorityItems, setPriorityItems] = useState<any[]>([]);

    // State for options
    const [modelOptions, setModelOptions] = useState<{ label: string, value: string, desc?: string }[]>([]);

    useEffect(() => {
        sharedDataService.getDataByGroupCode('MODEL').then(res => {
            if (res) {
                setModelOptions(res.map(m => ({ label: m.code, value: m.code, desc: m.name })));
            }
        });
    }, []);

    useEffect(() => {
        setPage(1);
        setSelectedRowKeys([]);
        setSearchText('');
        setImportCode('');
        setExportCode('');
        setPriorityItems([]);
    }, [code]);

    // 1. Get Warehouse Info
    const { data: warehouses } = useQuery({
        queryKey: ['warehouses'],
        queryFn: warehouseService.getAll,
        staleTime: 5 * 60 * 1000
    });

    const currentWarehouse = useMemo(() => warehouses?.find(w => w.code === code), [warehouses, code]);

    // 2. Get Devices
    const { data: deviceData, isLoading, refetch } = useQuery({
        queryKey: ['devices', code, page, pageSize, debouncedSearch, selectedDeviceModel, debouncedImportCode, debouncedExportCode],
        queryFn: () => {
            const params: any = {
                page,
                limit: pageSize,
                warehouseId: currentWarehouse?.id,
                sortBy: 'updatedAt:desc',
            };
            if (debouncedSearch) params.search = debouncedSearch;
            if (selectedDeviceModel) params.model = selectedDeviceModel;
            if (debouncedImportCode) params.importCode = debouncedImportCode;
            if (debouncedExportCode) params.exportCode = debouncedExportCode;

            return deviceService.getAll(params);
        },
        enabled: !!currentWarehouse?.id
    });

    // 3. Merge priority items (scanned devices)
    const dataSource = useMemo(() => {
        const raw = deviceData?.results || [];
        if (priorityItems.length === 0) return raw;

        const map = new Map();
        priorityItems.forEach(item => map.set(item.id, { ...item, _isPriority: true }));
        raw.forEach(item => {
            if (!map.has(item.id)) {
                map.set(item.id, item);
            }
        });
        return Array.from(map.values());
    }, [deviceData?.results, priorityItems]);

    // 4. Transitions
    const { data: transitions } = useQuery({
        queryKey: ['warehouse-transitions', currentWarehouse?.id],
        queryFn: () => warehouseTransitionService.getBySourceWarehouse(currentWarehouse!.id),
        enabled: !!currentWarehouse?.id
    });

    const transferOptions = useMemo(() => {
        if (!transitions || !warehouses) return [];

        const uniqueTargets = new Set();
        return transitions.map((t: WarehouseTransition) => {
            const target = warehouses.find(w => w.id === t.toWarehouseId);
            if (!target) return null;

            if (uniqueTargets.has(target.code)) return null;
            uniqueTargets.add(target.code);

            const quickConfig = currentWarehouse?.config?.quickTransfers?.find((qt: any) => qt.to === target.code);

            return {
                to: target.code,
                label: quickConfig?.label || `Chuyển sang ${target.name}`,
                description: quickConfig?.description || (t.requiresApproval ? '(Cần duyệt)' : undefined),
            };
        }).filter(Boolean) as any[];
    }, [transitions, warehouses]);

    // 5. Mutations
    const { mutate: transferDevices } = useMutation({
        mutationFn: deviceService.bulkTransfer,
        onSuccess: (data) => {
            message.success(`Đã chuyển thành công ${data.success.length} thiết bị.`);
            queryClient.invalidateQueries({ queryKey: ['devices'] });
            refetch();
            setSelectedRowKeys([]);
            setPriorityItems([]);
        },
        onError: () => message.error('Có lỗi xảy ra khi xử lý')
    });

    const handleTransferSubmit = (toWarehouse: string, note: string, errorReason?: string) => {
        const targetWh = warehouses?.find(w => w.code === toWarehouse);
        if (!targetWh) {
            message.error('Kho đích không hợp lệ');
            return;
        }
        transferDevices({
            deviceIds: selectedRowKeys as string[],
            toWarehouseId: targetWh.id,
            note,
            errorReason
        });
    };

    return {
        // State
        code,
        currentWarehouse,
        warehouses,
        dataSource,
        totalResults: deviceData?.totalResults || 0,
        isLoading,
        modelOptions,
        transferOptions,

        // Pagination
        page, setPage,
        pageSize, setPageSize,

        // Selection
        selectedRowKeys, setSelectedRowKeys,
        priorityItems, setPriorityItems,

        // Filters
        searchText, setSearchText,
        importCode, setImportCode,
        exportCode, setExportCode,
        selectedDeviceModel, setSelectedDeviceModel,

        // Actions
        refetch,
        handleTransferSubmit
    };
};
