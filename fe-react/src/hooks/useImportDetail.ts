import { useParams, useNavigate } from 'react-router-dom';
import { message, Modal } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { importService } from '../services/import.service';
import { inventorySessionService } from '../services/inventory-session.service';
import type { ImportProductUI } from '../pages/Import/components/ImportProductTable';
import { exportImportPDF } from '../utils/export-import-pdf';

export const useImportDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

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

    // 3. Prepare Products Data for UI
    const productsUI: ImportProductUI[] = (importData?.products || []).map((product) => {
        return {
            ...product,
            key: product.productCode,
            packaging: `${product.boxCount || 0} hộp × ${product.itemsPerBox || 0} sp/hộp`,
            serialStatus: product.serialImported === product.quantity ? 'complete' : product.serialImported && product.serialImported > (product.quantity || 0) ? 'excess' : 'missing',
            serialExpected: product.quantity,
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
        message.info('Tính năng sửa đang phát triển');
    };

    const handleDelete = () => {
        Modal.confirm({
            title: 'Xóa phiếu nhập',
            content: 'Bạn có chắc chắn muốn xóa phiếu nhập này? Hành động này không thể hoàn tác.',
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                message.info('Tính năng xóa đang phát triển (API chưa hỗ trợ)');
                // await importService.delete(id);
                // message.success('Đã xóa phiếu nhập');
                // navigate('/import/list');
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
        productsUI,
        sessions,
        handlePrint,
        handleEdit,
        handleDelete,
        handleCreateSession,
        handleContinueSession,
        navigate
    };
};
