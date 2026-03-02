import React, { useState } from 'react';
import {
    Card, Table, Typography, Space, Tag, Spin,
    Row, Col, Statistic, Empty, Button, Tooltip
} from 'antd';
import {
    BarChartOutlined, ReloadOutlined,
    CheckCircleOutlined, CloseCircleOutlined, SwapOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
    PieChart, Pie, Cell, Tooltip as RTooltip,
    Legend, ResponsiveContainer, RadialBarChart, RadialBar
} from 'recharts';
import { importService } from '../../services/import.service';
import { deviceService } from '../../services/device.service';

const { Title, Text } = Typography;

// Palette không dùng tím/xanh mặc định
const DEFECT_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#8B5CF6'];

// ------- Sub-component: Panel chi tiết cho 1 lô -------
const ImportDetailPanel: React.FC<{ importId: string; importCode: string }> = ({ importId, importCode }) => {
    const { data, isLoading } = useQuery({
        queryKey: ['defect-rate', importId],
        queryFn: () => deviceService.getDefectRateStats(importId),
        enabled: !!importId,
    });

    if (isLoading) return <Spin className="block mx-auto my-8" />;
    if (!data) return <Empty description="Không có dữ liệu" />;

    const summary = data.summary ?? {};
    const distribution: { reasonName: string; count: number }[] = data.distribution ?? [];

    const defectRate = summary.totalDevices > 0
        ? ((summary.totalDefective / summary.totalDevices) * 100).toFixed(1)
        : '0';

    // Data cho RadialBar (gauge-style) – % tốt vs lỗi
    const gaugeData = [
        { name: 'Máy tốt', value: summary.totalGood ?? 0, fill: '#22C55E' },
        { name: 'Máy lỗi', value: summary.totalDefective ?? 0, fill: '#EF4444' },
    ];

    const pieData = distribution.map((d, i) => ({
        name: d.reasonName,
        value: d.count,
        fill: DEFECT_COLORS[i % DEFECT_COLORS.length],
    }));

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-2">
            <Title level={5} className="mb-4">
                📊 Chi tiết lô <Tag color="blue">{importCode}</Tag>
            </Title>

            {/* KPI Cards */}
            <Row gutter={16} className="mb-4">
                {[
                    { title: 'Tổng số', value: summary.totalDevices ?? 0, color: '#1677ff' },
                    { title: 'Máy tốt', value: summary.totalGood ?? 0, color: '#22C55E' },
                    { title: 'Máy lỗi', value: summary.totalDefective ?? 0, color: '#EF4444' },
                    { title: 'Đổi 1-1', value: summary.totalSwapped ?? 0, color: '#F97316' },
                    { title: 'Sửa tại chỗ', value: summary.totalLocalRepaired ?? 0, color: '#EAB308' },
                    { title: 'Trả hãng', value: summary.totalSentToVendor ?? 0, color: '#8B5CF6' },
                ].map(kpi => (
                    <Col key={kpi.title} xs={12} sm={8} md={4}>
                        <Card size="small" className="text-center">
                            <Statistic
                                title={<Text className="text-xs">{kpi.title}</Text>}
                                value={kpi.value}
                                valueStyle={{ color: kpi.color, fontSize: 20 }}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row gutter={24}>
                {/* Gauge: tỷ lệ tốt/lỗi */}
                <Col xs={24} md={12}>
                    <Card
                        size="small"
                        title={
                            <Space>
                                <CheckCircleOutlined style={{ color: '#22C55E' }} />
                                <span>Tỷ lệ Tốt / Lỗi</span>
                                <Tag color="red">{defectRate}% lỗi</Tag>
                            </Space>
                        }
                    >
                        <ResponsiveContainer width="100%" height={200}>
                            <RadialBarChart
                                innerRadius="40%"
                                outerRadius="90%"
                                data={gaugeData}
                                startAngle={90}
                                endAngle={-270}
                            >
                                <RadialBar dataKey="value" cornerRadius={4} label={{ position: 'insideStart', fill: '#fff', fontSize: 12 }} />
                                <RTooltip formatter={(v: number | string | undefined) => [`${v ?? 0} máy`]} />
                                <Legend />
                            </RadialBarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                {/* Donut: nguyên nhân lỗi */}
                <Col xs={24} md={12}>
                    <Card
                        size="small"
                        title={
                            <Space>
                                <CloseCircleOutlined style={{ color: '#EF4444' }} />
                                <span>Cơ cấu Nguyên nhân Lỗi</span>
                            </Space>
                        }
                    >
                        {pieData.length === 0 ? (
                            <Empty description="Chưa có dữ liệu nguyên nhân" className="py-6" />
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                        nameKey="name"
                                    >
                                        {pieData.map((entry, i) => (
                                            <Cell key={i} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <RTooltip formatter={(v: number | string | undefined) => [`${v ?? 0} máy`]} />
                                    <Legend iconSize={10} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

// ------- Main Page -------
const WarrantyDashboardPage: React.FC = () => {
    const [selectedImport, setSelectedImport] = useState<{ id: string; code: string } | null>(null);

    const { data: importData, isLoading, refetch } = useQuery({
        queryKey: ['imports-for-warranty'],
        queryFn: () => importService.getImports({ limit: 50, sortBy: 'createdAt:desc' }),
    });

    const imports: any[] = importData?.data ?? [];

    const columns = [
        {
            title: 'Mã Lô nhập',
            dataIndex: 'code',
            key: 'code',
            render: (code: string) => <Text code className="font-mono">{code}</Text>,
        },
        {
            title: 'Ngày nhập',
            dataIndex: 'importDate',
            key: 'importDate',
            render: (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—',
        },
        {
            title: 'Nhà cung cấp',
            dataIndex: 'supplier',
            key: 'supplier',
            render: (s: string) => s || <Text type="secondary">—</Text>,
        },
        {
            title: 'Người tạo',
            dataIndex: 'createdBy',
            key: 'createdBy',
            render: (u: any) => u?.name ?? u?.username ?? '—',
        },
        {
            title: '',
            key: 'action',
            width: 120,
            render: (_: any, record: any) => (
                <Button
                    size="small"
                    icon={<BarChartOutlined />}
                    type={selectedImport?.id === record.id ? 'primary' : 'default'}
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImport(
                            selectedImport?.id === record.id
                                ? null
                                : { id: record.id, code: record.code }
                        );
                    }}
                >
                    Thống kê
                </Button>
            ),
        },
    ];

    return (
        <div className="p-4 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Title level={2} className="mb-0 flex items-center gap-2">
                        <SwapOutlined style={{ color: '#EF4444' }} />
                        Dashboard Bảo hành & Tỷ lệ Lỗi
                    </Title>
                    <Text type="secondary">Thống kê theo Lô nhập – Chọn một Lô để xem chi tiết</Text>
                </div>
                <Tooltip title="Làm mới danh sách">
                    <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isLoading}>
                        Làm mới
                    </Button>
                </Tooltip>
            </div>

            <Card className="mb-4" bodyStyle={{ padding: 0 }}>
                <Table
                    dataSource={imports}
                    columns={columns}
                    rowKey="id"
                    loading={isLoading}
                    pagination={{ pageSize: 10, showSizeChanger: false }}
                    size="middle"
                    rowClassName={(record) =>
                        selectedImport?.id === record.id
                            ? 'bg-blue-50 border-l-4 border-blue-500'
                            : 'cursor-pointer hover:bg-gray-50'
                    }
                    onRow={(record) => ({
                        onClick: () =>
                            setSelectedImport(
                                selectedImport?.id === record.id
                                    ? null
                                    : { id: record.id, code: record.code }
                            ),
                    })}
                    locale={{ emptyText: 'Chưa có phiếu nhập nào' }}
                />
            </Card>

            {/* Panel chi tiết */}
            {selectedImport && (
                <ImportDetailPanel
                    importId={selectedImport.id}
                    importCode={selectedImport.code}
                />
            )}
        </div>
    );
};

export default WarrantyDashboardPage;
