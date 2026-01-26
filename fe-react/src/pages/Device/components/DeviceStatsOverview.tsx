import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';

export interface DeviceStatistics {
    total: number;
    PENDING_QC: number;
    READY_TO_EXPORT: number;
    DEFECT: number;
    IN_WARRANTY: number;
    SOLD: number;
    REMOVED: number;
}

interface DeviceStatsOverviewProps {
    stats: DeviceStatistics;
}

export const DeviceStatsOverview: React.FC<DeviceStatsOverviewProps> = ({ stats }) => {
    return (
        <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} sm={12} md={6} lg={4}>
                <Card className="shadow-sm border-blue-100 bg-blue-50/30">
                    <Statistic
                        title="Tổng thiết bị"
                        value={stats.total}
                        valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
                    />
                </Card>
            </Col>
            <Col xs={12} sm={12} md={6} lg={4}>
                <Card className="shadow-sm">
                    <Statistic title="Chờ QC" value={stats.PENDING_QC} />
                </Card>
            </Col>
            <Col xs={12} sm={12} md={6} lg={4}>
                <Card className="shadow-sm">
                    <Statistic
                        title="Sẵn sàng xuất"
                        value={stats.READY_TO_EXPORT}
                        valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                    />
                </Card>
            </Col>
            <Col xs={12} sm={12} md={6} lg={4}>
                <Card className="shadow-sm">
                    <Statistic
                        title="Lỗi / BH"
                        value={stats.DEFECT + stats.IN_WARRANTY}
                        valueStyle={{ color: '#faad14', fontWeight: 'bold' }}
                    />
                </Card>
            </Col>
            <Col xs={12} sm={12} md={6} lg={4}>
                <Card className="shadow-sm">
                    <Statistic
                        title="Đã xuất bán"
                        value={stats.SOLD}
                        valueStyle={{ color: '#1890ff' }}
                    />
                </Card>
            </Col>
            <Col xs={12} sm={12} md={6} lg={4}>
                <Card className="shadow-sm">
                    <Statistic
                        title="Đã loại bỏ"
                        value={stats.REMOVED}
                        valueStyle={{ color: '#cf1322' }}
                    />
                </Card>
            </Col>
        </Row>
    );
};
