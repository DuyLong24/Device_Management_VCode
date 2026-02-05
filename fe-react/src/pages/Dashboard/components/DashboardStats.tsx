import React from 'react';
import { Card, Col, Row, Statistic, Typography } from 'antd';
import { InboxOutlined, ShopOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface DashboardStatsProps {
    stats: {
        total: number;
        imported: number;
        exported: number;
        pending: number;
        defect: number;
    }
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
    return (
        <Card title={<span className="text-lg font-bold">Tổng quan kho</span>} className="mb-4 shadow-sm">
            <Row gutter={[16, 16]}>
                {/* Card 1: Tổng tồn kho */}
                <Col xs={24} lg={12}>
                    <Card
                        hoverable
                        className="bg-blue-50 border-blue-200"
                    >
                        <Statistic
                            title={<span className="font-semibold text-gray-600">Tổng thiết bị trong kho</span>}
                            value={stats.total}
                            prefix={<InboxOutlined className="text-blue-500" />}
                            valueStyle={{ color: '#1677ff', fontWeight: 'bold' }}
                        />
                        <div className="mt-4 flex justify-between items-center">
                            <Text type="secondary">Sẵn sàng xuất: {stats.imported}</Text>
                        </div>
                    </Card>
                </Col>

                {/* Card 2: Trạng thái xử lý */}
                <Col xs={24} lg={12}>
                    <Card
                        hoverable
                        className="bg-green-50 border-green-200"
                    >
                        <Statistic
                            title={<span className="font-semibold text-gray-600">Đã xuất kho</span>}
                            value={stats.exported}
                            prefix={<ShopOutlined className="text-green-500" />}
                            valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                        />
                        <div className="mt-4 flex gap-4">
                            <Text type="warning">Chờ kiểm kê: {stats.pending}</Text>
                            <Text type="danger">Lỗi: {stats.defect}</Text>
                        </div>
                    </Card>
                </Col>
            </Row>
        </Card>
    );
};
