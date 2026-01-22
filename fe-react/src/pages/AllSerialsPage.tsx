import {
    Card,
    Table,
    Button,
    Input,
    Space,
    Tag,
    Typography,
    Row,
    Col,
    Statistic,
    Select,
    DatePicker,
} from 'antd';
import {
    SearchOutlined,
    FilterOutlined,
    DownloadOutlined,
    ReloadOutlined,
    EyeOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import { useAllSerials } from '../hooks/useAllSerials';
import type { SerialUI } from '../hooks/useAllSerials';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function AllSerialsPage() {
    const navigate = useNavigate();

    // Gọi Hook
    const {
        loading,
        dataSource,
        paginationConfig, // Cấu hình phân trang server
        handleTableChange, // Hàm xử lý đổi trang

        stats,
        warehouseOptions,
        searchText, setSearchText,
        selectedWarehouses, setSelectedWarehouses,
        dateRange, setDateRange,
        handleReset,
        handleExport
    } = useAllSerials();

    const columns: ColumnsType<SerialUI> = [
        {
            title: 'MAC Address',
            dataIndex: 'mac',
            key: 'mac',
            fixed: 'left',
            width: 200, // Fixed width to prevent overlap
            render: (text) => (
                <Button
                    type="link"
                    className="p-0 font-mono text-blue-600 font-semibold"
                    onClick={() => navigate(`/serial/${text}`)}
                >
                    {text}
                </Button>
            ),
        },
        {
            title: 'Mã Model',
            dataIndex: 'productCode',
            key: 'productCode',
            width: 150,
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Tên thiết bị',
            dataIndex: 'productName',
            key: 'productName',
            width: 250,
            ellipsis: true,
        },
        {
            title: 'Trạng thái / Kho',
            dataIndex: 'warehouseName',
            key: 'warehouseName',
            width: 200,
            render: (text, record) => (
                <Tag color={record.warehouseColor} className="px-2 py-0.5 rounded text-xs font-medium border-0">
                    {text}
                </Tag>
            ),
        },
        {
            title: 'Ngày nhập',
            // dataIndex: 'importDate',
            key: 'importDate',
            width: 150,
            render: (_, record) => {
                const dateVal = record.importDate || record.createdAt;

                if (!dateVal) return <span className="text-gray-400">--</span>;

                const d = dayjs(dateVal);
                return d.isValid()
                    ? <span className="text-gray-500">{d.format('DD/MM/YYYY')}</span>
                    : <span className="text-gray-400">--</span>;
            },
        },
        {
            title: 'Thao tác',
            key: 'action',
            fixed: 'right',
            width: 120,
            align: 'center',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="text"
                        icon={<EyeOutlined />}
                        size="small"
                        title="Xem chi tiết"
                        onClick={() => navigate(`/serial/${record.mac}`)}
                    />
                </Space>
            ),
        },
    ];

    return (
        <div className="p-6 max-w-400 mx-auto">
            {/* <div className="mb-8 p-4 bg-gray-100 border border-red-500 rounded text-xs font-mono overflow-auto max-h-60">
                <h3 className="text-red-600 font-bold text-lg"> DEBUG </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <strong>1. Dữ liệu DEVICE đầu tiên từ API:</strong>
                        <pre>{JSON.stringify(debugData?.devicesRaw, null, 2)}</pre>
                    </div>
                    <div>
                        <strong>2. Danh sách WAREHOUSE từ API:</strong>
                        <pre>{JSON.stringify(debugData?.warehousesRaw, null, 2)}</pre>
                    </div>
                </div>
            </div> */}
            {/* Header */}
            <div className="mb-6">
                <Title level={3} className="mb-1!">📊 Danh sách tổng</Title>
                <Text type="secondary">Quản lý toàn bộ thiết bị (Device) trong hệ thống</Text>
            </div>

            {/* Statistics Grid */}
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

            {/* Filter Bar */}
            <Card size="small" className="mb-4 shadow-sm border-gray-200">
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={6}>
                        <Input
                            placeholder="Tìm MAC, model, tên..."
                            prefix={<SearchOutlined className="text-gray-400" />}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            allowClear
                        />
                    </Col>
                    <Col xs={24} md={6}>
                        <Select
                            mode="multiple"
                            placeholder="Lọc theo trạng thái"
                            className="w-full"
                            value={selectedWarehouses}
                            onChange={setSelectedWarehouses}
                            options={warehouseOptions}
                            maxTagCount="responsive"
                            allowClear
                        />
                    </Col>
                    <Col xs={24} md={6}>
                        <RangePicker
                            placeholder={['Từ ngày', 'Đến ngày']}
                            className="w-full"
                            value={dateRange}
                            onChange={setDateRange}
                            format="DD/MM/YYYY"
                        />
                    </Col>
                    <Col xs={24} md={6} className="flex justify-end gap-2">
                        <Button icon={<FilterOutlined />} onClick={handleReset}>
                            Reset
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
                            Tải lại
                        </Button>
                    </Col>
                </Row>
            </Card>

            {/* Main Table */}
            <Card className="shadow-sm border-gray-200" styles={{ body: { padding: 0 } }}>
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <Text strong>
                        {/* Hiển thị Total Results từ Server */}
                        Kết quả: <span className="text-blue-600">{paginationConfig.total}</span> thiết bị
                    </Text>
                    <Button icon={<DownloadOutlined />} onClick={handleExport}>
                        Xuất Excel
                    </Button>
                </div>

                <Table
                    columns={columns}
                    dataSource={dataSource}
                    rowKey="key"
                    scroll={{ x: 1000 }}
                    loading={loading}

                    pagination={paginationConfig}
                    onChange={handleTableChange}

                    size="middle"
                />
            </Card>
        </div>
    );
}