import { Card, Tabs, Table, Tag, Button, Typography } from 'antd';
import { DeleteOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { TableColumnsType } from 'antd';

const { Text } = Typography;

interface InventoryListProps {
    scannedCount: number;
    processedItems: any[];
    removeServerItem: (mac: string) => void;
    handleRemoveLocalItem: (mac: string) => void;
    selectedDeviceCode: string | null;
    importInfo: any;
}

export const InventoryList = ({
    scannedCount,
    processedItems,
    removeServerItem,
    handleRemoveLocalItem,
    selectedDeviceCode,
    importInfo
}: InventoryListProps) => {

    const macColumns: TableColumnsType<any> = [
        { title: 'Mac', dataIndex: 'mac', key: 'mac', render: (t) => <Text strong className="text-blue-600 font-mono">{t}</Text> },
        { title: 'Tên thiết bị', dataIndex: 'deviceCode', key: 'deviceCode' },
        { title: 'Thời gian quét', dataIndex: 'scannedAt', key: 'scannedAt', render: (t) => dayjs(t).format('HH:mm:ss') },
        {
            title: 'So khớp',
            key: 'match',
            render: (_, r) => {
                if (r.status === 'DUPLICATE') return <Tag color="error" icon={<WarningOutlined />}>Đã tồn tại</Tag>;
                if (r.status === 'MATCHED') return <Tag color="success" icon={<CheckCircleOutlined />}>Khớp</Tag>;
                if (r.status === 'EXCESS') return <Tag color="warning" icon={<WarningOutlined />}>Thừa</Tag>;
                return <Tag>Unknown</Tag>;
            }
        },
        { title: 'Trạng thái', key: 'status', render: (_, r) => r._id ? <Tag color="blue">Đã lưu</Tag> : <Tag color="orange">Chưa lưu</Tag> },
        {
            title: '',
            key: 'action',
            render: (_, r) => {
                if (r._id) {
                    return <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeServerItem && removeServerItem(r.mac)} />;
                }
                return <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveLocalItem(r.mac)} />;
            }
        }
    ];

    const items = [
        {
            key: '1',
            label: `Danh sách quét (${scannedCount})`,
            children: (
                <Table
                    columns={macColumns}
                    dataSource={[...processedItems].reverse()}
                    pagination={{ pageSize: 20 }}
                    size="small"
                    bordered
                    rowKey={(r) => r.mac + r.scannedAt}
                    scroll={{ x: 1000, y: 500 }}
                    rowClassName={(record) => record.status === 'DUPLICATE' ? 'bg-red-50' : ''}
                />
            )
        },
        {
            key: '2',
            label: 'Mac mẫu (Đối chiếu)',
            children: !selectedDeviceCode ? (
                <div className="p-4 text-center text-gray-500">Chọn thiết bị để xem danh sách mac cần quét</div>
            ) : (
                <div className="p-4">
                    <Text strong>Mac dự kiến của {selectedDeviceCode}:</Text>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {importInfo?.devices
                            .find((p: any) => p.deviceCode === selectedDeviceCode)
                            ?.expectedMacs?.map((s: string) => {
                                const isScanned = processedItems.some(i => i.mac === s);
                                return (
                                    <Tag key={s} color={isScanned ? 'green' : 'default'}>
                                        {s} {isScanned && <CheckCircleOutlined />}
                                    </Tag>
                                )
                            })
                        }
                    </div>
                </div>
            )
        }
    ];

    return (
        <Card className="mb-6 shadow-sm">
            <Tabs defaultActiveKey="1" items={items} />
        </Card>
    );
};
