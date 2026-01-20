import React from 'react';
import { Card, Descriptions } from 'antd';

export interface InfoItem {
    label: string;
    value: React.ReactNode;
    span?: number;
}

interface DetailInfoCardProps {
    title: React.ReactNode;
    items: InfoItem[];
    columns?: number;
    className?: string;
    loading?: boolean;
    extra?: React.ReactNode;
}

export const DetailInfoCard: React.FC<DetailInfoCardProps> = ({
    title,
    items,
    columns = 2,
    className = '',
    loading = false,
    extra,
}) => {
    return (
        <Card title={title} className={`mb-4 shadow-sm ${className}`} loading={loading} extra={extra}>
            <Descriptions column={columns} bordered size="small">
                {items.map((item, index) => (
                    <Descriptions.Item
                        key={index}
                        label={item.label}
                        span={item.span || 1}
                    >
                        {item.value}
                    </Descriptions.Item>
                ))}
            </Descriptions>
        </Card>
    );
};
