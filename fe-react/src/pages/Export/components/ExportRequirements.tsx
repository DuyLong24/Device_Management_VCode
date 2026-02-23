import { Card, Table, Typography } from 'antd';

const { Text } = Typography;

interface ExportRequirementsProps {
    perModelStats: any[];
}

export const ExportRequirements = ({ perModelStats }: ExportRequirementsProps) => {
    return (
        <Card title="Yêu cầu thiết bị" className="h-full">
            <Table
                dataSource={perModelStats}
                rowKey="deviceCode"
                columns={[
                    {
                        title: 'Mã Model',
                        dataIndex: 'deviceCode',
                        key: 'deviceCode',
                        render: (t: string, record: any) => (
                            <Text strong className={`font-mono ${record.isExcess ? 'text-red-600' : ''}`}>{t}</Text>
                        )
                    },
                    {
                        title: 'Tên thiết bị',
                        dataIndex: 'deviceName',
                        key: 'deviceName'
                    },
                    {
                        title: 'Tiến độ',
                        key: 'progress',
                        align: 'center',
                        render: (_: any, record: any) => (
                            <Text
                                strong
                                type={record.isExcess ? 'danger' : record.isComplete ? 'success' : record.totalScanned > 0 ? 'warning' : undefined}
                            >
                                {record.totalScanned}/{record.required}
                                {record.isExcess && ` (+${record.excess} thừa)`}
                            </Text>
                        )
                    }
                ]}
                pagination={false}
                size="small"
                locale={{ emptyText: 'Chưa có yêu cầu thiết bị' }}
                rowClassName={(record: any) => record.isExcess ? 'bg-red-50' : ''}
            />
        </Card>
    );
};
