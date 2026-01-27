import { Card, Table, Button, Tag, Space, Tooltip, Empty, Spin, Typography } from 'antd';
import { PlusOutlined, EyeOutlined, FileExcelOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import type { DeviceExport } from '../../types/export.type';
import { type ExportStatusType } from '../../constants/export-status.constant';
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
        handleDelete,
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
            title: 'Mã phiếu xuất',
            dataIndex: 'code',
            key: 'code',
            width: 130,
            fixed: 'left' as const,
            render: (text: string, record: DeviceExport) => (
                <Button type="link" onClick={() => handleViewDetail(record.id || record._id || '', record.status === 'DRAFT')}>
                    {text}
                </Button>
            ),
        },
        {
            title: 'Loại hàng hóa',
            dataIndex: 'type',
            key: 'type',
            width: 120,
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
            title: 'Ngày xuất',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 110,
            render: (date: string) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
        },
        {
            title: 'Người tạo',
            dataIndex: 'createdBy',
            key: 'createdBy',
            width: 130,
            render: (createdBy: any) => createdBy?.username || createdBy?.name || (typeof createdBy === 'string' ? createdBy : '') || '-',
        },
        {
            title: 'Đơn vị nhận',
            dataIndex: 'receiver',
            key: 'receiver',
            width: 180,
        },
        {
            title: 'Người nhận',
            dataIndex: 'receiverPerson',
            key: 'receiverPerson',
            width: 130,
            render: (text: string) => text || '-',
        },
        {
            title: 'Dự án',
            dataIndex: 'project',
            key: 'project',
            width: 180,
            render: (text: string) => text || <Text type="secondary">-</Text>,
        },
        {
            title: 'Khách hàng',
            dataIndex: 'customer',
            key: 'customer',
            width: 150,
            render: (text: string) => text || <Text type="secondary">-</Text>,
        },
        {
            title: 'Tổng mã SP',
            dataIndex: 'totalDeviceCodes',
            key: 'totalDeviceCodes',
            width: 100,
            align: 'center' as const,
            render: (count: number) => <Tag color="blue">{count || 0}</Tag>,
        },
        {
            title: 'Tổng SL',
            dataIndex: 'totalQuantity',
            key: 'totalQuantity',
            width: 90,
            align: 'center' as const,
            render: (qty: number) => <Tag color="cyan">{qty || 0}</Tag>,
        },
        {
            title: 'MAC đã xuất',
            key: 'serialProgress',
            width: 120,
            align: 'center' as const,
            render: (_: any, record: DeviceExport) => {
                const exported = record.items?.length || 0;
                const total = record.totalQuantity || 0;
                return (
                    <Space direction="vertical" size={0}>
                        <Text strong>
                            {exported}/{total}
                        </Text>
                    </Space>
                );
            },
        },
        {
            title: 'Trạng thái duyệt',
            dataIndex: 'status',
            key: 'status',
            width: 130,
            align: 'center' as const,
            render: (status: ExportStatusType) => getExportStatusTag(status),
        },
        {
            title: 'Người duyệt',
            dataIndex: 'approvedBy',
            key: 'approvedBy',
            width: 130,
            render: (approvedBy: any) => approvedBy?.username || approvedBy?.name || approvedBy?.fullName || (typeof approvedBy === 'string' ? approvedBy : '') || <Text type="secondary">-</Text>,
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 180,
            fixed: 'right' as const,
            align: 'center' as const,
            render: (_: any, record: DeviceExport) => {
                const isCompleted = record.status === 'COMPLETED';
                const isDraft = record.status === 'DRAFT';
                return (
                    <Space size="small">
                        <Button
                            type="primary"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewDetail(record.id || record._id || '', isDraft)}
                        >
                            {isDraft ? 'Sửa' : 'Chi tiết'}
                        </Button>
                        {isDraft && (
                            <Button
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => handleDelete(record.id || record._id || '')}
                            >
                                Xóa
                            </Button>
                        )}
                        <Tooltip title={!isCompleted ? 'Chỉ phiếu đã xuất mới được phép xuất file' : 'Xuất phiếu xuất kho'}>
                            <Button
                                size="small"
                                icon={<FileExcelOutlined />}
                                disabled={!isCompleted}
                                onClick={() => handleExportExcel(record)}
                            >
                                Xuất
                            </Button>
                        </Tooltip>
                    </Space>
                );
            },
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
                onValuesChange={handleFilter}
                onReset={handleReset}
                searchPlaceholder="Tìm theo mã/tên phiếu, đơn vị nhận, dự án, khách hàng..."
                showDateRange={true}
                statusOptions={statusOptions}
                statusPlaceholder="Trạng thái"
            />

            {/* Table */}
            <Card>
                {loading ? (
                    <div className="text-center py-12">
                        <Spin size="large" fullscreen={false} />
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
