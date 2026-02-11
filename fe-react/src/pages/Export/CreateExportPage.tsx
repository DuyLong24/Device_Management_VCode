import { Card, Button, Space, Form, InputNumber, Table, Typography, Divider, Select } from 'antd';
import { SaveOutlined, CloseOutlined, PlusOutlined, DeleteOutlined, WarningOutlined, SendOutlined } from '@ant-design/icons';

import { useCreateExport, type DeviceItem } from '../../hooks/useCreateExport';
import { ProjectCreationModal } from './components/ProjectCreationModal';
import { ExportGeneralInfo } from './components/ExportGeneralInfo';

import { useAuth } from '../../hooks/useAuth';
import { PERMISSION_KEYS } from '../../constants/permissionKeys';

const { Title, Text } = Typography;

export default function CreateExportPage() {
    const {
        form,
        loading,
        deviceList,
        deviceOptions,
        loadingDevices,
        handleAddDevice,
        handleDeleteDevice,
        handleDeviceChange,
        getDeviceStock,
        handleSaveDraft,
        handleSaveAndSubmit,
        handleCancel,
        setHasUnsavedChanges,
        isEditMode,
        // Project Logic
        isProjectModalOpen,
        setIsProjectModalOpen,
        pendingProjectName,
        onProjectSearch,
        handleProjectBlur,
        handleProjectKeyDown,
    } = useCreateExport();

    // Definitions of columns
    const columns = [
        {
            title: (
                <span>
                    <Text type="danger">*</Text> Mã thiết bị
                </span>
            ),
            dataIndex: 'deviceModel',
            key: 'deviceModel',
            width: 350,
            render: (value: string, record: DeviceItem) => {
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
                            optionRender={(option) => (
                                <Space>
                                    <Text strong>{option.data.value}</Text>
                                    {option.data.stockName && <Text type="secondary">({option.data.stockName})</Text>}
                                </Space>
                            )}
                            filterOption={(input, option) =>
                                String(option?.value ?? '').toLowerCase().includes(input.toLowerCase()) ||
                                String(option?.stockName ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                        {value && (
                            <Text type="secondary" className="text-xs">
                                Có thể xuất:{' '}
                                <Text strong className={inStock > 0 ? "text-green-500" : "text-red-500"}>
                                    {inStock}
                                </Text>
                            </Text>
                        )}
                    </Space>
                );
            }
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
            render: (value: number, record: DeviceItem) => {
                const inStock = record.deviceModel ? getDeviceStock(record.deviceModel) : 0;
                const isExceed = value > inStock;
                return (
                    <Space direction="vertical" className="w-full" size={4}>
                        <InputNumber
                            min={1}
                            // Optional: enforce max valid? max={inStock} 
                            // Keeping it flexible as per original logic, but showing error
                            value={value}
                            className="w-full"
                            onChange={(val) => handleDeviceChange(record.key, 'quantity', val || 1)}
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
            render: (_: any, record: DeviceItem) => (
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteDevice(record.key)} />
            ),
        },
    ];

    const { hasPermission } = useAuth();
    const canSaveDraft = hasPermission(PERMISSION_KEYS.EXPORT.CREATE.SAVE_DRAFT);
    const canSubmit = hasPermission(PERMISSION_KEYS.EXPORT.CREATE.SUBMIT);

    return (
        <div className="p-3 max-w-full mx-auto">
            {/* Header */}
            <div className="mb-2">
                <Title level={3} className="!m-0">
                    {isEditMode ? 'Cập nhật phiếu xuất kho' : 'Thêm mới phiếu xuất kho'}
                </Title>
            </div>

            <Form form={form} layout="vertical" onValuesChange={() => setHasUnsavedChanges(true)}>
                <ExportGeneralInfo
                    onProjectSearch={onProjectSearch}
                    onProjectBlur={handleProjectBlur}
                    onProjectKeyDown={handleProjectKeyDown}
                />

                {/* Device List Card */}
                <Card
                    className="mb-6 shadow-sm"
                    title={
                        <span>
                            Danh sách thiết bị{' '}
                            <Text type="secondary" className="text-sm font-normal">
                                ({deviceList.length})
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
                                dataSource={deviceList}
                                pagination={false}
                                bordered
                                size="middle"
                                rowKey="key"
                                scroll={{ x: 800 }}
                                columns={columns}
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

            {/* Footer */}
            <div className="sticky bottom-0 bg-white py-4 mt-3 border-t border-gray-200 z-10">
                <div className="flex justify-end gap-2 pr-6">
                    <Button
                        icon={<SaveOutlined />}
                        onClick={handleSaveDraft}
                        loading={loading}
                        size="large"
                        disabled={!canSaveDraft}
                    >
                        {isEditMode ? 'Cập nhật nháp' : 'Lưu nháp'}
                    </Button>
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={handleSaveAndSubmit}
                        loading={loading}
                        size="large"
                        disabled={!canSubmit}
                    >
                        {isEditMode ? 'Cập nhật & Gửi duyệt' : 'Lưu & Gửi duyệt'}
                    </Button>
                    <Button danger icon={<CloseOutlined />} onClick={handleCancel} size="large">
                        Hủy
                    </Button>
                </div>
            </div>

            <ProjectCreationModal
                open={isProjectModalOpen}
                onCancel={() => setIsProjectModalOpen(false)}
                initialName={pendingProjectName}
                onSuccess={(code) => {
                    form.setFieldValue('project', code);
                    setIsProjectModalOpen(false);
                }}
            />
        </div>
    );
}
