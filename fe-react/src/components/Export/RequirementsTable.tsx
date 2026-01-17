import { Card, Table, Typography, Progress, Tag } from 'antd';

const { Text } = Typography;

interface Requirement {
    productCode: string;
    productName: string;
    quantity: number;
}

interface RequirementsTableProps {
    requirements: Requirement[];
    items: any[];
}

export const RequirementsTable = ({ requirements = [], items = [] }: RequirementsTableProps) => {
    const columns = [
        {
            title: 'Mã Sản Phẩm',
            dataIndex: 'productCode',
            key: 'productCode',
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: 'Tên Sản Phẩm',
            dataIndex: 'productName',
            key: 'productName',
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
                const scannedCount = items.filter((i) => i.productCode === record.productCode).length;
                const color = scannedCount < record.quantity ? 'warning' : scannedCount > record.quantity ? 'error' : 'success';
                return <Tag color={color}>{scannedCount}</Tag>;
            },
        },
        {
            title: 'Tiến độ',
            key: 'progress',
            width: 200,
            render: (_: any, record: Requirement) => {
                const scannedCount = items.filter((i) => i.productCode === record.productCode).length;
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
        <Card title="Danh sách sản phẩm yêu cầu" className="shadow-sm mb-6">
            <Table
                columns={columns}
                dataSource={requirements}
                rowKey={(record) => record.productCode}
                pagination={false}
                size="small"
                bordered
            />
        </Card>
    );
};
