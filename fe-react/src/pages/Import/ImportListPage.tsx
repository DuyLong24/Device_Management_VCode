import { useState, useEffect } from 'react';
import {
    Card,
    Button,
    Space,
    Table,
    Tag,
    Input,
    DatePicker,
    Select,
    Form,
    Row,
    Col,
    Tooltip,
    Empty,
    Spin,
    Typography,
    Statistic,
    message,
} from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    EyeOutlined,
    FileExcelOutlined,
    InfoCircleOutlined,
    ReloadOutlined,
    FileTextOutlined,
    ClockCircleOutlined,
    SyncOutlined,
    CheckCircleOutlined,
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import { importService } from '../../services/import.service';
import type { DeviceImport, ImportProduct } from '../../types/import.type';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

interface ProductItem {
    key: string;
    productCode: string;
    productName: string;
    quantity: number;
    packaging: string;
    boxCount?: number;
    itemsPerBox?: number;
    serialImported: number;
    serialExpected: number;
    serialStatus: 'complete' | 'missing' | 'excess';
}

interface ImportRecord {
    key: string;
    importCode: string;
    productType: string;
    importDate: string;
    importedBy: string;
    supplier: string;
    handoverPerson: string;
    totalProductCodes: number;
    totalQuantity: number;
    serialImported: number;
    serialExpected: number;
    inventoryStatus: 'pending' | 'in-progress' | 'completed';
    origin?: string;
    notes?: string;
    products: ProductItem[];
}

export default function ImportListPage() {
    const navigate = useNavigate();
    const [form] = Form.useForm();

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ImportRecord[]>([]);
    const [filteredData, setFilteredData] = useState<ImportRecord[]>([]);

    const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

    const mapApiToUi = (apiData: DeviceImport[]): ImportRecord[] => {
        return apiData.map((item) => {
            const products: ProductItem[] = item.products.map((prod: ImportProduct, index) => {
                const serialImported = prod.serialImported || 0;
                const serialExpected = prod.quantity || 0;

                let serialStatus: 'complete' | 'missing' | 'excess' = 'complete';
                if (serialImported < serialExpected) serialStatus = 'missing';
                if (serialImported > serialExpected) serialStatus = 'excess';

                return {
                    key: prod._id || `${item.id}-${index}`,
                    productCode: prod.productCode,
                    productName: prod.productCode,
                    quantity: prod.quantity,
                    packaging: `${prod.boxCount || 0} hộp × ${prod.itemsPerBox || 0} sp/hộp`,
                    boxCount: prod.boxCount,
                    itemsPerBox: prod.itemsPerBox,
                    serialImported,
                    serialExpected,
                    serialStatus,
                };
            });

            return {
                key: item.id,
                importCode: item.code,
                productType: item.productType || 'Khác',
                importDate: item.importDate,
                importedBy: item.importedBy,
                supplier: item.supplier,
                handoverPerson: item.handoverPerson || '---',
                totalProductCodes: item.totalItem,
                totalQuantity: item.totalQuantity,
                serialImported: item.serialImported,
                serialExpected: item.totalQuantity,
                inventoryStatus: item.inventoryStatus || 'pending',
                origin: (item as any).origin || 'IMPORT',
                notes: item.notes,
                products,
            };
        });
    };

    // --- 2. Fetch Data ---
    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await importService.getImports({});
            if (res && res.data) {
                const uiData = mapApiToUi(res.data);
                setData(uiData);
                setFilteredData(uiData);
            }
        } catch (error) {
            console.error(error);
            message.error('Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- 3. Filter Logic ---
    const handleRealtimeFilter = () => {
        const values = form.getFieldsValue();
        let filtered = [...data];

        if (values.keyword) {
            const keyword = values.keyword.toLowerCase();
            filtered = filtered.filter((item) => {
                const matchBasic =
                    item.importCode.toLowerCase().includes(keyword) ||
                    item.supplier.toLowerCase().includes(keyword) ||
                    item.importedBy.toLowerCase().includes(keyword) ||
                    item.handoverPerson.toLowerCase().includes(keyword);
                const matchProduct = item.products.some((p) =>
                    p.productCode.toLowerCase().includes(keyword)
                );
                return matchBasic || matchProduct;
            });
        }

        if (values.dateRange && values.dateRange.length === 2) {
            filtered = filtered.filter((item) => {
                const itemDate = dayjs(item.importDate);
                return (
                    itemDate.isAfter(values.dateRange[0].startOf('day')) &&
                    itemDate.isBefore(values.dateRange[1].endOf('day'))
                );
            });
        }

        if (values.inventoryStatus) {
            filtered = filtered.filter((item) => item.inventoryStatus === values.inventoryStatus);
        }

        setFilteredData(filtered);
    };

    const handleFieldChange = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        const timer = setTimeout(() => {
            handleRealtimeFilter();
        }, 300);
        setDebounceTimer(timer);
    };

    const handleReset = () => {
        form.resetFields();
        setFilteredData(data);
    };

    useEffect(() => {
        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
        };
    }, [debounceTimer]);

    // --- 4. Render Helpers ---
    const getOriginConfig = (origin?: string) => {
        const map: Record<string, { color: string; text: string }> = {
            DOMESTIC: { color: 'green', text: 'Nội địa' },
            IMPORT: { color: 'blue', text: 'Nhập khẩu' },
            WARRANTY_RETURN: { color: 'orange', text: 'Trả bảo hành' },
        };
        return map[origin || ''] || { color: 'default', text: origin || 'Khác' };
    };

    const getInventoryStatusConfig = (status: string) => {
        const configs = {
            pending: { color: 'default', text: 'Chưa kiểm kê' },
            'in-progress': { color: 'processing', text: 'Đang kiểm kê' },
            completed: { color: 'success', text: 'Đã kiểm kê' },
        };
        return configs[status as keyof typeof configs] || configs.pending;
    };

    const handleViewDetail = (importCode: string) => {
        console.log('View detail:', importCode);
        navigate(`/import/${importCode}`);
    };

    // --- 5. Columns ---
    const columns: TableColumnsType<ImportRecord> = [
        {
            title: 'Mã phiếu nhập',
            dataIndex: 'importCode',
            key: 'importCode',
            width: 150,
            fixed: 'left',
            render: (text, record) => (
                <Button type="link" onClick={() => handleViewDetail(record.key)} style={{ padding: 0 }}>
                    {text}
                </Button>
            ),
        },
        {
            title: 'Loại hàng hóa',
            dataIndex: 'productType',
            key: 'productType',
            width: 130,
            render: (text) => <Tag color="blue">{text}</Tag>,
        },
        {
            title: 'Nguồn gốc',
            dataIndex: 'origin',
            key: 'origin',
            width: 130,
            render: (origin) => {
                const config = getOriginConfig(origin);
                return <Tag color={config.color}>{config.text}</Tag>;
            },
        },
        {
            title: 'Ngày nhập',
            dataIndex: 'importDate',
            key: 'importDate',
            width: 120,
            sorter: (a, b) => dayjs(a.importDate).unix() - dayjs(b.importDate).unix(),
            render: (text) => dayjs(text).format('DD/MM/YYYY'),
        },
        {
            title: 'Người nhập kho',
            dataIndex: 'importedBy',
            key: 'importedBy',
            width: 150,
        },
        {
            title: 'Đơn vị xuất',
            dataIndex: 'supplier',
            key: 'supplier',
            width: 200,
        },
        {
            title: 'Tổng SP',
            dataIndex: 'totalQuantity',
            key: 'totalQuantity',
            width: 100,
            align: 'center',
            render: (value) => <Tag color="blue" style={{ fontSize: 14, fontWeight: 500 }}>{value}</Tag>,
        },
        {
            title: 'Trạng thái kiểm kê',
            dataIndex: 'inventoryStatus',
            key: 'inventoryStatus',
            width: 150,
            align: 'center',
            render: (status) => {
                const config = getInventoryStatusConfig(status);
                return <Tag color={config.color}>{config.text}</Tag>;
            },
        },
        {
            title: 'Ghi chú',
            dataIndex: 'notes',
            key: 'notes',
            width: 80,
            align: 'center',
            render: (notes) =>
                notes ? (
                    <Tooltip title={notes}>
                        <InfoCircleOutlined style={{ fontSize: 16, color: '#1890ff', cursor: 'pointer' }} />
                    </Tooltip>
                ) : (
                    <Text type="secondary">—</Text>
                ),
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 180,
            fixed: 'right',
            align: 'center',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="primary"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetail(record.key)}
                    >
                        Chi tiết
                    </Button>
                    <Button
                        size="small"
                        icon={<FileExcelOutlined />}
                        onClick={() => console.log('Export serial:', record.importCode)}
                    >
                        Xuất
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ minHeight: '100%', padding: 24 }}>
            {/* Page Header */}
            <div
                style={{
                    marginBottom: 24,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <Title level={3} style={{ margin: 0 }}>
                    Danh sách phiếu nhập kho
                </Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={() => navigate('/import/create')}
                >
                    Thêm mới phiếu nhập
                </Button>
            </div>

            {/* Summary Cards */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col xs={12} sm={12} md={6}>
                    <Card bordered={false} hoverable>
                        <Statistic
                            title="Tổng phiếu nhập"
                            value={data.length}
                            prefix={<FileTextOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={12} md={6}>
                    <Card bordered={false} hoverable>
                        <Statistic
                            title="Chờ kiểm kê"
                            value={data.filter((item) => item.inventoryStatus === 'pending').length}
                            prefix={<ClockCircleOutlined />}
                            valueStyle={{ color: '#8c8c8c' }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={12} md={6}>
                    <Card bordered={false} hoverable>
                        <Statistic
                            title="Đang kiểm kê"
                            value={data.filter((item) => item.inventoryStatus === 'in-progress').length}
                            prefix={<SyncOutlined spin />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={12} md={6}>
                    <Card bordered={false} hoverable>
                        <Statistic
                            title="Đã kiểm kê"
                            value={data.filter((item) => item.inventoryStatus === 'completed').length}
                            prefix={<CheckCircleOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Filter Bar */}
            <Card style={{ marginBottom: 16 }} bordered={false}>
                <Form form={form} onValuesChange={handleFieldChange}>
                    <Row gutter={16} align="middle">
                        <Col xs={24} sm={24} md={8} lg={8}>
                            <Form.Item name="keyword" style={{ marginBottom: 0 }}>
                                <Input
                                    placeholder="Tìm mã phiếu, NCC, người nhập..."
                                    prefix={<SearchOutlined />}
                                    allowClear
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6} lg={6}>
                            <Form.Item name="dateRange" style={{ marginBottom: 0 }}>
                                <RangePicker
                                    style={{ width: '100%' }}
                                    format="DD/MM/YYYY"
                                    placeholder={['Từ ngày', 'Đến ngày']}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6} lg={6}>
                            <Form.Item name="inventoryStatus" style={{ marginBottom: 0 }}>
                                <Select placeholder="Trạng thái kiểm kê" allowClear>
                                    <Select.Option value="pending">Chưa kiểm kê</Select.Option>
                                    <Select.Option value="in-progress">Đang kiểm kê</Select.Option>
                                    <Select.Option value="completed">Đã kiểm kê</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={24} md={4} lg={4}>
                            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                                <Tooltip title="Tải lại dữ liệu">
                                    <Button icon={<ReloadOutlined />} onClick={() => { fetchData(); handleReset(); }} />
                                </Tooltip>
                            </Space>
                        </Col>
                    </Row>
                </Form>
            </Card>

            {/* Table */}
            <Card bordered={false} bodyStyle={{ padding: 0 }}>
                {loading && data.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 0' }}>
                        <Spin size="large" tip="Đang tải dữ liệu..." />
                    </div>
                ) : filteredData.length === 0 ? (
                    <Empty
                        description="Không tìm thấy phiếu nhập nào"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        style={{ padding: 40 }}
                    >
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => navigate('/import/create')}
                        >
                            Tạo phiếu nhập ngay
                        </Button>
                    </Empty>
                ) : (
                    <Table
                        columns={columns}
                        dataSource={filteredData}
                        scroll={{ x: 1300 }}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `Tổng ${total} phiếu nhập`,
                            pageSizeOptions: ['10', '20', '50'],
                        }}
                        size="middle"
                    />
                )}
            </Card>
        </div>
    );
}