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
        } catch (error: any) {
            logger.error('Lỗi khi gửi duyệt', {
                error,
                module: 'useExportDetail',
                action: 'handleSubmit',
                exportId: id,
            });
            message.error(error?.response?.data?.message || 'Lỗi khi gửi duyệt');
        }
    };

    const handleApprove = async () => {
        if (!id) return;
        try {
            await exportService.approve(id);
            message.success('Đã duyệt phiếu!');
            fetchDetail();
            navigate(`/export/list`);
        } catch (error: any) {
            logger.error('Lỗi khi duyệt', {
                error,
                module: 'useExportDetail',
                action: 'handleApprove',
                exportId: id,
            });
            message.error(error?.response?.data?.message || 'Lỗi khi duyệt');
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
        } catch (error: any) {
            logger.error('Lỗi khi từ chối', {
                error,
                module: 'useExportDetail',
                action: 'handleReject',
                exportId: id,
            });
            message.error(error?.response?.data?.message || 'Lỗi khi từ chối');
        }
    };

    const handleNavigateToScan = (sessionId?: string) => {
        if (sessionId) {
            navigate(`/export/${id}/check?sessionId=${sessionId}`);
        } else {
            navigate(`/export/${id}/check`);
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

    const handleExportClick = async () => {
        if (!id || !exportInfo) return;
        try {
            message.loading({ content: 'Đang tạo file Excel...', key: 'export_excel' });
            const blob = await exportService.exportExcel(id);

            // Tạo link tải file
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Phieu_Xuat_${exportInfo.code}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);

            message.success({ content: 'Xuất file thành công', key: 'export_excel' });
        } catch (error) {
            console.error(error);
            message.error({ content: 'Lỗi khi xuất file', key: 'export_excel' });
        }
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

        handleNavigateToScan,
        handleBackToList,
        handleEdit,
        handleDelete,
        handleExportClick,

        // Navigation
        navigate,
    };
};
