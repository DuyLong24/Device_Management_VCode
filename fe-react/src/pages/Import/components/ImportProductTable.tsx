import React from 'react';
import { Table, Tag, Progress, Space, Tooltip, Typography } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import type { ImportProduct } from '../../../types/import.type';

const { Text } = Typography;

// Extended type for UI display (combining ImportProduct with calculated fields)
export interface ImportProductUI extends ImportProduct {
    key: string;
    packaging?: string;
    serialStatus?: 'complete' | 'missing' | 'excess';
    // Mapping from backend structure if needed
    serialExpected?: number;
}

interface ImportProductTableProps {
    products: ImportProductUI[];
    loading?: boolean;
}

export const ImportProductTable: React.FC<ImportProductTableProps> = ({
    products,
    loading = false,
}) => {
    const columns: TableColumnsType<ImportProductUI> = [
        {
            title: 'STT',
            key: 'index',
            width: 60,
            align: 'center',
            render: (_, __, index) => index + 1,
        },
        {
            title: 'Mã sản phẩm',
            dataIndex: 'productCode',
            key: 'productCode',
            width: 150,
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: 'Tên sản phẩm',
            dataIndex: 'productName',
            key: 'productName',
            render: (text) => text || <Text type="secondary">--</Text>,
        },
        {
            title: 'Số lượng',
            dataIndex: 'quantity',
            key: 'quantity',
            width: 100,
            align: 'center',
            render: (value) => <Tag color="blue">{value}</Tag>,
        },
        {
            title: 'Quy cách đóng gói',
            key: 'packaging',
            width: 180,
            render: (_, record) => (
                <Text>
                    {record.boxCount} hộp × {record.itemsPerBox} sp/hộp
                </Text>
            )
        },
        {
            title: 'Serial đã import',
            key: 'serialImport',
            width: 200,
            align: 'center',
            render: (_, item) => {
                const imported = item.serialImported || 0;
                const expected = item.quantity || 0;
                const percent = expected > 0 ? Math.round((imported / expected) * 100) : 0;

                return (
                    <Space direction="vertical" size={0} className="w-full">
                        <div className="flex justify-between text-xs mb-1">
                            <Text strong>{imported}/{expected}</Text>
                            <Text type="secondary">{percent}%</Text>
                        </div>
                        <Progress
                            percent={percent}
                            size="small"
                            status={imported < expected ? 'exception' : 'success'}
                            showInfo={false}
                            className="!m-0"
                            strokeColor={imported === expected ? '#52c41a' : imported > expected ? '#faad14' : undefined}
                        />
                    </Space>
                );
            },
        },
        {
            title: 'Trạng thái serial',
            key: 'serialStatus',
            width: 150,
            align: 'center',
            render: (_, item) => {
                const imported = item.serialImported || 0;
                const expected = item.quantity || 0;

                if (imported === expected) {
                    return <Tag color="success">Đủ serial</Tag>;
                } else if (imported < expected) {
                    return (
                        <Tooltip title={`Thiếu ${expected - imported} serial`}>
                            <Tag color="error" icon={<WarningOutlined />}>
                                Thiếu serial
                            </Tag>
                        </Tooltip>
                    );
                } else {
                    return (
                        <Tooltip title={`Thừa ${imported - expected} serial`}>
                            <Tag color="warning" icon={<WarningOutlined />}>
                                Thừa serial
                            </Tag>
                        </Tooltip>
                    );
                }
            },
        },
    ];

    return (
        <Table
            columns={columns}
            dataSource={products}
            pagination={false}
            size="small"
            bordered
            scroll={{ x: 1000 }}
            loading={loading}
            rowKey={(record) => record.productCode}
        />
    );
};
