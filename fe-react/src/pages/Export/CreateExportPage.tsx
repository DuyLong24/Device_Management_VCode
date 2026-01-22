import { Card, Button, Space, Form, Input, Select, InputNumber, Table, Typography, Row, Col, Tooltip, Divider, Modal } from 'antd';
import { SaveOutlined, CloseOutlined, PlusOutlined, DeleteOutlined, InfoCircleOutlined, WarningOutlined, SendOutlined } from '@ant-design/icons';

import { useCreateExport } from '../../hooks/useCreateExport';
const { Title, Text } = Typography;
const { TextArea } = Input;

export default function CreateExportPage() {
    const {
        form,
        loading,
        deviceList,
        deviceOptions,
        categoryOptions,
        loadingDevices,
        loadingCategories,
        handleAddDevice,
        handleDeleteDevice,
        handleDeviceChange,
        getDeviceStock,
        handleSaveDraft,
        handleSaveAndSubmit,
        handleCancel,
        setHasUnsavedChanges,
        isEditMode,
        projectOptions, // [NEW] From Hook
        isProjectModalOpen,
        pendingProjectName,
        onProjectSearch,
        handleProjectBlur,
        handleProjectKeyDown, // [NEW]
        handleCreateProject,
        handleCancelProjectCreation
    } = useCreateExport();

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
            {/* Page Header */}
            <div className="mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <Title level={3} className="!m-0">
                            {isEditMode ? 'Cập nhật phiếu xuất kho' : 'Thêm mới phiếu xuất kho'}
                        </Title>
                        <Text type="secondary">
                            {isEditMode ? 'Chỉnh sửa thông tin phiếu xuất nháp' : 'Tạo mới phiếu xuất kho và danh sách thiết bị đi kèm'}
                        </Text>
                    </div>
                    <Space>
                        <Button icon={<SaveOutlined />} onClick={handleSaveDraft} loading={loading}>
                            {isEditMode ? 'Cập nhật nháp' : 'Lưu nháp'}
                        </Button>
                        <Button type="primary" icon={<SendOutlined />} onClick={handleSaveAndSubmit} loading={loading}>
                            {isEditMode ? 'Cập nhật & Gửi duyệt' : 'Lưu & Gửi duyệt'}
                        </Button>
                        <Button danger icon={<CloseOutlined />} onClick={handleCancel}>
                            Hủy
                        </Button>
                    </Space>
                </div>
            </div>

            {/* Form */}
            <Form form={form} layout="vertical" onValuesChange={() => setHasUnsavedChanges(true)}>
                {/* Card A - Thông tin chung */}
                <Card title="Thông tin chung phiếu xuất" className="mb-6 shadow-sm">
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="code"
                                label={
                                    <span>
                                        Mã phiếu xuất{' '}
                                        <Tooltip title="Mã tự sinh theo đợt xuất kho, có thể chỉnh sửa">
                                            <InfoCircleOutlined className="text-gray-400" />
                                        </Tooltip>
                                    </span>
                                }
                                rules={[{ required: true, message: 'Vui lòng nhập mã phiếu' }]}
                            >
                                <Input placeholder="Nhập mã phiếu xuất" className="font-semibold text-blue-600" />
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
                                name="project"
                                label="Dự án nhận"
                                rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập dự án' }]}
                            >
                                <Select
                                    placeholder="Chọn hoặc nhập tên dự án mới"
                                    options={projectOptions}
                                    showSearch
                                    onSearch={onProjectSearch}
                                    onBlur={handleProjectBlur}
                                    onInputKeyDown={handleProjectKeyDown}
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                />
                            </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                            <Form.Item
                                name="exportName"
                                label="Tên phiếu xuất"
                                rules={[{ required: true, message: 'Vui lòng nhập tên phiếu' }]}
                            >
                                <Input />
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
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="receiverPerson" label="Người nhận">
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
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
                    className="mb-6 shadow-sm"
                    title={
                        <span>
                            Danh sách mã thiết bị xuất kho{' '}
                            <Text type="secondary" className="text-sm font-normal">
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
                                </Space>
                            </div>
                        </>
                    )}
                </Card>
            </Form>

            <div className="sticky bottom-0 bg-white py-4 mt-6 border-t border-gray-200 z-10">
                <div className="flex justify-end gap-2">
                    <Button icon={<SaveOutlined />} onClick={handleSaveDraft} loading={loading} size="large">
                        {isEditMode ? 'Cập nhật nháp' : 'Lưu nháp'}
                    </Button>
                    <Button type="primary" icon={<SendOutlined />} onClick={handleSaveAndSubmit} loading={loading} size="large">
                        {isEditMode ? 'Cập nhật & Gửi duyệt' : 'Lưu & Gửi duyệt'}
                    </Button>
                    <Button danger icon={<CloseOutlined />} onClick={handleCancel} size="large">
                        Hủy
                    </Button>
                </div>
            </div>

            {/* Modal Confirm Create Project */}
            <Modal
                title="Tạo Dự án Mới?"
                open={isProjectModalOpen}
                onCancel={handleCancelProjectCreation}
                footer={null}
            >
                <div className="p-4">
                    <p className="mb-4 text-gray-600">
                        Dự án <strong>"{pendingProjectName}"</strong> chưa tồn tại. Bạn có muốn tạo mới không?
                    </p>
                    <Form
                        layout="vertical"
                        onFinish={(values) => handleCreateProject(values.code, values.name)}
                        initialValues={{
                            name: pendingProjectName,
                            code: 'DA_' + pendingProjectName.toUpperCase().replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                        }}
                    >
                        <Form.Item
                            name="name"
                            label="Tên dự án"
                            rules={[{ required: true, message: 'Vui lòng nhập tên dự án' }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="code"
                            label="Mã dự án (Tự sinh)"
                            rules={[{ required: true, message: 'Vui lòng nhập mã dự án' }]}
                        >
                            <Input />
                        </Form.Item>
                        <div className="flex justify-end space-x-2 mt-6">
                            <Button onClick={handleCancelProjectCreation}>Hủy</Button>
                            <Button type="primary" htmlType="submit">
                                Tạo Dự án
                            </Button>
                        </div>
                    </Form>
                </div>
            </Modal>
        </div>
    );
}
