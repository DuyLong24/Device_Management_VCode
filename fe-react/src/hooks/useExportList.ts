import { useState, useEffect, useMemo } from 'react';
import { Form, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { exportService } from '../services/export.service';
import type { DeviceExport } from '../types/export.type';
import { logger } from '../utils/logger';
import { EXPORT_STATUS } from '../constants/export-status.constant';

export const useExportList = () => {
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<DeviceExport[]>([]);
    const [filteredData, setFilteredData] = useState<DeviceExport[]>([]);

    // Load data
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await exportService.getAll({});
            if (res.success && Array.isArray(res.data)) {
                const exports: DeviceExport[] = res.data;
                setData(exports);
                setFilteredData(exports);
            }
        } catch (error) {
            logger.error('Không thể tải danh sách phiếu xuất', {
                error,
                module: 'useExportList',
                action: 'fetchData',
            });
            message.error('Không thể tải danh sách phiếu xuất');
        } finally {
            setLoading(false);
        }
    };

    // Tìm kiếm
    const handleFilter = () => {
        const formValues = form.getFieldsValue();
        let filtered = [...data];

        // Tìm kiếm theo từ khóa
        if (formValues.keyword) {
            const keyword = formValues.keyword.toLowerCase();
            filtered = filtered.filter(
                (item) =>
                    item.code?.toLowerCase().includes(keyword) ||
                    item.exportName?.toLowerCase().includes(keyword) ||
                    item.receiver?.toLowerCase().includes(keyword) ||
                    item.project?.toLowerCase().includes(keyword) ||
                    item.customer?.toLowerCase().includes(keyword)
            );
        }

        // Lọc theo khoảng thời gian
        if (formValues.dateRange && formValues.dateRange.length === 2) {
            const [start, end] = formValues.dateRange;
            filtered = filtered.filter((item) => {
                if (!item.createdAt) return false;
                const itemDate = dayjs(item.createdAt);
                const startOfDay = start.startOf('day');
                const endOfDay = end.endOf('day');
                return (
                    (itemDate.isAfter(startOfDay) || itemDate.isSame(startOfDay)) &&
                    (itemDate.isBefore(endOfDay) || itemDate.isSame(endOfDay))
                );
            });
        }

        // Lọc theo trạng thái
        if (formValues.status) {
            filtered = filtered.filter((item) => item.status === formValues.status);
        }

        setFilteredData(filtered);
    };

    // Reset bộ lọc
    const handleReset = () => {
        form.resetFields();
        setFilteredData(data);
    };

    // Tính toán số liệu
    const statistics = useMemo(() => {
        return {
            total: data.length,
            pendingApproval: data.filter((e) => e.status === EXPORT_STATUS.PENDING_APPROVAL).length,
            approved: data.filter((e) => e.status === EXPORT_STATUS.APPROVED).length,
            inProgress: data.filter((e) => e.status === EXPORT_STATUS.IN_PROGRESS).length,
            completed: data.filter((e) => e.status === EXPORT_STATUS.COMPLETED).length,
        };
    }, [data]);

    // Tạo mới
    const handleCreate = () => {
        navigate('/export/create');
    };

    // Trang chi tiết
    const handleViewDetail = (id: string) => {
        navigate(`/export/${id}`);
    };

    // xuất Excel
    const handleExportExcel = (record: DeviceExport) => {
        if (record.status !== EXPORT_STATUS.COMPLETED) {
            message.warning('Chỉ export Excel được cho phiếu đã hoàn tất');
            return;
        }
        message.info('Chức năng export Excel đang phát triển...');
    };

    return {
        // State
        data,
        filteredData,
        loading,
        form,
        statistics,

        // Actions
        fetchData,
        handleFilter,
        handleReset,
        handleCreate,
        handleViewDetail,
        handleExportExcel,

        // Navigation
        navigate,
    };
};
