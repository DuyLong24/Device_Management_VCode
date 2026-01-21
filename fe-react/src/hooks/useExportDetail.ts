import { useState, useEffect } from 'react';
import { App } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';

import { exportService } from '../services/export.service';
import type { DeviceExport } from '../types/export.type';
import { logger } from '../utils/logger';

export const useExportDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { message, modal } = App.useApp();
    const [exportInfo, setExportInfo] = useState<DeviceExport | null>(null);
    const [loading, setLoading] = useState(false);

    // Load data
    useEffect(() => {
        if (id) fetchDetail();
    }, [id]);

    const fetchDetail = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await exportService.getDetail(id);
            setExportInfo(res.data);
        } catch (error) {
            logger.error('Không tải được thông tin phiếu xuất', {
                error,
                module: 'useExportDetail',
                action: 'fetchDetail',
                exportId: id,
            });
            message.error('Không tải được thông tin phiếu xuất');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!id) return;
        try {
            await exportService.submitForApproval(id);
            message.success('Đã gửi duyệt phiếu xuất!');
            fetchDetail();
        } catch (error) {
            logger.error('Lỗi khi gửi duyệt', {
                error,
                module: 'useExportDetail',
                action: 'handleSubmit',
                exportId: id,
            });
            message.error('Lỗi khi gửi duyệt');
        }
    };

    const handleApprove = async () => {
        if (!id) return;
        try {
            await exportService.approve(id);
            message.success('Đã duyệt phiếu!');
            fetchDetail();
        } catch (error) {
            logger.error('Lỗi khi duyệt', {
                error,
                module: 'useExportDetail',
                action: 'handleApprove',
                exportId: id,
            });
            message.error('Lỗi khi duyệt');
        }
    };

    const handleReject = async () => {
        if (!id) return;
        const reason = prompt('Nhập lý do từ chối:');
        if (reason === null) return;

        try {
            await exportService.reject(id, reason || '');
            message.success('Đã từ chối phiếu!');
            fetchDetail();
        } catch (error) {
            logger.error('Lỗi khi từ chối', {
                error,
                module: 'useExportDetail',
                action: 'handleReject',
                exportId: id,
            });
            message.error('Lỗi khi từ chối');
        }
    };

    const handleNavigateToScan = (sessionId?: string) => {
        if (sessionId) {
            navigate(`/export/${id}/check?sessionId=${sessionId}`);
        } else {
            navigate(`/export/${id}/check`);
        }
    };

    const handleConfirm = async () => {
        if (!id) return;
        try {
            await exportService.confirm(id);
            message.success('Đã hoàn tất phiếu xuất kho!');
            fetchDetail();
        } catch (error: any) {
            logger.error('Lỗi khi hoàn tất phiếu', {
                error,
                module: 'useExportDetail',
                action: 'handleConfirm',
                exportId: id,
            });
            message.error(error?.response?.data?.message || 'Lỗi khi hoàn tất phiếu');
        }
    };

    const handleEdit = () => {
        if (id) {
            navigate(`/export/edit/${id}`);
        }
    };

    const handleDelete = () => {
        if (!id) return;
        modal.confirm({
            title: 'Xóa phiếu xuất',
            content: 'Bạn có chắc chắn muốn xóa phiếu xuất này? Hành động này không thể hoàn tác.',
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await exportService.delete(id);
                    message.success('Đã xóa phiếu xuất thành công');
                    navigate('/export/list');
                } catch (error) {
                    message.error('Xóa phiếu xuất thất bại');
                    logger.error('Failed to delete export', { error, id });
                }
            },
        });
    };

    const handleBackToList = () => {
        navigate('/export/list');
    };

    return {
        // State
        exportInfo,
        loading,
        id,

        // Actions
        fetchDetail,
        handleSubmit,
        handleApprove,
        handleReject,
        handleConfirm,
        handleNavigateToScan,
        handleBackToList,
        handleEdit,   // Added
        handleDelete, // Added

        // Navigation
        navigate,
    };
};
