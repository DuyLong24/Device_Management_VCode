import { useParams, useNavigate } from 'react-router-dom';
import { App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { importService } from '../services/import.service';
import { inventorySessionService } from '../services/inventory-session.service';
import type { ImportDeviceUI } from '../pages/Import/components/ImportDeviceTable';
import { exportImportPDF } from '../utils/export-import-pdf';

export const useImportDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { modal, message } = App.useApp();

    // 1. Fetch Import Detail
    const { data: importData, isLoading: isLoadingImport } = useQuery({
        queryKey: ['import-detail', id],
        queryFn: () => importService.getImportDetail(id!),
        enabled: !!id,
        select: (response) => response.data,
    });

    // 2. Fetch Inventory Sessions
    const { data: rawSessions = [], isLoading: isLoadingSessions } = useQuery({
        queryKey: ['inventory-sessions', id],
        queryFn: () => inventorySessionService.getByImportId(id!),
        enabled: !!id,
    });

    const sessions = rawSessions.map(session => ({
        ...session,
        sessionCode: session.code,
        totalRequired: importData?.totalQuantity || 0
    }));

    // 3. Chuẩn bị dữ liệu thiết bị
    const devicesUI: ImportDeviceUI[] = (importData?.devices || []).map((device) => {
        const importedCount = device.serialImported || device.expectedSerials?.length || 0;

        return {
            ...device,
            serialImported: importedCount,
            key: device.deviceCode,
            packaging: `${device.boxCount || 0} hộp × ${device.itemsPerBox || 0} sp/hộp`,
            serialStatus: importedCount === device.quantity ? 'complete' : importedCount > (device.quantity || 0) ? 'excess' : 'missing',
            serialExpected: device.quantity,
        };
    });

    const handlePrint = async () => {
        if (!importData) {
            message.error('Chưa có dữ liệu phiếu nhập');
            return;
        }
        try {
            message.loading({ content: 'Đang tạo file PDF...', key: 'pdf_export' });
            await exportImportPDF(importData);
            message.success({ content: 'Đã xuất file PDF thành công!', key: 'pdf_export' });
        } catch (error) {
            console.error(error);
            message.error({ content: 'Lỗi khi tạo PDF', key: 'pdf_export' });
        }
    };

    const handleEdit = () => {
        if (!importData) return;
        if (importData.status !== 'DRAFT') {
            message.warning('Chỉ có thể sửa phiếu ở trạng thái NHÁP');
            return;
        }
        navigate(`/import/edit/${id}`);
    };

    const handleDelete = () => {
        modal.confirm({
            title: 'Xóa phiếu nhập',
            content: 'Bạn có chắc chắn muốn xóa phiếu nhập này? Hành động này không thể hoàn tác.',
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await importService.deleteImport(id!);
                    message.success('Đã xóa phiếu nhập');
                    navigate('/import/list');
                } catch (error: any) {
                    message.error(error?.response?.data?.message || 'Không thể xóa phiếu nhập');
                }
            }
        });
    };

    const handleCreateSession = () => {
        // Navigate to check page, it will handle creation logic if init
        navigate(`/import/inventory-check/${id}`);
    };

    const handleContinueSession = (sessionId: string) => {
        navigate(`/import/inventory-check/${id}?sessionId=${sessionId}`);
    };

    return {
        importData,
        loading: isLoadingImport || isLoadingSessions,
        devicesUI,
        sessions,
        handlePrint,
        handleEdit,
        handleDelete,
        handleCreateSession,
        handleContinueSession,
        navigate
    };
};
