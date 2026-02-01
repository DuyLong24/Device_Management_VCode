import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { message } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';

import { deviceService } from '../services/device.service';
import type { Device, PaginatedResponse } from '../services/device.service';

import { warehouseService } from '../services/warehouse.service';
import { categoryService } from '../services/category.service';
import type { Category } from '../services/category.service';


export interface SerialUI {
    key: string;
    mac: string;
    serial: string;
    deviceCode: string;
    deviceModel?: string; // Added
    deviceName: string;
    warehouseId: string;
    warehouseName: string;
    warehouseColor: string;
    importDate: string;
    status: string;
    createdAt?: string;
}

const STATUS_TO_WAREHOUSE_MAP: Record<string, string> = {
    'PENDING': 'PENDING_QC',
    'PASS': 'READY_TO_EXPORT',
    'FAIL': 'DEFECT',
    'WARRANTY': 'IN_WARRANTY',
};

export const useAllSerials = () => {
    // --- STATE QUẢN LÝ PARAMS ---
    const [pagination, setPagination] = useState({ page: 1, limit: 10 });
    const [searchText, setSearchText] = useState('');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

    // --- 1. DEVICES QUERY ---
    const {
        data: deviceResponse,
        isLoading: loadingDevices,
        isFetching,
    } = useQuery<PaginatedResponse<Device>>({
        queryKey: ['devices', pagination, searchText, selectedWarehouseId, selectedCategory, dateRange],
        queryFn: () => {
            const params: any = {
                page: pagination.page,
                limit: pagination.limit,
                search: searchText || undefined,
                categoryId: selectedCategory || undefined,
            };

            if (selectedWarehouseId) {
                params.warehouseId = selectedWarehouseId;
            }

            if (dateRange && dateRange[0] && dateRange[1]) {
                params.createdFrom = dateRange[0].startOf('day').toISOString();
                params.createdTo = dateRange[1].endOf('day').toISOString();
            }

            return deviceService.getAll(params);
        },
        placeholderData: keepPreviousData,
        staleTime: 0,
    });

    // --- 2. WAREHOUSES QUERY ---
    const { data: warehouses = [] } = useQuery({
        queryKey: ['warehouses'],
        queryFn: () => warehouseService.getAll(),
        staleTime: 1000 * 60 * 5,
    });

    // --- 3. CATEGORIES QUERY ---
    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: () => categoryService.getAll(),
        staleTime: 1000 * 60 * 30,
    });

    const getWarehouseColor = (status: string) => {
        const colors: Record<string, string> = {
            'PENDING_QC': 'default', 'READY_TO_EXPORT': 'success', 'DEFECT': 'red', 'IN_WARRANTY': 'orange', 'SOLD': 'blue',
        };
        return colors[status] || 'default';
    };

    // --- TRANSFORM DATA ---
    const devicesList = deviceResponse?.results || [];
    const totalResults = deviceResponse?.totalResults || 0;

    const allSerials: SerialUI[] = devicesList.map((d: Device) => {
        let rawWhId = d.warehouseId;
        if (typeof rawWhId === 'object' && rawWhId !== null) rawWhId = (rawWhId as any).id || (rawWhId as any)._id;
        const rawWhIdString = String(rawWhId);

        let wh = warehouses.find((w: any) =>
            String(w.id) === rawWhIdString || String(w._id) === rawWhIdString || String(w.code) === rawWhIdString
        );

        if (!wh && d.qcStatus) {
            const targetCode = STATUS_TO_WAREHOUSE_MAP[d.qcStatus];
            if (targetCode) wh = warehouses.find((w: any) => w.code === targetCode);
        }

        const safeStatus = d.status || d.qcStatus || 'UNKNOWN';

        return {
            key: d.id,
            mac: d.mac || 'N/A',
            serial: d.serial,
            deviceCode: d.deviceModel || 'N/A',
            deviceModel: d.deviceModel || 'N/A',
            deviceName: d.name,
            warehouseId: rawWhIdString,
            warehouseName: wh ? wh.name : safeStatus,
            warehouseColor: wh ? wh.color : getWarehouseColor(safeStatus),
            importDate: d.importDate || '',
            createdAt: d.createdAt,
            status: safeStatus
        };
    });

    // --- HANDLERS ---
    const handleTableChange = (newPagination: TablePaginationConfig) => {
        setPagination({
            page: newPagination.current || 1,
            limit: newPagination.pageSize || 10
        });
    };

    const handleSearch = (val: string) => {
        setSearchText(val);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleFilterWarehouse = (val: string | null) => {
        setSelectedWarehouseId(val);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleFilterCategory = (val: string | null) => {
        setSelectedCategory(val);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleReset = () => {
        setSearchText('');
        setSelectedWarehouseId(null);
        setSelectedCategory(null);
        setDateRange(null);
        setPagination({ page: 1, limit: 10 });
    };

    const handleExport = async () => {
        try {
            message.loading({ content: 'Đang xuất file...', key: 'exporting' });

            // Lấy params filter hiện tại
            const params: any = {
                search: searchText || undefined,
            };
            if (selectedWarehouseId) params.warehouseId = selectedWarehouseId;
            if (dateRange && dateRange[0] && dateRange[1]) {
                params.createdFrom = dateRange[0].startOf('day').toISOString();
                params.createdTo = dateRange[1].endOf('day').toISOString();
            }

            const blob = await deviceService.exportExcel(params);

            // Trigger download
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Danh_sach_thiet_bi_${dayjs().format('DD-MM-YYYY')}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);

            message.success({ content: 'Xuất file thành công!', key: 'exporting' });
        } catch (error) {
            console.error(error);
            message.error({ content: 'Lỗi xuất file', key: 'exporting' });
        }
    };

    // --- 4. Thống kê ---
    const { data: statsData } = useQuery({
        queryKey: ['device-stats', searchText, selectedWarehouseId, selectedCategory, dateRange],
        queryFn: () => {
            const params: any = {
                search: searchText || undefined,
                categoryId: selectedCategory || undefined,
            };

            if (selectedWarehouseId) {
                params.warehouseId = selectedWarehouseId;
            }

            if (dateRange && dateRange[0] && dateRange[1]) {
                params.createdFrom = dateRange[0].startOf('day').toISOString();
                params.createdTo = dateRange[1].endOf('day').toISOString();
            }
            return deviceService.getStatistics(params);
        },
        staleTime: 1000 * 60 * 2 // 2 mins
    });

    const stats = statsData || {
        total: totalResults,
        PENDING_QC: 0, READY_TO_EXPORT: 0, DEFECT: 0, IN_WARRANTY: 0, SOLD: 0, REMOVED: 0,
    };

    return {
        loading: loadingDevices || isFetching,
        dataSource: allSerials,

        paginationConfig: {
            current: pagination.page,
            pageSize: pagination.limit,
            total: totalResults,
            showSizeChanger: true,
            showTotal: (total: number) => `Tổng ${total} thiết bị`,
            pageSizeOptions: ['10', '20', '50', '100'],
        },

        stats,
        warehouseOptions: warehouses.map((w: any) => ({ label: w.name, value: w.id })),

        rawCategories: categories, // Debug
        categoryOptions: categories.map((c: any) => {
            const idVal = c.id || c._id;
            return {
                label: c.name,
                value: idVal ? String(idVal) : `MISSING_ID_${Math.random()}`
            };
        }),

        selectedCategory,
        setSelectedCategory: handleFilterCategory,

        searchText, setSearchText: handleSearch,
        selectedWarehouseId, setSelectedWarehouseId: handleFilterWarehouse,
        dateRange, setDateRange,

        handleTableChange,
        handleReset,
        handleExport
    };
};