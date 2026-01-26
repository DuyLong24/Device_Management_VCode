import { Button, Space, Tag, Spin, Card } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { DetailInfoCard, type InfoItem } from '../../components/common/DetailInfoCard';
import { ImportDeviceTable } from './components/ImportDeviceTable';
import { InventorySessionList } from './components/InventorySessionList';
import { ImportHeader } from './components/ImportHeader';
import { ImportOverviewCard } from './components/ImportOverviewCard';
import { useImportDetail } from '../../hooks/useImportDetail';

import { IMPORT_STATUS_CONFIG } from '../../constants/import.constants';

const ImportDetailPage = () => {
    const {
        importData,
        loading,
        devicesUI,
        sessions,
        handlePrint,
        handleEdit,
        handleDelete,
        handleCreateSession,
        handleContinueSession,
        navigate
    } = useImportDetail();

    if (loading || !importData) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Spin size="large" />
            </div>
        );
    }

    const {
        code,
        inventoryStatus,
        status,
        supplier,
        importDate,
        importedBy,
        handoverPerson,
        notes,
        totalQuantity,
        serialImported,
        totalItem
    } = importData;

    // Info Card Items
    const infoItems: InfoItem[] = [
        { label: 'Mã phiếu', value: <span className="font-semibold">{code}</span> },
        { label: 'Nhà cung cấp', value: supplier },
        { label: 'Ngày nhập', value: dayjs(importDate).format('DD/MM/YYYY') },
        { label: 'Người nhập', value: importedBy },
        { label: 'Người bàn giao', value: handoverPerson },
        {
            label: 'Trạng thái kiểm kê',
            value: (
                <Tag color={IMPORT_STATUS_CONFIG[inventoryStatus as keyof typeof IMPORT_STATUS_CONFIG]?.color || 'default'}>
                    {IMPORT_STATUS_CONFIG[inventoryStatus as keyof typeof IMPORT_STATUS_CONFIG]?.text || inventoryStatus}
                </Tag>
            )
        },
        { label: 'Ghi chú', value: notes || '--', span: 2 },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <ImportHeader
                code={code}
                inventoryStatus={inventoryStatus}
                status={status}
                onBack={() => navigate('/import/list')}
                onPrint={handlePrint}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <Space direction="vertical" size="large" className="w-full">
                {/* 1. Thông tin phiếu nhập kho */}
                <DetailInfoCard
                    title="Thông tin phiếu nhập kho"
                    items={infoItems}
                    className="!mb-0"
                />

                {/* 2. Tổng quan */}
                <ImportOverviewCard
                    totalItem={totalItem || devicesUI.length}
                    totalQuantity={totalQuantity || 0}
                    serialImported={serialImported || 0}
                />

                {/* 3. Danh sách thiết bị */}
                <Card
                    title="Danh sách thiết bị"
                    className="shadow-sm"
                    styles={{ body: { padding: 0 } }}
                    extra={
                        <Button
                            icon={<FileTextOutlined />}
                            onClick={handlePrint}
                        >
                            Xuất danh sách
                        </Button>
                    }
                >
                    <ImportDeviceTable devices={devicesUI} />
                </Card>

                {/* 4. Thao tác kiểm kê */}
                <InventorySessionList
                    sessions={sessions}
                    importStatus={inventoryStatus}
                    ticketStatus={status} // [NEW]
                    onContinue={handleContinueSession}
                    onExport={handlePrint}
                    onViewInfo={() => { }}
                    onCreateNew={handleCreateSession}
                />
            </Space>
        </div>
    );
};

export default ImportDetailPage;
