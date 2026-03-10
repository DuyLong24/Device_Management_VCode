import React from 'react';
import { Card, Table, Button, Typography, Tag, Space, Tooltip } from 'antd';
import { DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import { useAuth } from '../../../hooks/useAuth';
import { PERMISSION_KEYS } from '../../../constants/permissionKeys';

const { Text } = Typography;

export interface DeviceUI {
    key: string;
    iden?: string;
    mac: string;
    serial?: string;
    deviceCode: string;
    deviceName: string;
    warehouseName: string;
    warehouseColor: string;
    importDate?: string;
    createdAt?: string;
}

interface DeviceListTableProps {
    dataSource: DeviceUI[];
    loading: boolean;
    pagination: TablePaginationConfig;
    onChange: (pagination: any, filters: any, sorter: any) => void;
    onExport: () => void;
    onViewDetail: (mac: string) => void;
}

export const DeviceListTable: React.FC<DeviceListTableProps> = ({
    dataSource,
    loading,
    pagination,
    onChange,
    onExport,
    onViewDetail
}) => {
    const { hasPermission } = useAuth();
    const canExport = hasPermission(PERMISSION_KEYS.DEVICE.LIST.EXPORT);
    const columns: ColumnsType<DeviceUI> = [
        {
            title: 'Mã định danh',
            dataIndex: 'iden',
            key: 'iden',
            fixed: 'left',
            width: 'auto',
            onCell: () => ({
                className: '!pl-[0px]'
            }),
            onHeaderCell: () => ({
                className: '!pl-[20px]'
            }),
            render: (text: string) => {
                return (
                    <Button
                        type="link"
                        className="p-0 font-mono text-blue-600 font-semibold"
                        onClick={() => text ? onViewDetail(text) : undefined}
                        disabled={!text}
                    >
                        {text || '--'}
                    </Button>
                );
            },
        },
        {
            title: 'Mã Model',
            dataIndex: 'deviceModel',
            key: 'deviceModel',
            width: 'auto',
            onCell: () => ({
                className: '!pl-[10px]'
            }),
            onHeaderCell: () => ({
                className: '!pl-[10px]'
            }),
            render: (text, record: any) => {
                const value = text || record.deviceModel || record.model;
                return <Text strong>{value || '--'}</Text>
            }
        },
        {
            title: 'Tên thiết bị',
            dataIndex: 'deviceName',
            key: 'deviceName',
            width: 250,
            ellipsis: true,
        },
        {
            title: 'Trạng thái / Kho',
            dataIndex: 'warehouseName',
            key: 'warehouseName',
            width: 200,
            render: (text, record) => (
                <Tag color={record.warehouseColor} className="px-2 py-0.5 rounded text-xs font-medium border-0">
                    {text}
                </Tag>
            ),
        },
        {
            title: 'Ngày nhập',
            key: 'importDate',
            width: 150,
            render: (_, record) => {
                const dateVal = record.importDate || record.createdAt;
                if (!dateVal) return <span className="text-gray-400">--</span>;
                const d = dayjs(dateVal);
                return d.isValid()
                    ? <span className="text-gray-500">{d.format('DD/MM/YYYY')}</span>
                    : <span className="text-gray-400">--</span>;
            },
        },
        {
            title: 'Thao tác',
            key: 'action',
            fixed: 'right',
            width: 120,
            align: 'center',
            render: (_, record: any) => {
                const identifier = record.iden;
                return (
                    <Space size="small">
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            size="small"
                            title="Xem chi tiết"
                            onClick={() => identifier ? onViewDetail(identifier) : undefined}
                            disabled={!identifier}
                        />
                    </Space>
                );
            },
        },
    ];

    return (
        <Card className="shadow-sm border-gray-200" styles={{ body: { padding: 0 } }}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <Text strong>
                    Kết quả: <span className="text-blue-600">{pagination.total}</span> thiết bị
                </Text>
                <Tooltip title={!canExport ? 'Bạn không có quyền xuất file' : 'Xuất danh sách thiết bị ra Excel'}>
                    <Button
                        icon={<DownloadOutlined />}
                        onClick={onExport}
                        disabled={!canExport}
                    >
                        Xuất Excel
                    </Button>
                </Tooltip>
            </div>

            <Table
                columns={columns}
                dataSource={dataSource}
                rowKey="key"
                scroll={{ x: 1000 }}
                loading={loading}
                pagination={pagination}
                onChange={onChange}
                size="middle"
            />
        </Card>
    );
};
