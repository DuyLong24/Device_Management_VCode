import { Button, Space, Tag, Spin, Row, Col, Card, Statistic, Typography, Progress } from 'antd';
import {
    PrinterOutlined,
    EditOutlined,
    DeleteOutlined,
    ArrowLeftOutlined,
    FileTextOutlined,
    NumberOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

// import { PageHeader } from '../../components/ui/PageHeader'; // Removed as we inline the header style to match design
// import { StatisticsCards } from '../../components/ui/StatisticsCards'; // Removed as we use custom overview card
import { DetailInfoCard, type InfoItem } from '../../components/common/DetailInfoCard';
import { ImportProductTable } from './components/ImportProductTable';
import { InventorySessionList } from './components/InventorySessionList';
import { useImportDetail } from '../../hooks/useImportDetail';

import { IMPORT_STATUS_CONFIG } from '../../constants/import.constants';

const { Title, Text } = Typography;

const ImportDetailPage = () => {
    const {
        importData,
        loading,
        productsUI,
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
                <Spin size="large" tip="Đang tải dữ liệu..." />
            </div>
        );
    }

    const {
        code,
        inventoryStatus,
        supplier,
        importDate,
        importedBy,
        handoverPerson,
        notes,
        totalQuantity,
        serialImported,
        totalItem
    } = importData;

    // --- Prepare Data for Components ---

    // 1. Header Actions
    const headerExtra = (
        <Space>
            <Button icon={<PrinterOutlined />} onClick={handlePrint}>In phiếu</Button>
            <Button icon={<EditOutlined />} onClick={handleEdit}>Sửa</Button>
            <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>Xóa</Button>
        </Space>
    );

    // 2. Info Card Items
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

    // 3. Statistics


    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Space className="mb-4">
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate('/import/list')}
                    >
                        Quay lại danh sách
                    </Button>
                </Space>
                <div className="flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Title level={3} className="!m-0">
                                Chi tiết phiếu nhập kho
                            </Title>
                        </div>

                        <Space>
                            <Text strong className="text-base">
                                {code}
                            </Text>
                            <Tag color={IMPORT_STATUS_CONFIG[inventoryStatus as keyof typeof IMPORT_STATUS_CONFIG]?.color || 'default'}>
                                {IMPORT_STATUS_CONFIG[inventoryStatus as keyof typeof IMPORT_STATUS_CONFIG]?.text || inventoryStatus}
                            </Tag>
                        </Space>
                    </div>
                    {headerExtra}
                </div>
            </div>

            {/* Vertical Stack Layout check */}
            <Space direction="vertical" size="large" className="w-full">

                {/* 1. Thông tin phiếu nhập kho */}
                <DetailInfoCard
                    title="Thông tin phiếu nhập kho"
                    items={infoItems}
                    className="!mb-0"
                />

                {/* 2. Tổng quan (Custom implementation to match design: Single Card > Row > Col > Statistic) */}
                <Card title="Tổng quan" className="shadow-sm">
                    <Row gutter={16}>
                        <Col xs={12} sm={8}>
                            <Statistic
                                title="Tổng mã sản phẩm"
                                value={totalItem || productsUI.length}
                                prefix={<NumberOutlined />}
                                valueStyle={{ color: '#1677ff' }}
                            />
                        </Col>
                        <Col xs={12} sm={8}>
                            <Statistic
                                title="Tổng số lượng"
                                value={totalQuantity || 0}
                                prefix={<FileTextOutlined />}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Col>
                        <Col xs={24} sm={8}>
                            <Statistic
                                title="Serial đã import"
                                value={serialImported || 0}
                                suffix={`/ ${totalQuantity}`}
                                prefix={<CheckCircleOutlined />}
                                valueStyle={{
                                    color: (serialImported === totalQuantity) ? '#52c41a' : '#faad14',
                                }}
                            />
                        </Col>
                    </Row>
                    <div className="my-4 border-t border-gray-100" />
                    <div className="w-full">
                        <div className="flex justify-between text-xs mb-1">
                            <Text type="secondary">Tiến độ nhập kho: {Math.round((serialImported / totalQuantity) * 100)}%</Text>
                        </div>
                        <Progress
                            percent={Math.round((serialImported / totalQuantity) * 100)}
                            status={serialImported < totalQuantity ? 'exception' : 'success'}
                            showInfo={false}
                        />
                    </div>
                </Card>

                {/* 3. Danh sách sản phẩm */}
                <Card
                    title="Danh sách sản phẩm"
                    className="shadow-sm"
                    bodyStyle={{ padding: 0 }}
                    extra={
                        <Button
                            icon={<FileTextOutlined />}
                            onClick={() => { }}
                        >
                            Xuất danh sách
                        </Button>
                    }
                >
                    <ImportProductTable products={productsUI} />
                </Card>

                {/* 4. Thao tác kiểm kê */}
                <InventorySessionList
                    sessions={sessions}
                    importStatus={inventoryStatus}
                    onContinue={handleContinueSession}
                    onExport={() => { }}
                    onViewInfo={() => { }}
                    onCreateNew={handleCreateSession}
                />
            </Space>
        </div>
    );
};

export default ImportDetailPage;
