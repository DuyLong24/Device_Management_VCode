import React from 'react';
import { Card, Row, Col, Statistic, Progress, Typography } from 'antd';
import {
    NumberOutlined,
    FileTextOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';

const { Text } = Typography;

interface ImportOverviewCardProps {
    totalItem: number;
    totalQuantity: number;
    serialImported: number;
}

export const ImportOverviewCard: React.FC<ImportOverviewCardProps> = ({
    totalItem,
    totalQuantity,
    serialImported
}) => {
    const progressPercent = totalQuantity > 0
        ? Math.round((serialImported / totalQuantity) * 100)
        : 0;

    return (
        <Card title="Tổng quan" className="shadow-sm">
            <Row gutter={16}>
                <Col xs={12} sm={8}>
                    <Statistic
                        title="Tổng mã thiết bị"
                        value={totalItem}
                        prefix={<NumberOutlined />}
                        valueStyle={{ color: '#1677ff' }}
                    />
                </Col>
                <Col xs={12} sm={8}>
                    <Statistic
                        title="Tổng số lượng"
                        value={totalQuantity}
                        prefix={<FileTextOutlined />}
                        valueStyle={{ color: '#52c41a' }}
                    />
                </Col>
                <Col xs={24} sm={8}>
                    <Statistic
                        title="Thiết bị đã kiểm kê"
                        value={serialImported}
                        suffix={`/ ${totalQuantity}`}
                        prefix={<CheckCircleOutlined />}
                        valueStyle={{
                            color: (serialImported === totalQuantity) ? '#52c41a' : '#faad14',
                        }}
                    />
                </Col>
            </Row>
            <div className="my-4 border-t border-gray-100" />
            <div className="w-full">
                <div className="flex justify-between text-xs mb-1">
                    <Text type="secondary">Tiến độ nhập kho: {progressPercent}%</Text>
                </div>
                <Progress
                    percent={progressPercent}
                    status={serialImported < totalQuantity ? 'exception' : 'success'}
                    showInfo={false}
                />
            </div>
        </Card>
    );
};
