import { Card, Button, Space, Form, Input, Select, InputNumber, Table, Tag, Typography, Row, Col, Tooltip, Divider } from 'antd';
import { SaveOutlined, CloseOutlined, PlusOutlined, DeleteOutlined, InfoCircleOutlined, WarningOutlined, SendOutlined } from '@ant-design/icons';

import { useCreateExport } from '../../hooks/useCreateExport';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function CreateExportPage() {
    const {
        form,
        loading,
        productList,
        autoExportCode,
        handleAddProduct,
        handleDeleteProduct,
        handleProductChange,
        getProductStock,
        handleSaveDraft,
        handleSaveAndSubmit,
        handleCancel,
        setHasUnsavedChanges,
        mockProductCodes,
        mockProjects,
        mockCustomers,
    } = useCreateExport();

    // Cột bảng sản phẩm
    const productColumns = [
        {
            title: (
                <span>
                    <Text type="danger">*</Text> Mã sản phẩm
                </span>
            ),
            dataIndex: 'productCode',
            key: 'productCode',
            width: 280,
            render: (value: string, record: any) => {
                const inStock = value ? getProductStock(value) : 0;
                return (
                    <Space direction="vertical" style={{ width: '100%' }} size={4}>
                        <Select
                            showSearch
                            value={value || undefined}
                            placeholder="Chọn mã sản phẩm"
                            style={{ width: '100%' }}
                            options={mockProductCodes}
                            onChange={(val) => handleProductChange(record.key, 'productCode', val)}
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                        {value && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Tồn kho:{' '}
                                <Text strong style={{ color: inStock > 0 ? '#52c41a' : '#ff4d4f' }}>
                                    {inStock}
                                </Text>
                            </Text>
                        )}
                    </Space>
                );
            },
        },
        {
            title: 'Tên sản phẩm',
            dataIndex: 'productName',
            key: 'productName',
            render: (value: string) => value || <Text type="secondary">-</Text>,
        },
        {
            title: (
                <span>
                    <Text type="danger">*</Text> Số lượng
                </span>
            ),
            dataIndex: 'quantity',
            key: 'quantity',
            width: 130,
            render: (value: number, record: any) => {
                const inStock = record.productCode ? getProductStock(record.productCode) : 0;
                const isExceed = value > inStock;
                return (
                    <Space direction="vertical" style={{ width: '100%' }} size={4}>
                        <InputNumber
                            min={1}
                            max={inStock}
                            value={value}
                            style={{ width: '100%' }}
                            onChange={(val) => handleProductChange(record.key, 'quantity', val || 1)}
                            placeholder="SL"
                            status={isExceed ? 'error' : undefined}
                        />
                        {isExceed && (
                            <Text type="danger" style={{ fontSize: 12 }}>
                                <WarningOutlined /> Vượt tồn kho!
                            </Text>
                        )}
                    </Space>
                );
            },
        },
        {
            title: 'Serial đã chọn',
            key: 'serial',
            width: 130,
            align: 'center' as const,
            render: () => (
                <Space direction="vertical" size={0}>
                    <Text strong>0 / 0</Text>
                    <Tag color="default">Chưa chọn</Tag>
                </Space>
            ),
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 80,
            align: 'center' as const,
            render: (_: any, record: any) => (
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteProduct(record.key)} />
            ),
        },
    ];

    return (
        <div className="p-6 max-w-full mx-auto">
            {/* Page Header */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            Thêm mới phiếu xuất kho
                        </Title>
                        <Text type="secondary">Tạo mới phiếu xuất kho và danh sách sản phẩm đi kèm</Text>
                    </div>
                    <Space>
                        <Button icon={<SaveOutlined />} onClick={handleSaveDraft} loading={loading}>
                            Lưu nháp
                        </Button>
                        <Button type="primary" icon={<SendOutlined />} onClick={handleSaveAndSubmit} loading={loading}>
                            Lưu & gửi duyệt
                        </Button>
                        <Button danger icon={<CloseOutlined />} onClick={handleCancel}>
                            Hủy
                        </Button>
                    </Space>
                </div>
            </div>

            {/* Form */}
            <Form form={form} layout="vertical" onValuesChange={setHasUnsavedChanges}>
                {/* Card A - Thông tin chung */}
                <Card title="Thông tin chung phiếu xuất" style={{ marginBottom: 24 }}>
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                label={
                                    <span>
                                        Mã phiếu xuất{' '}
                                        <Tooltip title="Mã tự sinh theo đợt xuất kho">
                                            <InfoCircleOutlined style={{ color: '#999' }} />
                                        </Tooltip>
                                    </span>
                                }
                            >
                                <Input value={autoExportCode} disabled style={{ fontWeight: 600, color: '#1677ff' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="type"
                                label="Loại hàng hóa xuất kho"
                                rules={[{ required: true, message: 'Vui lòng chọn loại hàng hóa' }]}
                            >
                                <Select placeholder="Chọn loại hàng hóa">
                                    <Select.Option value="Camera">Camera</Select.Option>
                                    <Select.Option value="Màn hình">Màn hình</Select.Option>
                                    <Select.Option value="Barrier">Barrier</Select.Option>
                                    <Select.Option value="NVR">NVR</Select.Option>
                                    <Select.Option value="Khác">Khác</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="exportReason"
                                label="Lý do xuất kho"
                                rules={[{ required: true, message: 'Vui lòng chọn lý do' }]}
                                initialValue="SALE"
                            >
                                <Select placeholder="Chọn lý do xuất kho">
                                    <Select.Option value="SALE">Bán hàng</Select.Option>
                                    <Select.Option value="WARRANTY">Bảo hành</Select.Option>
                                    <Select.Option value="TRANSFER">Điều chuyển</Select.Option>
                                    <Select.Option value="OTHER">Khác</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="exportName"
                                label="Tên phiếu xuất"
                                rules={[{ required: true, message: 'Vui lòng nhập tên phiếu' }]}
                            >
                                <Input placeholder="Ví dụ: Xuất bán hàng cho Đại lý A" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="receiver"
                                label="Đơn vị nhận"
                                rules={[{ required: true, message: 'Vui lòng nhập đơn vị nhận' }]}
                            >
                                <Input placeholder="Công ty / Phòng ban nhận" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="receiverPerson" label="Người nhận">
                                <Input placeholder="Tên người nhận hàng" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="project"
                                label="Dự án"
                                rules={[{ required: true, message: 'Vui lòng chọn dự án' }]}
                            >
                                <Select placeholder="Chọn dự án" options={mockProjects} showSearch allowClear />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="customer"
                                label="Khách hàng"
                                rules={[{ required: true, message: 'Vui lòng chọn khách hàng' }]}
                            >
                                <Select placeholder="Chọn khách hàng" options={mockCustomers} showSearch allowClear />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row>
                        <Col span={24}>
                            <Form.Item
                                name="deliveryAddress"
                                label="Địa chỉ giao hàng"
                                rules={[{ required: true, message: 'Vui lòng nhập địa chỉ' }]}
                            >
                                <Input placeholder="Nhập địa chỉ giao hàng" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row>
                        <Col span={24}>
                            <Form.Item name="notes" label="Ghi chú">
                                <TextArea rows={3} placeholder="Nhập ghi chú (nếu có)" maxLength={500} showCount />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                {/* Card B - Danh sách sản phẩm */}
                <Card
                    title={
                        <span>
                            Danh sách mã sản phẩm xuất kho{' '}
                            <Text type="secondary" style={{ fontSize: 14, fontWeight: 'normal' }}>
                                ({productList.length} sản phẩm)
                            </Text>
                        </span>
                    }
                    extra={
                        <Button type="default" icon={<PlusOutlined />} onClick={handleAddProduct}>
                            Thêm sản phẩm
                        </Button>
                    }
                >
                    {productList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <Text type="secondary">Chưa có sản phẩm nào</Text>
                            <br />
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddProduct} style={{ marginTop: 16 }}>
                                Thêm sản phẩm đầu tiên
                            </Button>
                        </div>
                    ) : (
                        <>
                            <Table
                                columns={productColumns}
                                dataSource={productList}
                                pagination={false}
                                bordered
                                size="middle"
                                scroll={{ x: 800 }}
                            />
                            <Divider />
                            <div style={{ textAlign: 'right' }}>
                                <Space size="large">
                                    <Text strong>
                                        Tổng mã SP:{' '}
                                        <Text type="success" style={{ fontSize: 18 }}>
                                            {productList.length}
                                        </Text>
                                    </Text>
                                    <Text strong>
                                        Tổng số lượng:{' '}
                                        <Text type="success" style={{ fontSize: 18 }}>
                                            {productList.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                                        </Text>
                                    </Text>
                                    <Text strong>
                                        Serial đã chọn:{' '}
                                        <Text type="warning" style={{ fontSize: 18 }}>
                                            0 / {productList.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                                        </Text>
                                    </Text>
                                </Space>
                            </div>
                        </>
                    )}
                </Card>
            </Form>

            {/* Fixed bottom action bar */}
            <div
                style={{
                    position: 'sticky',
                    bottom: 0,
                    background: '#fff',
                    padding: '16px 0',
                    marginTop: 24,
                    borderTop: '1px solid #f0f0f0',
                    zIndex: 10,
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button icon={<SaveOutlined />} onClick={handleSaveDraft} loading={loading} size="large">
                        Lưu nháp
                    </Button>
                    <Button type="primary" icon={<SendOutlined />} onClick={handleSaveAndSubmit} loading={loading} size="large">
                        Lưu & gửi duyệt
                    </Button>
                    <Button danger icon={<CloseOutlined />} onClick={handleCancel} size="large">
                        Hủy
                    </Button>
                </div>
            </div>
        </div>
    );
}
