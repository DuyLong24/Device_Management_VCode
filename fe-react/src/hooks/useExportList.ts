import { useState, useEffect, useMemo } from 'react';
import { Form, App } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { exportService } from '../services/export.service';
import type { DeviceExport } from '../types/export.type';
import { logger } from '../utils/logger';
import { EXPORT_STATUS } from '../constants/export-status.constant';
import { useListUrlState } from './useListUrlState';

export const useExportList = () => {
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const { message, modal } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<DeviceExport[]>([]);

    const { searchParams, urlState, updateUrlState, formInitialValues } = useListUrlState();

    // Seed form from URL on every searchParams change (catches Back/Forward)
    useEffect(() => {
        form.setFieldsValue({
            keyword: searchParams.get('keyword') ?? undefined,
            status: searchParams.get('status') ?? undefined,
            dateRange: (searchParams.get('dateStart') && searchParams.get('dateEnd'))
                ? [dayjs(searchParams.get('dateStart')), dayjs(searchParams.get('dateEnd'))]
                : undefined,
        });
    }, [searchParams]);

    // Load data
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await exportService.getAll({});
            if (res.success && Array.isArray(res.data)) {
                setData(res.data);
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

    // Filter derived from URL state (no separate state needed)
    const filteredData = useMemo(() => {
        let result = [...data];

        if (urlState.keyword) {
            const kw = urlState.keyword.toLowerCase();
            result = result.filter(item =>
                item.code?.toLowerCase().includes(kw) ||
                item.exportName?.toLowerCase().includes(kw) ||
                item.receiver?.toLowerCase().includes(kw) ||
                item.project?.toLowerCase().includes(kw) ||
                item.customer?.toLowerCase().includes(kw)
            );
        }

        if (urlState.dateStart && urlState.dateEnd) {
            result = result.filter(item => {
                if (!item.createdAt) return false;
                const itemDate = dayjs(item.createdAt);
                return (
                    (itemDate.isAfter(dayjs(urlState.dateStart).startOf('day')) || itemDate.isSame(dayjs(urlState.dateStart).startOf('day'))) &&
                    (itemDate.isBefore(dayjs(urlState.dateEnd).endOf('day')) || itemDate.isSame(dayjs(urlState.dateEnd).endOf('day')))
                );
            });
        }

        if (urlState.status) {
            result = result.filter(item => item.status === urlState.status);
        }

        return result;
    }, [data, urlState]);

    // Push form values to URL
    const handleFilter = () => {
        const v = form.getFieldsValue();
        const updates: Parameters<typeof updateUrlState>[0] = {
            keyword: v.keyword || undefined,
            status: v.status || undefined,
            page: 1,
        };
        if (v.dateRange && v.dateRange.length === 2) {
            updates.dateStart = v.dateRange[0].toISOString();
            updates.dateEnd = v.dateRange[1].toISOString();
        } else {
            updates.dateStart = undefined;
            updates.dateEnd = undefined;
        }
        updateUrlState(updates);
    };

    const handleReset = () => {
        form.resetFields();
        updateUrlState({ keyword: undefined, status: undefined, dateStart: undefined, dateEnd: undefined, page: 1, pageSize: 10 });
    };

    // Statistics
    const statistics = useMemo(() => ({
        total: data.length,
        pendingApproval: data.filter(e => e.status === EXPORT_STATUS.PENDING_APPROVAL).length,
        approved: data.filter(e => e.status === EXPORT_STATUS.APPROVED).length,
        inProgress: data.filter(e => e.status === EXPORT_STATUS.IN_PROGRESS).length,
        completed: data.filter(e => e.status === EXPORT_STATUS.COMPLETED).length,
    }), [data]);

    const handleCreate = () => navigate('/export/create');

    const handleViewDetail = (id: string, isDraft = false) => {
        if (isDraft) {
            navigate(`/export/edit/${id}`);
        } else {
            navigate(`/export/${id}`);
        }
    };

    const handleDelete = async (id: string) => {
        modal.confirm({
            title: 'Xóa phiếu xuất',
            content: 'Bạn có chắc chắn muốn xóa phiếu xuất này? Hành động này không thể hoàn tác.',
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await exportService.delete(id);
                    message.success('Đã xóa phiếu xuất');
                    fetchData();
                } catch (error) {
                    message.error('Không thể xóa phiếu xuất');
                }
            },
        });
    };

    const handleExportPDF = async (record: DeviceExport) => {
        if (!record || record.status !== EXPORT_STATUS.COMPLETED) {
            message.warning('Chỉ xuất PDF được cho phiếu đã hoàn tất');
            return;
        }
        try {
            const { exportExportTicketPDF } = await import('../utils/export-ticket-pdf');
            exportExportTicketPDF(record);
            message.success('Đã tải xuống file PDF');
        } catch (error) {
            console.error('Export PDF error:', error);
            message.error('Không thể xuất file PDF');
        }
    };

    return {
        data,
        filteredData,
        loading,
        form,
        formInitialValues,
        urlState,
        updateUrlState,
        statistics,
        fetchData,
        handleFilter,
        handleReset,
        handleCreate,
        handleViewDetail,
        handleDelete,
        handleExportPDF,
        navigate,
    };
};
