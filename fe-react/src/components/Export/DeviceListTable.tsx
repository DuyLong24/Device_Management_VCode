import { Card, Table, Tag, Typography, Progress, Tooltip, Space } from 'antd';
import { WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { DeviceExport } from '../../types/export.type';

const { Text } = Typography;

interface DeviceListTableProps {
    exportInfo: DeviceExport;
}

export const DeviceListTable = ({ exportInfo }: DeviceListTableProps) => {
    const data = (exportInfo.requirements || []).map((req, index) => {
        // Đếm số lượng đã scan
        const exportedCount = (exportInfo.items || []).filter(
            (item) => item.deviceCode === req.deviceCode
        ).length;

        return {
            key: req.deviceCode || index,
            deviceCode: req.deviceCode,
            deviceName: req.deviceName || 'Không xác định',
            quantity: req.quantity,
            serialExported: exportedCount,
            serialExpected: req.quantity,
            packaging: `${Math.ceil(req.quantity / 10)} hộp`,
        };
    });

    const columns = [
        {
            title: 'STT',
            key: 'index',
            width: 60,
            align: 'center' as const,
            render: (_: any, __: any, index: number) => index + 1,
        },
        {
            title: 'Mã thiết bị',
            dataIndex: 'deviceCode',
            key: 'deviceCode',
            width: 150,
        },
        {
            title: 'Tên thiết bị',
            dataIndex: 'deviceName',
            key: 'deviceName',
        },
        {
            title: 'Số lượng',
            dataIndex: 'quantity',
            key: 'quantity',
            width: 100,
            align: 'center' as const,
            render: (value: number) => <Tag color="blue">{value}</Tag>,
        },
        {
            title: 'Mac đã chọn',
            key: 'serialExport',
            width: 200,
            align: 'center' as const,
            render: (_: any, item: any) => (
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                    <div className="flex justify-between text-xs mb-1">
                        <Text strong>
                            {item.serialExported}/{item.serialExpected}
                        </Text>
                        <Text type="secondary">
                            {Math.round((item.serialExported / item.serialExpected) * 100)}%
                        </Text>
                    </div>
                    <Progress
                        percent={Math.round((item.serialExported / item.serialExpected) * 100)}
                        size="small"
                        status={item.serialExported >= item.serialExpected ? 'success' : 'active'}
                        showInfo={false}
                        strokeColor={item.serialExported > item.serialExpected ? '#faad14' : undefined}
                    />
                </Space>
            ),
        },
        {
            title: 'Trạng thái',
            key: 'status',
            width: 150,
            align: 'center' as const,
            render: (_: any, item: any) => {
                if (item.serialExported === item.serialExpected) {
                    return <Tag color="success" icon={<CheckCircleOutlined />}>Đủ mac</Tag>;
                } else if (item.serialExported < item.serialExpected) {
                    return (
                        <Tooltip title={`Thiếu ${item.serialExpected - item.serialExported} mac`}>
                            <Tag color="error" icon={<WarningOutlined />}>
                                Thiếu mac
                            </Tag>
                        </Tooltip>
                    );
                } else {
                    return (
                        <Tooltip title={`Thừa ${item.serialExported - item.serialExpected} mac`}>
                            <Tag color="warning" icon={<WarningOutlined />}>
                                Thừa mac
                            </Tag>
                        </Tooltip>
                    );
                }
            },
        },
    ];

    return (
        <Card
            title="Danh sách thiết bị"
            className="shadow-sm mb-6"
        >
            <Table
                columns={columns}
                dataSource={data}
                pagination={false}
                size="small"
                bordered
                rowKey="deviceCode"
            />
        </Card>
    );
};
