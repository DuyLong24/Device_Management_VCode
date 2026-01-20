import { Card, Button, Space, Form, Input, Select, InputNumber, Table, Typography, Row, Col, Tooltip, Divider, Modal, Tabs } from 'antd';
import { SaveOutlined, CloseOutlined, PlusOutlined, DeleteOutlined, InfoCircleOutlined, WarningOutlined, SendOutlined, UploadOutlined } from '@ant-design/icons';

import { useCreateExport, type SerialValidationResult } from '../../hooks/useCreateExport';
import { parseExcelSerials } from '../../utils/excel.utils';
const { Title, Text } = Typography;
const { TextArea } = Input;

export default function CreateExportPage() {
    const {
        form,
        loading,
        deviceList,
        autoExportCode,
        deviceOptions,
        categoryOptions,
        loadingDevices,
        loadingCategories,
        handleAddDevice,
        handleDeleteDevice,
        handleDeviceChange,
        getDeviceStock,
        openSerialModal,
        handleSaveSerials,
        handleSaveDraft,
        handleSaveAndSubmit,
        handleCancel,
        setHasUnsavedChanges,

        // Serial modal states
        isSerialModalOpen,
        setIsSerialModalOpen,
        tempSerials,
        setTempSerials,
        activeTab,
        setActiveTab,
        validatingSerials,
        saveValidSerials,
    } = useCreateExport();

    // Use Modal hook để hiển thị error modal
    const [modal, contextHolder] = Modal.useModal();

    const handleValidationError = (validation: SerialValidationResult, uniqueSerials: string[]) => {
        modal.error({
            title: 'Phát hiện serial không hợp lệ',
            width: 700,
            content: (
                <div>
                    <p className="mb-3 text-sm">
                        Có <strong className="text-red-500">{validation.invalidSerials.length}</strong> serial không hợp lệ
                        trên tổng <strong>{uniqueSerials.length}</strong> serial.
                    </p>
                    <div className="max-h-[300px] overflow-auto border border-gray-200 rounded p-3">
                        {validation.errors.map((err, idx) => (
                            <div key={idx} className={`py-2 ${idx < validation.errors.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                <Text strong className="text-red-500">{err.serial}</Text>
                                <br />
                                <Text type="secondary" className="text-xs">{err.message}</Text>
                            </div>
                        ))}
                    </div>
                    {validation.validSerials.length > 0 && (
                        <p className="mt-4 mb-0">
                            Bạn có muốn chỉ lưu <strong className="text-green-500">{validation.validSerials.length}</strong> serial hợp lệ không?
                        </p>
                    )}
                </div>
            ),
            okText: validation.validSerials.length > 0 ? `Lưu ${validation.validSerials.length} serial hợp lệ` : 'Đóng',
            cancelText: 'Quay lại sửa',
            okButtonProps: { danger: validation.validSerials.length === 0 },
            onOk: () => {
                if (validation.validSerials.length > 0) {
                    saveValidSerials(validation.validSerials);
                }
            }
        });
    };

    // Cột bảng thiết bị
    const deviceColumns = [
        {
            title: (
                <span>
                    <Text type="danger">*</Text> Mã thiết bị
                </span>
            ),
            dataIndex: 'deviceModel',
            key: 'deviceModel',
            width: 280,
            render: (value: string, record: any) => {
                const inStock = value ? getDeviceStock(value) : 0;
                return (
                    <Space direction="vertical" className="w-full" size={4}>
                        <Select
                            showSearch
                            value={value || undefined}
                            placeholder="Chọn mã thiết bị"
                            className="w-full"
                            options={deviceOptions}
                            loading={loadingDevices}
                            onChange={(val) => handleDeviceChange(record.key, 'deviceModel', val)}
                            allowClear
                            filterOption={(input, option) =>
                                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                        {value && (
                            <Text type="secondary" className="text-xs">
                                Tồn kho:{' '}
                                <Text strong className={inStock > 0 ? "text-green-500" : "text-red-500"}>
                                    {inStock}
                                </Text>
                            </Text>
                        )}
                    </Space>
                );
            },
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
                const inStock = record.deviceModel ? getDeviceStock(record.deviceModel) : 0;
                const isExceed = value > inStock;
                return (
                    <Space direction="vertical" className="w-full" size={4}>
                        <InputNumber
                            min={1}
                            max={inStock}
                            value={value}
                            className="w-full"
                            onChange={(val) => handleDeviceChange(record.key, 'quantity', val || 1)}
                            placeholder="SL"
                            status={isExceed ? 'error' : undefined}
                        />
                        {isExceed && (
                            <Text type="danger" className="text-xs">
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
            render: (_: any, record: any) => {
                const count = record.expectedSerials?.length || 0;
                const required = record.quantity || 0;
                const isMatch = count === required;
                const isEmpty = count === 0;

                return (
                    <Space direction="vertical" size={4} className="w-full">
                        <Button
                            type={isEmpty ? 'dashed' : 'default'}
                            size="small"
                            onClick={() => openSerialModal(record)}
                            disabled={!record.deviceModel}
                            block
                        >
                            {isEmpty ? 'Nhập Serial' : `${count} serial`}
                        </Button>
                        {!isEmpty && (
                            <Text
                                type={isMatch ? 'success' : 'danger'}
                                className="text-[11px] block text-center"
                            >
                                {count}/{required} {isMatch ? '✓' : '⚠'}
                            </Text>
                        )}
                    </Space>
                );
            },
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 80,
            align: 'center' as const,
            render: (_: any, record: any) => (
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteDevice(record.key)} />
            ),
        },
    ];

    return (
        <div className="p-6 max-w-full mx-auto">
            {contextHolder}
            {/* Page Header */}
            <div className="mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <Title level={3} className="!m-0">
                            Thêm mới phiếu xuất kho
                        </Title>
                        <Text type="secondary">Tạo mới phiếu xuất kho và danh sách thiết bị đi kèm</Text>
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
                                <Select
                                    placeholder="Chọn loại hàng hóa"
                                    loading={loadingCategories}
                                    showSearch
                                    options={categoryOptions.length > 0 ? categoryOptions : [
                                        { value: 'Camera', label: 'Camera' },
                                        { value: 'Màn hình', label: 'Màn hình' },
                                        { value: 'Barrier', label: 'Barrier' },
                                        { value: 'NVR', label: 'NVR' },
                                        { value: 'Khác', label: 'Khác' },
                                    ]}
                                />
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
                            >
                                <Input placeholder="Nhập tên dự án (nếu có)" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="customer"
                                label="Khách hàng"
                            >
                                <Input placeholder="Nhập tên khách hàng (nếu có)" />
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

                {/* Card B - Danh sách thiết bị */}
                <Card
                    title={
                        <span>
                            Danh sách mã thiết bị xuất kho{' '}
                            <Text type="secondary" style={{ fontSize: 14, fontWeight: 'normal' }}>
                                ({deviceList.length} thiết bị)
                            </Text>
                        </span>
                    }
                    extra={
                        <Button type="default" icon={<PlusOutlined />} onClick={handleAddDevice}>
                            Thêm thiết bị
                        </Button>
                    }
                >
                    {deviceList.length === 0 ? (
                        <div className="text-center py-10">
                            <Text type="secondary">Chưa có thiết bị nào</Text>
                            <br />
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddDevice} className="mt-4">
                                Thêm thiết bị đầu tiên
                            </Button>
                        </div>
                    ) : (
                        <>
                            <Table
                                columns={deviceColumns}
                                dataSource={deviceList}
                                pagination={false}
                                bordered
                                size="middle"
                                scroll={{ x: 800 }}
                            />
                            <Divider />
                            <div className="text-right">
                                <Space size="large">
                                    <Text strong>
                                        Tổng mã SP:{' '}
                                        <Text type="success" className="text-lg">
                                            {deviceList.length}
                                        </Text>
                                    </Text>
                                    <Text strong>
                                        Tổng số lượng:{' '}
                                        <Text type="success" className="text-lg">
                                            {deviceList.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                                        </Text>
                                    </Text>
                                    <Text strong>
                                        Serial đã chọn:{' '}
                                        <Text type="warning" className="text-lg">
                                            0 / {deviceList.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                                        </Text>
                                    </Text>
                                </Space>
                            </div>
                        </>
                    )}
                </Card>
            </Form>

            <div className="sticky bottom-0 bg-white py-4 mt-6 border-t border-gray-200 z-10">
                <div className="flex justify-end gap-2">
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

            {/* Serial Input Modal */}
            <Modal
                title="Nhập danh sách Serial"
                open={isSerialModalOpen}
                onOk={() => handleSaveSerials(handleValidationError)}
                onCancel={() => setIsSerialModalOpen(false)}
                width={700}
                okText="Lưu Serial"
                cancelText="Hủy"
                confirmLoading={validatingSerials}
            >
                <Tabs activeKey={activeTab} onChange={setActiveTab}>
                    <Tabs.TabPane tab="Nhập thủ công" key="manual">
                        <div>
                            <p className="mb-2 text-gray-600">
                                Nhập mỗi serial trên một dòng:
                            </p>
                            <Input.TextArea
                                rows={12}
                                value={tempSerials}
                                onChange={(e) => setTempSerials(e.target.value)}
                                placeholder={'SN001\nSN002\nSN003\n...'}
                                className="font-mono"
                            />
                            <p className="mt-2 text-xs text-gray-400">
                                Đã nhập: {tempSerials.split('\n').filter(s => s.trim()).length} serial
                            </p>
                        </div>
                    </Tabs.TabPane>

                    <Tabs.TabPane tab={<span><UploadOutlined /> Upload Excel</span>} key="excel">
                        <div className="text-center py-10 px-5">
                            <p className="mb-4 text-gray-600">
                                Upload file Excel với danh sách serial (cột A, bỏ qua dòng 1):
                            </p>
                            <Button
                                icon={<UploadOutlined />}
                                size="large"
                                onClick={async () => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.xlsx,.xls';
                                    input.onchange = async (e: any) => {
                                        const file = e.target?.files?.[0];
                                        if (file) {
                                            try {
                                                const serials = await parseExcelSerials(file);
                                                const current = tempSerials.split('\n').filter(s => s.trim());
                                                const merged = [...current, ...serials];
                                                const unique = [...new Set(merged)];

                                                setTempSerials(unique.join('\n'));
                                                setActiveTab('manual');
                                            } catch (err) {
                                                console.error(err);
                                            }
                                        }
                                    };
                                    input.click();
                                }}
                            >
                                Chọn file Excel
                            </Button>
                            <p className="mt-4 text-xs text-gray-400">
                                Hỗ trợ: .xlsx, .xls
                            </p>
                        </div>
                    </Tabs.TabPane>
                </Tabs>
            </Modal>
        </div>
    );
}
