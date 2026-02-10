import React from 'react';
import { Button, Space, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useDashboard } from '../../hooks/useDashboard';
import { DashboardStats } from './components/DashboardStats';
import { DashboardCharts } from './components/DashboardCharts';
import { DashboardTable } from './components/DashboardTable';

const { Title } = Typography;

const DashboardPage: React.FC = () => {
    const { loading, stats, productBreakdown, chartData, refresh } = useDashboard();

    return (
        <div className="p-4 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Title level={2} className="mb-0">Dashboard</Title>
                    {/* <span className="text-gray-500">Tổng quan hoạt động kho & thiết bị</span> */}
                </div>
                <Space>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => refresh()}
                        loading={loading}
                    >
                        Làm mới
                    </Button>
                </Space>
            </div>

            {/* 1. Thống kê tổng quan */}
            <DashboardStats stats={stats} />

            {/* 2. Biểu đồ phân tích */}
            <DashboardCharts data={chartData} />

            {/* 3. Bảng chi tiết */}
            <DashboardTable data={productBreakdown} loading={loading} />
        </div>
    );
};

export default DashboardPage;
