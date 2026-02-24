import React from 'react';
import { Card, Col, Row, Statistic, Typography } from 'antd';
import { InboxOutlined, ShopOutlined, DatabaseOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface DashboardStatsProps {
    stats: {
        total: number;
        pendingQc: number;
        underRepair: number;
        readyToExport: number;
        defect: number;
        inWarranty: number;
        notActivated: number;
        sold: number;
        soldWarranty: number;
        removed: number;
    }
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
    return (
        <Card title={<span className="text-lg font-bold">Tổng quan số lượng</span>} className="mb-4 shadow-sm">
            <Row gutter={[16, 16]}>
                {/* Card 1: Tổng thiết bị */}
                <Col xs={24} lg={6}>
                    <Card hoverable className="bg-blue-50 border-blue-200 h-full">
                        <Statistic
                            title={<span className="font-semibold text-gray-600">Tổng thiết bị trên hệ thống</span>}
                            value={stats.total}
                            prefix={<DatabaseOutlined className="text-blue-500" />}
                            valueStyle={{ color: '#1677ff', fontWeight: 'bold' }}
                        />
                    </Card>
                </Col>

                {/* Card 2: Kho nội bộ (Internal) */}
                <Col xs={24} lg={9}>
                    <Card hoverable className="bg-orange-50 border-orange-200 h-full">
                        <Statistic
                            title={<span className="font-semibold text-gray-600">Kho Nội Bộ</span>}
                            value={stats.pendingQc + stats.underRepair + stats.readyToExport + stats.defect + stats.inWarranty}
                            prefix={<InboxOutlined className="text-orange-500" />}
                            valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
                        />
                        <div className="mt-4 flex flex-col gap-2 text-sm">
                            <Text type="secondary">- Chờ QC: <span className="font-bold">{stats.pendingQc}</span></Text>
                            <Text type="warning">- Sửa chữa: <span className="font-bold">{stats.underRepair}</span></Text>
                            <Text type="success">- Sẵn sàng xuất: <span className="font-bold">{stats.readyToExport}</span></Text>
                            <Text type="danger">- Lỗi - Chờ BH NCC: <span className="font-bold">{stats.defect}</span></Text>
                            <Text className="text-yellow-600 text-yellow-600">- Đang bảo hành NCC: <span className="font-bold">{stats.inWarranty}</span></Text>
                        </div>
                    </Card>
                </Col>

                {/* Card 3: Khách hàng / Đã xuất (Exported) */}
                <Col xs={24} lg={9}>
                    <Card hoverable className="bg-green-50 border-green-200 h-full">
                        <Statistic
                            title={<span className="font-semibold text-gray-600">Kho Đã Xuất</span>}
                            value={stats.notActivated + stats.sold + stats.soldWarranty + stats.removed}
                            prefix={<ShopOutlined className="text-green-500" />}
                            valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                        />
                        <div className="mt-4 flex flex-col gap-2 text-sm">
                            <Text type="secondary">- Chưa kích hoạt bảo hành: <span className="font-bold">{stats.notActivated}</span></Text>
                            <Text type="secondary">- Đang bảo hành: <span className="font-bold">{stats.sold}</span></Text>
                            <Text type="secondary">- Hết hạn BH: <span className="font-bold">{stats.soldWarranty}</span></Text>
                            <Text type="danger">- Lỗi - Loại bỏ: <span className="font-bold">{stats.removed}</span></Text>
                        </div>
                    </Card>
                </Col>
            </Row>
        </Card>
    );
};
