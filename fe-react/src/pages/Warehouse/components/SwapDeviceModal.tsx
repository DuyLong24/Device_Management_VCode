import React, { useState, useEffect, useRef } from 'react';
import {
    Modal, Form, Select, Alert, Button, Table,
    Space, Typography, Tag, Spin, Input
} from 'antd';
import {
    SwapOutlined,
    WarningOutlined,
    SearchOutlined
} from '@ant-design/icons';
import { sharedDataService } from '../../../services/shared-data.service';
import { SharedDataCreationModal } from '../../../components/shared/SharedDataCreationModal';

import type { Device } from '../../../services/device.service';
import { deviceService } from '../../../services/device.service';
import { axiosInstance } from '../../../configs/axios.config';

const { Text, Title } = Typography;

interface SwapDeviceModalProps {
    open: boolean;
    onCancel: () => void;
    /** Máy A - thiết bị lỗi cần đổi */
    originDevice: Device | null;
    onSuccess?: () => void;
}

export const SwapDeviceModal: React.FC<SwapDeviceModalProps> = ({
    open,
    onCancel,
    originDevice,
    onSuccess,
}) => {
    const [form] = Form.useForm();
    const [defectReasonOptions, setDefectReasonOptions] = useState<{ label: string; value: string }[]>([]);
    const [swapCandidates, setSwapCandidates] = useState<Device[]>([]);
    const [selectedSwapId, setSelectedSwapId] = useState<string | null>(null);
    const [loadingReasons, setLoadingReasons] = useState(false);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchSwap, setSearchSwap] = useState('');
    const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);
    const [pendingDefectName, setPendingDefectName] = useState('');
    const defectSearchRef = useRef('');

    useEffect(() => {
        if (!open) {
            form.resetFields();
            setSelectedSwapId(null);
            setSearchSwap('');
            return;
        }
        fetchDefectReasons();
        if (originDevice?.deviceModel) {
            fetchSwapCandidates(originDevice.deviceModel);
        }
    }, [open, originDevice]);

    const fetchDefectReasons = async () => {
        setLoadingReasons(true);
        try {
            const result = await sharedDataService.getDataByGroupCode('DEFECT_REASON');
            const list = Array.isArray(result) ? result : [];
            setDefectReasonOptions(list.map((r: any) => ({ label: r.name, value: r.code })));
        } catch {
            setDefectReasonOptions([]);
        } finally {
            setLoadingReasons(false);
        }
    };

    const handleDefectSearch = (value: string) => {
        defectSearchRef.current = value;
    };

    const handleDefectBlur = () => {
        const capturedValue = defectSearchRef.current.trim();
        setTimeout(() => {
            if (!capturedValue) return;

            const exists = defectReasonOptions.some(
                (o) => o.label.toLowerCase() === capturedValue.toLowerCase()
            );
            if (!exists) {
                setPendingDefectName(capturedValue);
                setIsDefectModalOpen(true);
            }
        }, 200);
    };

    const handleDefectKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleDefectBlur();
        }
    };

    const fetchSwapCandidates = async (deviceModel: string) => {
        setLoadingCandidates(true);
        try {
            // Tìm kho SWAP_STOCK trước
            const wareRes = await axiosInstance.get('/warehouses', { params: { code: 'SWAP_STOCK' } });
            const wareList = wareRes.data?.results ?? wareRes.data;
            const swapWarehouse = Array.isArray(wareList) ? wareList[0] : null;
            if (!swapWarehouse) {
                setSwapCandidates([]);
                return;
            }
            // Lấy thiết bị trong kho đó, khớp model
            const res = await deviceService.getAll({
                warehouseId: swapWarehouse.id ?? swapWarehouse._id,
                deviceModel,
                limit: 50,
            });
            setSwapCandidates(res.results ?? []);
        } catch {
            setSwapCandidates([]);
        } finally {
            setLoadingCandidates(false);
        }
    };

    const handleSubmit = async () => {
        if (!originDevice) return;
        try {
            const values = await form.validateFields();
            if (!selectedSwapId) {
                return;
            }
            setSubmitting(true);

            const wareRes = await axiosInstance.get('/warehouses', { params: { code: 'SOLD' } });
            const wareList = wareRes.data?.results ?? wareRes.data;
            const soldWarehouse = Array.isArray(wareList) ? wareList[0] : null;
            if (!soldWarehouse) throw new Error('Không tìm thấy kho SOLD');

            await axiosInstance.patch(`/devices/${selectedSwapId}/transfer`, {
                toWarehouseId: soldWarehouse.id ?? soldWarehouse._id,
                defectReason: values.defectReason,
                originDeviceId: originDevice.id,
                note: `Đổi trả 1-1 thay máy lỗi ${originDevice.mac ?? originDevice.id}`,
            });

            onSuccess?.();
            onCancel();
        } catch (err: any) {
            if (!err?.errorFields) {
                console.error(err);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const filteredCandidates = swapCandidates.filter(d =>
        !searchSwap ||
        d.mac?.toLowerCase().includes(searchSwap.toLowerCase()) ||
        d.serial?.toLowerCase().includes(searchSwap.toLowerCase())
    );

    const swapColumns = [
        {
            title: 'Mã Định Danh',
            dataIndex: 'iden',
            key: 'iden',
            render: (iden: string) => <Text code>{iden}</Text>,
        },
        {
            title: 'Model',
            dataIndex: 'deviceModel',
            key: 'deviceModel',
            render: (m: string) => <Tag color="blue">{m}</Tag>,
        },
    ];

    return (
        <>
            <Modal
                title={
                    <Space>
                        <SwapOutlined style={{ color: '#1677ff' }} />
                        <span>Đổi trả 1-1 – Chọn máy từ kho Dự phòng</span>
                    </Space>
                }
                open={open}
                onCancel={onCancel}
                width={700}
                footer={[
                    <Button key="cancel" onClick={onCancel} disabled={submitting}>
                        Hủy
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        icon={<SwapOutlined />}
                        loading={submitting}
                        disabled={!selectedSwapId}
                        onClick={handleSubmit}
                    >
                        Xác nhận Đổi trả
                    </Button>,
                ]}
                destroyOnClose
            >
                <Space direction="vertical" className="w-full" size="middle">
                    {/* Thông tin Máy A */}
                    {originDevice && (
                        <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                            <Text type="secondary" className="text-xs">Thiết bị lỗi (Máy A)</Text>
                            <div className="flex gap-4 mt-1">
                                <Text strong>{originDevice.iden}</Text>
                                <Tag>{originDevice.deviceModel}</Tag>
                                {originDevice.warrantyExpiredDate && (
                                    <Text type="secondary" className="text-sm">
                                        Hết BH: {new Date(originDevice.warrantyExpiredDate).toLocaleDateString('vi-VN')}
                                    </Text>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Cảnh báo kế thừa */}
                    <Alert
                        message="Kế thừa bảo hành"
                        description="Thiết bị mới xuất ra (Máy B) sẽ tự động kế thừa hạn bảo hành của thiết bị lỗi (Máy A)."
                        type="warning"
                        showIcon
                        icon={<WarningOutlined />}
                    />

                    <Form form={form} layout="vertical">
                        {/* Chọn nguyên nhân lỗi */}
                        <Form.Item
                            label={<Text strong>Nguyên nhân lỗi của Máy A</Text>}
                            name="defectReason"
                            rules={[{ required: true, message: 'Vui lòng chọn nguyên nhân lỗi' }]}
                        >
                            <Select
                                placeholder="Chọn nguyên nhân..."
                                loading={loadingReasons}
                                allowClear
                                showSearch
                                autoClearSearchValue={false}
                                optionFilterProp="label"
                                options={defectReasonOptions}
                                onSearch={handleDefectSearch}
                                onBlur={handleDefectBlur}
                                onKeyDown={handleDefectKeyDown}
                                filterOption={(input, option) =>
                                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                            />
                        </Form.Item>

                    </Form>

                    {/* Chọn Máy B */}
                    <div>
                        <Title level={5} className="mb-2">
                            Chọn Máy B từ kho Dự phòng đổi trả
                            <Tag color="cyan" className="ml-2">SWAP_STOCK</Tag>
                            {originDevice?.deviceModel && (
                                <Tag color="blue">{originDevice.deviceModel}</Tag>
                            )}
                        </Title>

                        <Input
                            prefix={<SearchOutlined />}
                            placeholder="Tìm theo MAC hoặc Serial..."
                            value={searchSwap}
                            onChange={e => setSearchSwap(e.target.value)}
                            className="mb-2"
                            allowClear
                        />

                        <Spin spinning={loadingCandidates}>
                            <Table
                                dataSource={filteredCandidates}
                                columns={swapColumns}
                                rowKey="id"
                                size="small"
                                pagination={{ pageSize: 5, showSizeChanger: false }}
                                rowSelection={{
                                    type: 'radio',
                                    selectedRowKeys: selectedSwapId ? [selectedSwapId] : [],
                                    onChange: (keys) => setSelectedSwapId(keys[0] as string ?? null),
                                }}
                                onRow={(record) => ({
                                    onClick: () => setSelectedSwapId(record.id),
                                    style: { cursor: 'pointer' },
                                })}
                                locale={{
                                    emptyText: loadingCandidates
                                        ? 'Đang tải...'
                                        : 'Không có thiết bị nào khả dụng trong kho Dự phòng',
                                }}
                            />
                        </Spin>

                        {selectedSwapId && (
                            <Alert
                                message={`Đã chọn Máy B: ${swapCandidates.find(d => d.id === selectedSwapId)?.mac}`}
                                type="success"
                                showIcon
                                className="mt-2"
                            />
                        )}
                    </div>
                </Space>
            </Modal>

            {/* Modal tạo mới Nguyên nhân lỗi */}
            <SharedDataCreationModal
                open={isDefectModalOpen}
                onCancel={() => {
                    setIsDefectModalOpen(false);
                    defectSearchRef.current = '';
                }}
                initialName={pendingDefectName}
                groupCode="DEFECT_REASON"
                title="Tạo mới Nguyên nhân lỗi"
                onSuccess={(code, name) => {
                    // Auto-fill dropdown + reload options
                    setDefectReasonOptions((prev) => [...prev, { label: name, value: code }]);
                    form.setFieldsValue({ defectReason: code });
                    defectSearchRef.current = '';
                    setIsDefectModalOpen(false);
                }}
            />
        </>
    );
};
