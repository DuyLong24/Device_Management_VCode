import { Card, Table, Tag, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons';

const { Text } = Typography;

type CheckResult = 'match' | 'missing' | 'excess' | 'already_exported' | 'not_in_stock';

interface SerialItem {
    key: string;
    productCode: string;
    productName: string;
    serial: string;
    systemStatus: string;
    checkResult?: CheckResult;
    note?: string;
}

interface SerialCheckResultsTableProps {
    serialData: SerialItem[];
}

export const SerialCheckResultsTable = ({ serialData }: SerialCheckResultsTableProps) => {
    const getCheckResultConfig = (result?: CheckResult) => {
        const configs = {
            match: { color: 'success', text: 'Khớp', icon: <CheckCircleOutlined /> },
            missing: { color: 'default', text: 'Thiếu', icon: <WarningOutlined /> },
            excess: { color: 'warning', text: 'Thừa', icon: <WarningOutlined /> },
            already_exported: { color: 'error', text: 'Đã xuất rồi', icon: <CloseCircleOutlined /> },
            not_in_stock: { color: 'error', text: 'Không trong kho', icon: <CloseCircleOutlined /> },
        };
        return configs[result || 'missing'];
    };

    const columns = [
        {
            title: 'Mã SP',
            dataIndex: 'productCode',
            key: 'productCode',
            width: 130,
        },
        {
            title: 'Tên SP',
            dataIndex: 'productName',
            key: 'productName',
        },
        {
            title: 'Serial',
            dataIndex: 'serial',
            key: 'serial',
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: 'Trạng thái HT',
            dataIndex: 'systemStatus',
            key: 'systemStatus',
            width: 130,
            render: (status: string) => {
                const color = status === 'Đã nhập kho' ? 'green' : status === 'Đã xuất kho' ? 'red' : 'default';
                return <Tag color={color}>{status}</Tag>;
            },
        },
        {
            title: 'Kết quả',
            dataIndex: 'checkResult',
            key: 'checkResult',
            width: 130,
            render: (result: CheckResult) => {
                if (!result) return <Tag color="default">Chưa quét</Tag>;
                const config = getCheckResultConfig(result);
                return (
                    <Tag color={config.color} icon={config.icon}>
                        {config.text}
                    </Tag>
                );
            },
        },
        {
            title: 'Ghi chú',
            dataIndex: 'note',
            key: 'note',
            render: (note: string) => note || <Text type="secondary">-</Text>,
        },
    ];

    return (
        <Card title={`Kết quả kiểm tra (${serialData.length} serial)`} className="shadow-sm">
            <Table
                columns={columns}
                dataSource={serialData}
                rowKey="key"
                pagination={{ pageSize: 10 }}
                size="small"
                bordered
                scroll={{ x: 800 }}
            />
        </Card>
    );
};
