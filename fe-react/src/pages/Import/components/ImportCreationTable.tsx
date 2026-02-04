import React from 'react';
import { Table, Button, InputNumber, Select, Space, Badge, Tag, Card } from 'antd';
import { DeleteOutlined, NumberOutlined, PlusOutlined, ImportOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';

import type { DeviceEntry } from '../../../types/import.type';

interface ImportCreationTableProps {
    deviceList: DeviceEntry[];
    modelOptions: any[];
    onAddDevice: () => void;
    onDeleteDevice: (key: string) => void;
    onDeviceChange: (key: string, field: string, value: any) => void;
    onOpenMacModal: (item: DeviceEntry) => void;
    onOpenWizard: () => void;
}

export const ImportCreationTable: React.FC<ImportCreationTableProps> = ({
    deviceList,
    modelOptions,
    onAddDevice,
    onDeleteDevice,
    onDeviceChange,
    onOpenMacModal,
    onOpenWizard
}) => {
    const columns: TableColumnsType<DeviceEntry> = [
        {
            title: <span className="font-semibold"><span className="text-red-500 mr-1" aria-hidden="true">*</span>Mã thiết bị (Model)</span>,
            dataIndex: 'deviceCode',
            key: 'deviceCode',
            width: '25%',
            render: (value, record) => (
                <Select
                    showSearch
                    value={value}
                    placeholder="Chọn hoặc nhập mã Thiết bị"
                    className="w-full"
                    options={modelOptions}
                    onChange={(val) => onDeviceChange(record.key, 'deviceCode', val)}
                    optionRender={(option) => (
                        <Space>
                            <span className="font-semibold">{option.data.value}</span>
                            {option.data.stockName && <span className="text-gray-500">({option.data.stockName})</span>}
                        </Space>
                    )}
                    filterOption={(input, option) =>
                        String(option?.value ?? '').toLowerCase().includes(input.toLowerCase()) ||
                        String(option?.stockName ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                />
            ),
        },
        {
            title: <span className="font-semibold"><span className="text-red-500 mr-1" aria-hidden="true">*</span>Số lượng</span>,
            dataIndex: 'quantity',
            key: 'quantity',
            width: '10%',
            render: (value, record) => (
                <InputNumber
                    min={1}
                    value={value}
                    className="w-full"
                    onChange={(val) => onDeviceChange(record.key, 'quantity', val || 1)}
                />
            ),
        },
        {
            title: <span className="font-semibold">Quy cách (Hộp x Chiếc)</span>,
            key: 'packaging',
            width: '20%',
            render: (_, record) => (
                <div className="flex items-center space-x-2">
                    <InputNumber
                        min={1}
                        value={record.boxCount}
                        className="w-1/2"
                        placeholder="Hộp"
                        onChange={(val) => onDeviceChange(record.key, 'boxCount', val)}
                    />
                    <span className="text-gray-400 select-none">x</span>
                    <InputNumber
                        value={record.itemsPerBox}
                        className="w-1/2"
                        placeholder="SP"
                        onChange={(val) => onDeviceChange(record.key, 'itemsPerBox', val)}
                    />
                </div>
            ),
        },
        {
            title: <span className="font-semibold text-center block"><span className="text-red-500 mr-1" aria-hidden="true">*</span>Danh sách MAC</span>,
            key: 'macs',
            width: '20%',
            align: 'center',
            render: (_, record) => {
                const count = record.expectedSerials?.length || 0;
                const isMatch = count === record.quantity;
                const isEmpty = count === 0;

                return (
                    <Badge count={count} offset={[-5, 5]} color={isMatch ? '#52c41a' : '#ff4d4f'}>
                        <Button
                            type={isEmpty ? 'dashed' : 'default'}
                            icon={<NumberOutlined />}
                            className={!isMatch && !isEmpty ? 'border-red-500 text-red-500' : ''}
                            onClick={() => onOpenMacModal(record)}
                        >
                            {isEmpty ? 'Nhập MAC' : 'Chi tiết'}
                        </Button>
                    </Badge>
                );
            }
        },
        {
            title: <span className="font-semibold text-center block">Trạng thái</span>,
            key: 'check',
            width: '15%',
            align: 'center',
            render: (_, record) => {
                const serialMatch = (record.expectedSerials?.length || 0) === record.quantity;
                const serialEmpty = (record.expectedSerials?.length || 0) === 0;

                return (
                    <Space direction="vertical" size="small">
                        {!serialEmpty && (serialMatch ? <Tag color="blue">Đủ</Tag> : <Tag color="warning">Chưa khớp SL</Tag>)}
                        {serialEmpty && <Tag color="default">Chưa nhập MAC</Tag>}
                    </Space>
                )
            }
        },
        {
            title: <span className="sr-only">Thao tác</span>,
            key: 'action',
            width: '10%',
            align: 'center',
            render: (_, record) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => onDeleteDevice(record.key)}
                />
            ),
        },
    ];

    return (
        <Card
            title={<span className="text-lg font-semibold">Danh sách thiết bị ({deviceList.length})</span>}
            className="shadow-sm border-gray-200"
            variant="borderless"
            extra={
                <Space>
                    <Button icon={<ImportOutlined />} onClick={onOpenWizard}>Import Excel Tổng</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={onAddDevice} className="bg-blue-600 hover:bg-blue-700">
                        Thêm mã thiết bị
                    </Button>
                </Space>
            }
        >
            <Table
                columns={columns}
                dataSource={deviceList}
                pagination={false}
                bordered
                size="middle"
                locale={{ emptyText: 'Chưa có thiết bị nào. Bấm "Thêm mã thiết bị" để bắt đầu.' }}
                rowClassName="align-middle"
            />

            {deviceList.length > 0 && (
                <div className="mt-3 flex justify-end items-center gap-2">
                    <span className="text-gray-600">Tổng số lượng:</span>
                    <span className="text-xl font-bold text-green-600">
                        {deviceList.reduce((acc, cur) => acc + (cur.quantity || 0), 0)}
                    </span>
                </div>
            )}
        </Card>
    );
};
