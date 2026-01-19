import { Card, Table, Button, Tag, Typography, Empty } from 'antd';
import { ScanOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

interface ExportRecord {
    key: string;
    exportCode: string;
    productType: string;
    exportDate: string;
    exportedBy: string;
    receiver: string;
    project?: string;
    customer?: string;
    totalQuantity: number;
    totalSerials: number;
    exportStatus: 'pending_approval' | 'approved' | 'in-progress' | 'completed';
}

interface ExportSelectionTableProps {
    exports: ExportRecord[];
    onSelectExport: (record: ExportRecord) => void;
    loading?: boolean;
}

export const ExportSelectionTable = ({ exports, onSelectExport, loading }: ExportSelectionTableProps) => {
    const canSelectExport = (status: string): boolean => {
        return status === 'approved' || status === 'in-progress';
    };

    const getDisabledReason = (status: string): string => {
        if (status === 'pending_approval') return 'Phiếu chờ duyệt - Chưa được phép xuất kho';
        if (status === 'completed') return 'Phiếu đã xuất xong - Không thể xuất lại';
        return '';
    };

    const columns = [
        {
            title: 'Mã phiếu xuất',
            dataIndex: 'exportCode',
            key: 'exportCode',
            width: 150,
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: 'Loại hàng hóa',
            dataIndex: 'productType',
            key: 'productType',
        },
        {
            title: 'Ngày xuất',
            dataIndex: 'exportDate',
            key: 'exportDate',
            width: 120,
            render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
        },
        {
            title: 'Đơn vị nhận',
            dataIndex: 'receiver',
            key: 'receiver',
            width: 180,
        },
        {
            title: 'Tổng số lượng',
            dataIndex: 'totalQuantity',
            key: 'totalQuantity',
            width: 120,
            align: 'center' as const,
        },
        {
            title: 'Serial đã quét',
            key: 'serialProgress',
            width: 120,
            align: 'center' as const,
            render: (_: any, record: ExportRecord) => {
                const isComplete = record.totalSerials === record.totalQuantity;
                return (
                    <Text type={isComplete ? 'success' : 'danger'}>
                        {record.totalSerials}/{record.totalQuantity}
                    </Text>
                );
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'exportStatus',
            key: 'exportStatus',
            width: 120,
            render: (status: string) => {
                const configs: Record<string, { color: string; text: string }> = {
                    pending_approval: { color: 'warning', text: 'Chờ duyệt' },
                    approved: { color: 'success', text: 'Đã duyệt' },
                    'in-progress': { color: 'processing', text: 'Đang xuất' },
                    completed: { color: 'default', text: 'Đã xuất' },
                };
                const config = configs[status] || configs.pending_approval;
                return <Tag color={config.color}>{config.text}</Tag>;
            },
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 150,
            align: 'center' as const,
            render: (_: any, record: ExportRecord) => {
                const disabled = !canSelectExport(record.exportStatus);
                return (
                    <Button
                        type="primary"
                        icon={<ScanOutlined />}
                        onClick={() => onSelectExport(record)}
                        disabled={disabled}
                        title={disabled ? getDisabledReason(record.exportStatus) : 'Quét xuất kho'}
                    >
                        Quét
                    </Button>
                );
            },
        },
    ];

    return (
        <Card title="Chọn phiếu xuất để quét" className="shadow-sm">
            {exports.length === 0 ? (
                <Empty description="Không có phiếu xuất nào đủ điều kiện" />
            ) : (
                <Table
                    columns={columns}
                    dataSource={exports}
                    rowKey="key"
                    pagination={{ pageSize: 10 }}
                    size="small"
                    bordered
                    loading={loading}
                />
            )}
        </Card>
    );
};
