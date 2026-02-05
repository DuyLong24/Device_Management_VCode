import React, { useState } from 'react';
import { Card, Table, Tag, Button, Drawer, Space, Statistic, Row, Col } from 'antd';
import { EyeOutlined, WarningOutlined, InboxOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

export interface ProductSummary {
    key: string;
    productType: string;
    totalPurchased: number;
    pending: number;
    imported: number;
    exported: number;
    defect: number;
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
            title: 'Chờ kiểm kê',
            dataIndex: 'pending',
            key: 'pending',
            width: 120,
            render: (val) => <Tag color="orange">{val}</Tag>
        },
        {
            title: 'Trong kho',
            dataIndex: 'imported',
            key: 'imported',
            width: 120,
            render: (val) => <Tag color="blue">{val}</Tag>
        },
        {
            title: 'Đã xuất',
            dataIndex: 'exported',
            key: 'exported',
            width: 120,
            render: (val) => <Tag color="green">{val}</Tag>
        },
        {
            title: 'Lỗi',
            dataIndex: 'defect',
            key: 'defect',
            width: 100,
            render: (val) => <Tag color="red">{val}</Tag>
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
                            <Col span={12}>
                                <Card size="small">
                                    <Statistic
                                        title="Chờ kiểm kê"
                                        value={selectedProduct.pending}
                                        valueStyle={{ color: '#faad14' }}
                                        prefix={<WarningOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card size="small">
                                    <Statistic
                                        title="Trong kho"
                                        value={selectedProduct.imported}
                                        valueStyle={{ color: '#1677ff' }}
                                        prefix={<InboxOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card size="small">
                                    <Statistic
                                        title="Đã xuất"
                                        value={selectedProduct.exported}
                                        valueStyle={{ color: '#52c41a' }}
                                        prefix={<CheckCircleOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card size="small">
                                    <Statistic
                                        title="Lỗi"
                                        value={selectedProduct.defect}
                                        valueStyle={{ color: '#ff4d4f' }}
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
