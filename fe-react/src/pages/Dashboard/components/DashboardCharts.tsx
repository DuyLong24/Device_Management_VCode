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

interface DashboardChartsProps {
    data: ChartData[];
}

const COLORS = ['#1677ff', '#faad14', '#52c41a', '#ff4d4f', '#fadb14', '#13c2c2', '#8c8c8c', '#722ed1', '#fa541c'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // Chỉ hiện những trạng thái có số lượng > 0
        const filtered = payload.filter((p: any) => p.value > 0);

        // Sắp xếp theo giá trị giảm dần để Tooltip dễ nhìn hơn
        filtered.sort((a: any, b: any) => b.value - a.value);

        return (
            <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-md min-w-[200px] z-50">
                <p className="font-semibold mb-3 text-gray-800 border-b pb-2">{label}</p>
                {filtered.map((entry: any, index: number) => (
                    <div key={index} className="flex flex-row justify-between items-center gap-4 text-sm mb-2" style={{ color: entry.color }}>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                            <span>{entry.name}</span>
                        </div>
                        <span className="font-bold">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ data }) => {

    const pieData = [
        { name: 'Chờ QC', value: data.reduce((a, b) => a + b.pendingQc, 0) },
        { name: 'Sửa chữa', value: data.reduce((a, b) => a + b.underRepair, 0) },
        { name: 'Sẵn sàng xuất', value: data.reduce((a, b) => a + b.readyToExport, 0) },
        { name: 'Lỗi - Chờ BH NCC', value: data.reduce((a, b) => a + b.defect, 0) },
        { name: 'Đang bảo hành NCC', value: data.reduce((a, b) => a + b.inWarranty, 0) },
        { name: 'Chưa kích hoạt bảo hành', value: data.reduce((a, b) => a + b.notActivated, 0) },
        { name: 'Đang bảo hành', value: data.reduce((a, b) => a + b.sold, 0) },
        { name: 'Hết hạn BH', value: data.reduce((a, b) => a + b.soldWarranty, 0) },
        { name: 'Lỗi - Loại bỏ', value: data.reduce((a, b) => a + b.removed, 0) },
    ].filter(i => i.value > 0);

    return (
        <Row gutter={[16, 16]} className="mb-4">
            {/* Pie Chart: Tỷ lệ chung */}
            <Col xs={24} lg={8} className="min-w-0">
                <Card title="Phân bổ trạng thái" className="shadow-sm">
                    <div className="h-[420px] w-full" >
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ bottom: 30 }}>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={50}
                                    outerRadius={90}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {pieData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    wrapperStyle={{ paddingTop: '20px', lineHeight: '24px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </Col>

            {/* Bar Chart: Theo loại sản phẩm */}
            <Col xs={24} lg={16} className="min-w-0">
                <Card title="Thống kê theo Loại sản phẩm" className="shadow-sm">
                    <div className="h-[420px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                <Legend
                                    wrapperStyle={{ paddingTop: '20px', lineHeight: '24px' }}
                                />
                                <Bar dataKey="pendingQc" name="Chờ QC" fill="#1677ff" stackId="a" />
                                <Bar dataKey="underRepair" name="Sửa chữa" fill="#faad14" stackId="a" />
                                <Bar dataKey="readyToExport" name="Sẵn sàng xuất" fill="#52c41a" stackId="a" />
                                <Bar dataKey="defect" name="Lỗi - Chờ BH NCC" fill="#ff4d4f" stackId="a" />
                                <Bar dataKey="inWarranty" name="Đang bảo hành NCC" fill="#fadb14" stackId="a" />
                                <Bar dataKey="notActivated" name="Chưa kích hoạt bảo hành" fill="#13c2c2" stackId="a" />
                                <Bar dataKey="sold" name="Đang bảo hành" fill="#8c8c8c" stackId="a" />
                                <Bar dataKey="soldWarranty" name="Hết hạn BH" fill="#722ed1" stackId="a" />
                                <Bar dataKey="removed" name="Lỗi - Loại bỏ" fill="#fa541c" stackId="a" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </Col>
        </Row>
    );
};
