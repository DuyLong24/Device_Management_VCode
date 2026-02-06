import { Card, Table, Typography, Empty } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

interface ExportItem {
    serial: string;
    deviceCode: string;
    deviceModel?: string;
    scannedAt?: string;
    scannedBy?: string;
    mac?: string;
}

interface ActualItemsTableProps {
    items: ExportItem[];
}

export const ActualItemsTable = ({ items = [] }: ActualItemsTableProps) => {
    const columns = [
        {
            title: 'Mac Address',
            dataIndex: 'mac',
            key: 'mac',
            render: (text: string) => <Text strong>{text || '-'}</Text>,
        },
        {
            title: 'Mã thiết bị',
            dataIndex: 'deviceCode',
            key: 'deviceCode',
        },
        {
            title: 'Model',
            dataIndex: 'deviceModel',
            key: 'deviceModel',
            render: (text: string) => text || <Text type="secondary">-</Text>,
        },
        {
            title: 'Ngày quét',
            dataIndex: 'scannedAt',
            key: 'scannedAt',
            render: (date: string) => (date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'),
        },
        {
            title: 'Người quét',
            dataIndex: 'scannedBy',
            key: 'scannedBy',
            render: (text: string) => text || <Text type="secondary">-</Text>,
        },
    ];

    return (
        <Card title={`Mac đã xuất (${items.length})`} className="shadow-sm mb-6">
            {items.length === 0 ? (
                <Empty description="Chưa có mac nào được quét" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <Table
                    columns={columns}
                    dataSource={items}
                    rowKey={(record, index) => record.serial || `item-${index}`}
                    pagination={{ pageSize: 10 }}
                    size="small"
                    bordered
                />
            )}
        </Card>
    );
};
