import React, { useState } from 'react';
import { Card, Table, Tag, Button, Drawer, Space, Statistic, Row, Col } from 'antd';
import { EyeOutlined, WarningOutlined, InboxOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

export interface ProductSummary {
    key: string;
    productType: string;
    totalPurchased: number;
    pendingQc: number;
    underRepair: number;
    readyToExport: number;
    defect: number;
    inWarranty: number;
    notActivated: number;
    sold: number;
    soldWarranty: number;
    removed: number;
    defectRate: number;
}

interface DashboardTableProps {
    data: ProductSummary[];
    loading?: boolean;
}

export const DashboardTable: React.FC<DashboardTableProps> = ({ data, loading }) => {
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<ProductSummary | null>(null);

    const handleViewDetail = (record: ProductSummary) => {
        setSelectedProduct(record);
        setDrawerVisible(true);
    };

    const columns: ColumnsType<ProductSummary> = [
        {
            title: 'Loại sản phẩm',
            dataIndex: 'productType',
            key: 'productType',
            fixed: 'left',
            width: 180,
            render: (text) => <span className="font-semibold">{text}</span>
        },
        {
            title: 'Tổng nhập',
            dataIndex: 'totalPurchased',
            key: 'totalPurchased',
            sorter: (a, b) => a.totalPurchased - b.totalPurchased,
            width: 120,
            render: (val) => <Tag color="purple">{val}</Tag>
        },
        {
            title: 'Chờ QC',
            dataIndex: 'pendingQc',
            key: 'pendingQc',
            width: 100,
            render: (val) => <Tag color="blue">{val}</Tag>
        },
        {
            title: 'Sửa chữa',
            dataIndex: 'underRepair',
            key: 'underRepair',
            width: 100,
            render: (val) => <Tag color="orange">{val}</Tag>
        },
        {
            title: 'Sẵn sàng xuất',
            dataIndex: 'readyToExport',
            key: 'readyToExport',
            width: 120,
            render: (val) => <Tag color="green">{val}</Tag>
        },
        {
            title: 'Lỗi - Chờ BH NCC',
            dataIndex: 'defect',
            key: 'defect',
            width: 130,
            render: (val) => <Tag color="red">{val}</Tag>
        },
        {
            title: 'Đang bảo hành NCC',
            dataIndex: 'inWarranty',
            key: 'inWarranty',
            width: 140,
            render: (val) => <Tag color="yellow">{val}</Tag>
        },
        {
            title: 'Chưa kích hoạt bảo hành',
            dataIndex: 'notActivated',
            key: 'notActivated',
            width: 160,
            render: (val) => <Tag color="cyan">{val}</Tag>
        },
        {
            title: 'Đang bảo hành',
            dataIndex: 'sold',
            key: 'sold',
            width: 120,
            render: (val) => <Tag color="gray">{val}</Tag>
        },
        {
            title: 'Hết hạn BH',
            dataIndex: 'soldWarranty',
            key: 'soldWarranty',
            width: 120,
            render: (val) => <Tag color="purple">{val}</Tag>
        },
        {
            title: 'Lỗi - Loại bỏ',
            dataIndex: 'removed',
            key: 'removed',
            width: 120,
            render: (val) => <Tag color="volcano">{val}</Tag>
        },

        {
            title: 'Thao tác',
            key: 'action',
            fixed: 'right',
            width: 100,
            render: (_, record) => (
                <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} />
            )
        }
    ];

    return (
        <Card title="Chi tiết theo loại sản phẩm" className="shadow-sm">
            <Table
                columns={columns}
                dataSource={data}
                loading={loading}
                scroll={{ x: 1000 }}
                pagination={{ pageSize: 5 }}
            />

            <Drawer
                title={`Chi tiết: ${selectedProduct?.productType}`}
                placement="right"
                width={600}
                onClose={() => setDrawerVisible(false)}
                open={drawerVisible}
            >
                {selectedProduct && (
                    <Space direction="vertical" className="w-full" size="large">
                        <Card className="bg-purple-50 border-purple-200">
                            <Statistic
                                title="Tổng nhập khẩu"
                                value={selectedProduct.totalPurchased}
                                valueStyle={{ color: '#722ed1' }}
                            />
                        </Card>

                        <Row gutter={[16, 16]}>
                            <Col span={8}>
                                <Card size="small">
                                    <Statistic
                                        title="Chờ QC"
                                        value={selectedProduct.pendingQc}
                                        valueStyle={{ color: '#1677ff' }}
                                        prefix={<InboxOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card size="small">
                                    <Statistic
                                        title="Sửa chữa"
                                        value={selectedProduct.underRepair}
                                        valueStyle={{ color: '#fa8c16' }}
                                        prefix={<WarningOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card size="small">
                                    <Statistic
                                        title="Sẵn sàng xuất"
                                        value={selectedProduct.readyToExport}
                                        valueStyle={{ color: '#52c41a' }}
                                        prefix={<CheckCircleOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card size="small">
                                    <Statistic
                                        title="Lỗi - Chờ BH NCC"
                                        value={selectedProduct.defect}
                                        valueStyle={{ color: '#ff4d4f' }}
                                        prefix={<WarningOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card size="small">
                                    <Statistic
                                        title="Đang bảo hành NCC"
                                        value={selectedProduct.inWarranty}
                                        valueStyle={{ color: '#fadb14' }}
                                        prefix={<WarningOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card size="small">
                                    <Statistic
                                        title="Chưa kích hoạt bảo hành"
                                        value={selectedProduct.notActivated}
                                        valueStyle={{ color: '#13c2c2' }}
                                        prefix={<CheckCircleOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card size="small">
                                    <Statistic
                                        title="Đang bảo hành"
                                        value={selectedProduct.sold}
                                        valueStyle={{ color: '#8c8c8c' }}
                                        prefix={<CheckCircleOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card size="small">
                                    <Statistic
                                        title="Hết hạn BH"
                                        value={selectedProduct.soldWarranty}
                                        valueStyle={{ color: '#722ed1' }}
                                        prefix={<CheckCircleOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card size="small">
                                    <Statistic
                                        title="Lỗi - Loại bỏ"
                                        value={selectedProduct.removed}
                                        valueStyle={{ color: '#fa541c' }}
                                        prefix={<WarningOutlined />}
                                    />
                                </Card>
                            </Col>
                        </Row>
                    </Space>
                )}
            </Drawer>
        </Card>
    );
};
