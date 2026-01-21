import { Card, Table, Input, Typography, Tooltip, Space } from 'antd';
import { ScanOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useState } from 'react';

const { Text } = Typography;

interface ScannedItem {
    serial: string;
    deviceModel: string;
    productCode: string;
    scannedAt?: string;
    status?: 'success' | 'warning' | 'error'; // local status
    message?: string;
}

interface ScannedListProps {
    items: ScannedItem[];
    loading?: boolean;
}

export const ScannedList = ({ items, loading }: ScannedListProps) => {
    const [searchText, setSearchText] = useState('');

    const filteredItems = items.filter(i =>
        i.serial.toLowerCase().includes(searchText.toLowerCase()) ||
        i.productCode?.toLowerCase().includes(searchText.toLowerCase())
    );

    const columns = [
        {
            title: 'STT',
            key: 'index',
            width: 60,
            render: (_: any, __: any, index: number) => items.length - index
        },
        {
            title: 'Serial',
            dataIndex: 'serial',
            key: 'serial',
            render: (t: string, r: ScannedItem) => (
                <Space>
                    <Text strong className="text-blue-600 font-mono">{t}</Text>
                    {r.status === 'warning' && (
                        <Tooltip title={r.message || 'Cảnh báo'}>
                            <WarningOutlined className="text-orange-500" />
                        </Tooltip>
                    )}
                    {r.status === 'error' && (
                        <Tooltip title={r.message || 'Lỗi'}>
                            <CloseCircleOutlined className="text-red-500" />
                        </Tooltip>
                    )}
                </Space>
            )
        },
        { title: 'Model', dataIndex: 'deviceModel', key: 'deviceModel' },
        { title: 'Sản phẩm', dataIndex: 'productCode', key: 'productCode' },
        {
            title: 'Thời gian',
            dataIndex: 'scannedAt',
            key: 'scannedAt',
            render: (t: string) => t ? new Date(t).toLocaleTimeString('vi-VN') : '-'
        }
    ];

    // Sort Date Descending
    const sortedItems = [...filteredItems].sort((a, b) =>
        (new Date(b.scannedAt || 0).getTime() - new Date(a.scannedAt || 0).getTime())
    );

    return (
        <Card
            title={
                <div className="flex justify-between items-center">
                    <span>Đã quét ({items.length})</span>
                    <Input
                        placeholder="Tìm serial..."
                        prefix={<ScanOutlined />}
                        className="w-48 lg:w-64"
                        size="small"
                        allowClear
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                    />
                </div>
            }
            className="shadow-sm flex-1 flex flex-col h-full"
            bodyStyle={{ flex: 1, overflow: 'hidden', padding: 0 }}
        >
            <Table
                dataSource={sortedItems}
                columns={columns}
                rowKey="serial"
                size="small"
                pagination={{ pageSize: 15, showSizeChanger: true }}
                scroll={{ y: 'calc(100vh - 450px)' }}
                sticky
                loading={loading}
                locale={{ emptyText: 'Chưa có thiết bị nào trong phiên này' }}
            />
        </Card>
    );
};

