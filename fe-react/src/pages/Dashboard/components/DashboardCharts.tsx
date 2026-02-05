import React from 'react';
import { Card, Col, Row } from 'antd';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

interface ChartData {
    name: string;
    pending: number;
    imported: number;
    exported: number;
    defect: number;
}

interface DashboardChartsProps {
    data: ChartData[];
}

const COLORS = ['#faad14', '#1677ff', '#52c41a', '#ff4d4f'];

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ data }) => {

    // tổng hợp dữ liệu cho pie chart
    const pieData = [
        { name: 'Chờ kiểm kê', value: data.reduce((a, b) => a + b.pending, 0) },
        { name: 'Trong kho', value: data.reduce((a, b) => a + b.imported, 0) },
        { name: 'Đã xuất', value: data.reduce((a, b) => a + b.exported, 0) },
        { name: 'Lỗi', value: data.reduce((a, b) => a + b.defect, 0) },
    ].filter(i => i.value > 0);

    return (
        <Row gutter={[16, 16]} className="mb-4">
            {/* Pie Chart: Tỷ lệ chung */}
            <Col xs={24} lg={8} className="min-w-0">
                <Card title="Phân bổ trạng thái" className="shadow-sm">
                    <div className="h-64 w-full" >
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </Col>

            {/* Bar Chart: Theo loại sản phẩm */}
            <Col xs={24} lg={16} className="min-w-0">
                <Card title="Thống kê theo Loại sản phẩm" className="shadow-sm">
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="pending" name="Chờ kiểm kê" fill="#faad14" stackId="a" />
                                <Bar dataKey="imported" name="Trong kho" fill="#1677ff" stackId="a" />
                                <Bar dataKey="exported" name="Đã xuất" fill="#52c41a" stackId="a" />
                                <Bar dataKey="defect" name="Lỗi" fill="#ff4d4f" stackId="a" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </Col>
        </Row>
    );
};
