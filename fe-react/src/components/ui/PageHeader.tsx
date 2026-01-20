import { Typography, Space } from 'antd';
import type { ReactNode } from 'react';

const { Title } = Typography;

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    extra?: ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, extra }) => {
    return (
        <div className="mb-6 flex justify-between items-center">
            <div>
                <Title level={3} className="!m-0">
                    {title}
                </Title>
                {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
            </div>
            {extra && <Space>{extra}</Space>}
        </div>
    );
};
