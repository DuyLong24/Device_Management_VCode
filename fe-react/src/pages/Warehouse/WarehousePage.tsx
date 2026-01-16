import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Typography, Space, Button, Tag, Breadcrumb } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';

import { deviceService, type Device } from '../../services/device.service';
import { warehouseService } from '../../services/warehouse.service';
import { WAREHOUSE_LABELS, WAREHOUSE_TABLE_COLUMNS } from '../../constants/warehouse.constants';
import { DEVICE_STATUS_LABEL, DEVICE_STATUS } from '../../constants/dashboard.constants'; // Reuse from Dashboard or create new if needed

const { Title, Text } = Typography;

export default function WarehousePage() {
    const { code } = useParams();
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // 1. Get Warehouse Info
    const { data: warehouses } = useQuery({
        queryKey: ['warehouses'],
        queryFn: warehouseService.getAll,
        staleTime: 5 * 60 * 1000 // Cache for 5 mins
    });

    const currentWarehouse = warehouses?.find(w => w.code === code);

    // 2. Get Devices in Warehouse
    const { data: deviceData, isLoading, refetch } = useQuery({
        queryKey: ['devices', code, page, pageSize],
        queryFn: () => deviceService.getAll({
            page,
            limit: pageSize,
            warehouseId: currentWarehouse?._id
        }),
        enabled: !!currentWarehouse?._id
    });

    // Reset page when switching warehouse
    useEffect(() => {
        setPage(1);
    }, [code]);

    const columns = [
        {
            title: WAREHOUSE_TABLE_COLUMNS.STT,
            key: 'index',
            width: 70,
            align: 'center' as const,
            render: (_: any, __: any, index: number) => (page - 1) * pageSize + index + 1
        },
        {
            title: WAREHOUSE_TABLE_COLUMNS.SERIAL,
            dataIndex: 'serial',
            key: 'serial',
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: WAREHOUSE_TABLE_COLUMNS.NAME,
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: WAREHOUSE_TABLE_COLUMNS.MODEL,
            dataIndex: 'deviceModel',
            key: 'deviceModel',
        },
        {
            title: WAREHOUSE_TABLE_COLUMNS.STATUS,
            dataIndex: 'status',
            key: 'status',
            render: (status: string, record: Device) => {
                const finalStatus = record.qcStatus || status;
                let color = 'default';
                if (finalStatus === DEVICE_STATUS.PASS || finalStatus === DEVICE_STATUS.READY_TO_EXPORT) color = 'success';
                else if (finalStatus === DEVICE_STATUS.PENDING || finalStatus === DEVICE_STATUS.PENDING_QC) color = 'warning';
                else if (finalStatus === DEVICE_STATUS.DEFECT) color = 'error';

                return <Tag color={color}>{DEVICE_STATUS_LABEL[finalStatus] || finalStatus}</Tag>;
            }
        },
        {
            title: WAREHOUSE_TABLE_COLUMNS.IMPORT_DATE,
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => date ? new Date(date).toLocaleDateString('vi-VN') : '-'
        }
    ];

    if (!code) return null;

    return (
        <div className="p-4">
            <Breadcrumb
                items={[
                    { title: 'Dashboard', onClick: () => navigate('/dashboard'), className: 'cursor-pointer' },
                    { title: WAREHOUSE_LABELS.TITLE },
                    { title: currentWarehouse?.name || code }
                ]}
                className="mb-4"
            />

            <Card
                title={
                    <Space>
                        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')} />
                        <Title level={4} style={{ margin: 0 }}>
                            {currentWarehouse ? `${currentWarehouse.name} (${currentWarehouse.code})` : code}
                        </Title>
                    </Space>
                }
                extra={<Button icon={<ReloadOutlined />} onClick={() => refetch()} />}
            >
                {!currentWarehouse && !isLoading ? (
                    <div className="text-center py-10">
                        <Text type="secondary">{WAREHOUSE_LABELS.NOT_FOUND}</Text>
                        <br />
                        <Button type="link" onClick={() => navigate('/dashboard')}>
                            {WAREHOUSE_LABELS.BACK_TO_DASHBOARD}
                        </Button>
                    </div>
                ) : (
                    <Table
                        columns={columns}
                        dataSource={deviceData?.results || []}
                        loading={isLoading}
                        rowKey="id"
                        pagination={{
                            current: page,
                            pageSize: pageSize,
                            total: deviceData?.totalResults || 0,
                            onChange: (p, ps) => {
                                setPage(p);
                                setPageSize(ps);
                            },
                            showSizeChanger: true,
                            showTotal: (total) => `Tổng ${total} thiết bị`
                        }}
                    />
                )}
            </Card>
        </div>
    );
}
