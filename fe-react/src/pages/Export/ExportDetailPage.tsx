import { Button, Typography, Space, Spin, Alert, Tooltip, Card, Table } from 'antd';
import { ArrowLeftOutlined, InfoCircleOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

import { useExportDetail } from '../../hooks/useExportDetail';
import { ExportInfoCard } from '../../components/Export/ExportInfoCard';
import { ExportSessionList } from '../../components/Export/ExportSessionList';
import { useExportSession } from '../../hooks/useExportSession';
import { ActualItemsTable } from '../../components/Export/ActualItemsTable';
import { ApprovalActions } from '../../components/Export/ApprovalActions';
import { useAuth } from '../../hooks/useAuth';

import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function ExportDetailPage() {
    const {
        exportInfo,
        loading,
        id,
        handleSubmit,
        handleApprove,
        handleReject,
        handleNavigateToScan,
        handleBackToList,
        handleConfirm,
        handleEdit,
        handleDelete,
    } = useExportDetail();

    const { hasRole } = useAuth();
    const { sessions, createSession } = useExportSession(id);

    const handleCreateSession = () => {
        createSession(undefined);
    };

    const handleContinueSession = (sessionId: string) => {
        handleNavigateToScan(sessionId);
    };

    if (loading || !exportInfo) {
        return (
            <div className="text-center py-24">
                <Spin size="large" fullscreen={false} />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-4 flex justify-between items-center">
                <Space>
                    <Button icon={<ArrowLeftOutlined />} onClick={handleBackToList}>
                        Danh sách
                    </Button>
                    <Title level={4} className="!m-0">
                        Chi tiết phiếu xuất: {exportInfo.code}
                    </Title>
                </Space>

                <Space>
                    <Tooltip
                        title={
                            exportInfo.status !== 'PENDING_APPROVAL' && exportInfo.status !== 'DRAFT'
                                ? "Không thể chỉnh sửa phiếu đã duyệt"
                                : ""
                        }
                    >
                        <Button
                            icon={<EditOutlined />}
                            onClick={handleEdit}
                            disabled={exportInfo.status !== 'PENDING_APPROVAL' && exportInfo.status !== 'DRAFT'}
                        >
                            Sửa
                        </Button>
                    </Tooltip>
                    <Tooltip
                        title={
                            exportInfo.items && exportInfo.items.length > 0
                                ? "Không thể xóa phiếu xuất đã có thiết bị được quét"
                                : ""
                        }
                    >
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            onClick={handleDelete}
                            disabled={exportInfo.items && exportInfo.items.length > 0}
                        >
                            Xóa
                        </Button>
                    </Tooltip>
                    <ApprovalActions
                        status={exportInfo.status}
                        exportId={id || ''}
                        onSubmit={handleSubmit}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        // onNavigateToScan={handleNavigateToScan}
                        onConfirm={handleConfirm}
                        canApprove={hasRole('admin') || hasRole('super admin') || hasRole('super_admin')}
                    />
                </Space>
            </div>

            {/* Alerts */}
            {exportInfo.status === 'PENDING_APPROVAL' && (
                <Alert
                    message="Phiếu xuất đang chờ duyệt"
                    description="Phiếu xuất kho này đang chờ lãnh đạo duyệt. Sau khi được duyệt, bạn có thể tiến hành chọn serial và xuất kho."
                    type="warning"
                    showIcon
                    icon={<InfoCircleOutlined />}
                    className="mb-4"
                />
            )}

            {exportInfo.status === 'REJECTED' && (
                <Alert
                    message="Phiếu xuất đã bị từ chối"
                    description={
                        <div>
                            <Text strong>Lý do từ chối:</Text> {exportInfo.rejectedReason}
                        </div>
                    }
                    type="error"
                    showIcon
                    className="mb-4"
                />
            )}

            {exportInfo.status === 'APPROVED' && (
                <Alert
                    message="Phiếu xuất đã được duyệt"
                    description={
                        <div>
                            Phiếu đã được duyệt bởi <Text strong>{exportInfo.approvedBy?.username || exportInfo.approvedBy?.name || exportInfo.approvedBy?.fullName || (typeof exportInfo.approvedBy === 'string' ? exportInfo.approvedBy : '')}</Text> vào lúc{' '}
                            <Text strong>{exportInfo.approvedDate ? dayjs(exportInfo.approvedDate).format('DD/MM/YYYY HH:mm') : ''}</Text>. Có thể tiến hành chọn
                            serial và xuất kho.
                        </div>
                    }
                    type="success"
                    showIcon
                    className="mb-4"
                />
            )}

            {/* Thông tin phiếu xuất */}
            <ExportInfoCard exportInfo={exportInfo} />

            {/* Bảng yêu cầu */}
            <Card title="Yêu cầu thiết bị" className="mb-4">
                <Table
                    dataSource={exportInfo.requirements?.map((req: any) => ({
                        key: req.deviceCode || req._id,
                        deviceCode: req.deviceCode,
                        deviceName: req.deviceName,
                        quantity: req.quantity
                    })) || []}
                    columns={[
                        {
                            title: 'Mã Model',
                            dataIndex: 'deviceCode',
                            key: 'deviceCode',
                            render: (t: string) => <Text strong className="font-mono">{t}</Text>
                        },
                        {
                            title: 'Tên thiết bị',
                            dataIndex: 'deviceName',
                            key: 'deviceName'
                        },
                        {
                            title: 'Số lượng yêu cầu',
                            dataIndex: 'quantity',
                            key: 'quantity',
                            align: 'center' as const
                        }
                    ]}
                    pagination={false}
                    size="small"
                    locale={{ emptyText: 'Chưa có yêu cầu thiết bị' }}
                />
            </Card>

            {/* Bảng thiết bị */}
            <ActualItemsTable items={exportInfo.items || []} />

            {/* Session Management */}
            {['APPROVED', 'IN_PROGRESS'].includes(exportInfo.status) && (
                <ExportSessionList
                    sessions={sessions}
                    onCreateSession={handleCreateSession}
                    onContinueSession={handleContinueSession}
                    canCreate={exportInfo.status === 'APPROVED' || exportInfo.status === 'IN_PROGRESS'}
                />
            )}
        </div>
    );
}
