import React from 'react';
import { Table, Tag, Progress, Space, Tooltip, Typography } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import type { ImportDevice } from '../../../types/import.type';

const { Text } = Typography;

export interface ImportDeviceUI extends ImportDevice {
    key: string;
    packaging?: string;
    macStatus?: 'complete' | 'missing' | 'excess';
    macExpected?: number;
}

interface ImportDeviceTableProps {
    devices: ImportDeviceUI[];
    loading?: boolean;
}

export const ImportDeviceTable: React.FC<ImportDeviceTableProps> = ({
    devices,
    loading = false,
}) => {
    const columns: TableColumnsType<ImportDeviceUI> = [
        {
            title: 'STT',
            key: 'index',
            width: 60,
            align: 'center',
            render: (_, __, index) => index + 1,
        },
        {
            title: 'Mã thiết bị',
            dataIndex: 'deviceCode',
            key: 'deviceCode',
            width: 150,
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: 'Tên thiết bị',
            dataIndex: 'deviceName',
            key: 'deviceName',
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
            title: 'Mac đã quét',
            key: 'macImport',
            width: 200,
            align: 'center',
            render: (_, item) => {
                const imported = item.macImported || 0;
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
            title: 'Trạng thái mac',
            key: 'macStatus',
            width: 150,
            align: 'center',
            render: (_, item) => {
                const imported = item.macImported || 0;
                const expected = item.quantity || 0;

                if (imported === expected) {
                    return <Tag color="success">Đủ mac</Tag>;
                } else if (imported < expected) {
                    return (
                        <Tooltip title={`Thiếu ${expected - imported} mac`}>
                            <Tag color="error" icon={<WarningOutlined />}>
                                Thiếu mac
                            </Tag>
                        </Tooltip>
                    );
                } else {
                    return (
                        <Tooltip title={`Thừa ${imported - expected} mac`}>
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
        <Table
            columns={columns}
            dataSource={devices}
            pagination={false}
            size="small"
            bordered
            scroll={{ x: 1000 }}
            loading={loading}
            rowKey={(record) => record.deviceCode}
        />
    );
};
