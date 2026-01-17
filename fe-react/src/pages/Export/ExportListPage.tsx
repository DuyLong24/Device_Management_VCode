import { Card, Table, Button, Tag, Space, Tooltip, Empty, Spin, Typography } from 'antd';
import { PlusOutlined, EyeOutlined, FileExcelOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import type { DeviceExport } from '../../types/export.type';
import { EXPORT_TYPE_COLORS, type ExportStatusType, type ExportTypeType } from '../../constants/export-status.constant';
import { getExportStatusTag } from '../../utils/export-status.util';
import { useExportList } from '../../hooks/useExportList';
import { StatisticsCards, PageHeader, FilterBar } from '../../components/ui';
import {
    FileTextOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    SyncOutlined,
    CheckSquareOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const ExportListPage = () => {
    const {
        filteredData,
        loading,
        form,
        statistics: stats,
        handleFilter,
        handleReset,
        handleCreate,
        handleViewDetail,
        handleExportExcel,
    } = useExportList();

    const statisticsCards = [
        {
            title: 'Tổng phiếu xuất',
            value: stats.total,
            prefix: <FileTextOutlined />,
            color: '#1677ff',
        },
        {
            title: 'Chờ duyệt',
            value: stats.pendingApproval,
            prefix: <ClockCircleOutlined />,
            color: '#faad14',
        },
        {
            title: 'Đã duyệt',
            value: stats.approved,
            prefix: <CheckCircleOutlined />,
            color: '#52c41a',
        },
        {
            title: 'Đang xuất',
            value: stats.inProgress,
            prefix: <SyncOutlined spin />,
            color: '#1677ff',
        },
        {
            title: 'Đã xuất',
            value: stats.completed,
            prefix: <CheckSquareOutlined />,
            color: '#8c8c8c',
        },
    ];

    const statusOptions = [
        { value: 'DRAFT', label: 'Nháp' },
        { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
        { value: 'APPROVED', label: 'Đã duyệt' },
        { value: 'IN_PROGRESS', label: 'Đang xuất' },
        { value: 'COMPLETED', label: 'Đã xuất' },
        { value: 'REJECTED', label: 'Từ chối' },
    ];

    const columns = [
        {
            title: 'Mã phiếu',
            dataIndex: 'code',
            key: 'code',
            width: 130,
            fixed: 'left' as const,
            render: (text: string, record: DeviceExport) => (
                <Button type="link" onClick={() => handleViewDetail(record.id || record._id || '')}>
                    {text}
                </Button>
            ),
        },
        {
            title: 'Tên phiếu',
            dataIndex: 'exportName',
            key: 'exportName',
            width: 180,
        },
        {
            title: 'Loại xuất',
            dataIndex: 'type',
            key: 'type',
            width: 120,
            render: (type: ExportTypeType) => {
                const color = EXPORT_TYPE_COLORS[type] || 'default';
                return <Tag color={color}>{type}</Tag>;
            },
        },
        {
            title: 'Lý do xuất',
            dataIndex: 'exportReason',
            key: 'exportReason',
            width: 120,
            render: (reason: string) => {
                const reasonLabels: Record<string, string> = {
                    SALE: 'Bán hàng',
                    WARRANTY: 'Bảo hành',
                    TRANSFER: 'Điều chuyển',
                    OTHER: 'Khác',
                };
                return <Tag color="blue">{reasonLabels[reason] || reason}</Tag>;
            },
        },
        {
            title: 'Đơn vị nhận',
            dataIndex: 'receiver',
            key: 'receiver',
            width: 180,
            render: (text: string, record: DeviceExport) => (
                <div>
                    <div>{text}</div>
                    {record.customer && <div style={{ fontSize: 12, color: '#999' }}>{record.customer}</div>}
                </div>
            ),
        },
        {
            title: 'Dự án',
            dataIndex: 'project',
            key: 'project',
            width: 150,
            render: (text: string) => text || <Text type="secondary">-</Text>,
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 120,
            render: (date: string) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
        },
        {
            title: 'Tổng mã SP',
            dataIndex: 'totalProductCodes',
            key: 'totalProductCodes',
            width: 100,
            align: 'center' as const,
            render: (count: number) => <Tag color="blue">{count || 0}</Tag>,
        },
        {
            title: 'Tổng SL',
            dataIndex: 'totalQuantity',
            key: 'totalQuantity',
            width: 100,
            align: 'center' as const,
            render: (qty: number) => <Tag color="cyan">{qty || 0}</Tag>,
        },
        {
            title: 'Serial đã xuất',
            key: 'serialProgress',
            width: 120,
            align: 'center' as const,
            render: (_: any, record: DeviceExport) => {
                const exported = record.items?.length || 0;
                const total = record.totalQuantity || 0;
                return (
                    <Text>
                        {exported} / {total}
                    </Text>
                );
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: ExportStatusType) => getExportStatusTag(status),
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 180,
            fixed: 'right' as const,
            render: (_: any, record: DeviceExport) => (
                <Space>
                    <Button
                        type="primary"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetail(record.id || record._id || '')}
                    >
                        Chi tiết
                    </Button>
                    <Tooltip title={record.status !== 'COMPLETED' ? 'Chỉ export Excel cho phiếu đã hoàn tất' : ''}>
                        <Button
                            size="small"
                            icon={<FileExcelOutlined />}
                            onClick={() => handleExportExcel(record)}
                            disabled={record.status !== 'COMPLETED'}
                        >
                            Xuất
                        </Button>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <div className="p-6">
            <PageHeader
                title="Danh sách phiếu xuất kho"
                subtitle="Quản lý các phiếu xuất kho thiết bị"
                extra={
                    <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleCreate}>
                        Tạo phiếu xuất
                    </Button>
                }
            />

            <StatisticsCards cards={statisticsCards} />

            <FilterBar
                form={form}
                onFilter={handleFilter}
                onReset={handleReset}
                searchPlaceholder="Tìm theo mã/tên phiếu, đơn vị nhận, dự án, khách hàng..."
                showDateRange={true}
                statusOptions={statusOptions}
                statusPlaceholder="Trạng thái"
            />

            {/* Table */}
            <Card>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px 0' }}>
                        <Spin size="large" tip="Đang tải dữ liệu..." />
                    </div>
                ) : filteredData.length === 0 ? (
                    <Empty description="Chưa có phiếu xuất nào">
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                            Tạo phiếu xuất đầu tiên
                        </Button>
                    </Empty>
                ) : (
                    <Table
                        columns={columns}
                        dataSource={filteredData}
                        rowKey={(record) => record.id || record._id || ''}
                        pagination={{
                            pageSize: 20,
                            showSizeChanger: true,
                            showTotal: (total) => `Tổng ${total} phiếu`,
                        }}
                        scroll={{ x: 1800 }}
                    />
                )}
            </Card>
        </div>
    );
};

export default ExportListPage;
