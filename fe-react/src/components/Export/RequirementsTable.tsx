import { Card, Table, Typography, Progress, Tag } from 'antd';

const { Text } = Typography;

interface Requirement {
    deviceCode: string;
    deviceName: string;
    quantity: number;
}

interface RequirementsTableProps {
    requirements: Requirement[];
    items: any[];
}

export const RequirementsTable = ({ requirements = [], items = [] }: RequirementsTableProps) => {
    const columns = [
        {
            title: 'Mã Thiết Bị',
            dataIndex: 'deviceCode',
            key: 'deviceCode',
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: 'Tên Thiết Bị',
            dataIndex: 'deviceName',
            key: 'deviceName',
        },
        {
            title: 'Yêu Cầu',
            dataIndex: 'quantity',
            key: 'quantity',
            align: 'center' as const,
            render: (qty: number) => <Tag color="blue">{qty}</Tag>,
        },
        {
            title: 'Đã Quét',
            key: 'scanned',
            align: 'center' as const,
            render: (_: any, record: Requirement) => {
                const scannedCount = items.filter((i) => i.deviceCode === record.deviceCode).length;
                const color = scannedCount < record.quantity ? 'warning' : scannedCount > record.quantity ? 'error' : 'success';
                return <Tag color={color}>{scannedCount}</Tag>;
            },
        },
        {
            title: 'Tiến độ',
            key: 'progress',
            width: 200,
            render: (_: any, record: Requirement) => {
                const scannedCount = items.filter((i) => i.deviceCode === record.deviceCode).length;
                const percent = Math.min(100, Math.round((scannedCount / record.quantity) * 100));
                return (
                    <Progress
                        percent={percent}
                        size="small"
                        status={scannedCount > record.quantity ? 'exception' : scannedCount === record.quantity ? 'success' : 'active'}
                    />
                );
            },
        },
    ];

    return (
        <Card title="Danh sách thiết bị yêu cầu" className="shadow-sm mb-6">
            <Table
                columns={columns}
                dataSource={requirements}
                rowKey={(record) => record.deviceCode}
                pagination={false}
                size="small"
                bordered
            />
        </Card>
    );
};
