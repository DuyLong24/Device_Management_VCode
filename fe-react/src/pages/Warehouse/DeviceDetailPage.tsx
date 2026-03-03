import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Card,
    Button,
    Space,
    Tag,
    Typography,
    Descriptions,
    Alert,
    Timeline,
    Row,
    Col,
    Modal,
    Radio,
    Form,
    Input,
    Spin,
    message,
    Tooltip
} from 'antd';
import {
    ArrowLeftOutlined,
    ReloadOutlined,
    PrinterOutlined,
    SwapOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useMacDetail, getTimelineIcon } from '../../hooks/useSerialDetail';
import { SwapDeviceModal } from './components/SwapDeviceModal';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function DeviceDetailPage() {
    const { mac } = useParams();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [transferModalVisible, setTransferModalVisible] = useState(false);
    const [swapModalVisible, setSwapModalVisible] = useState(false);

    const {
        device,
        timeline,
        isLoading,
        refetch,
        currentWarehouse,
        availableTransitions,
        transferDevice,
        isTransferring
    } = useMacDetail(mac);

    const isTransferringToError = Form.useWatch('toWarehouseCode', form) === 'DEFECT' || Form.useWatch('toWarehouseCode', form) === 'REMOVED';

    const handleTransferSubmit = () => {
        form.validateFields().then(values => {
            if (!device) return;

            const targetTransition = availableTransitions.find((t: any) => t.to === values.toWarehouseCode);

            if (!targetTransition?.targetId) {
                return message.error('Kho đích không hợp lệ');
            }

            transferDevice({
                deviceIds: [device.id],
                toWarehouseId: targetTransition.targetId,
                note: values.note,
                errorReason: values.errorReason
            }, {
                onSuccess: () => {
                    setTransferModalVisible(false);
                    form.resetFields();
                }
            });
        });
    };

    if (isLoading) return <div className="p-10 text-center"><Spin size="large" /></div>;
    if (!device) return <div className="p-10 text-center"><Text type="danger">Không tìm thấy MAC {mac}</Text></div>;

    const isRemoved = currentWarehouse?.code === 'REMOVED';
    const isInServiceCenter = currentWarehouse?.code === 'SERVICE_CENTER';
    const isAlreadySwapped = !!device?.replacedByDeviceId || device?.warrantyStatus === 'SWAPPED_BY_NEW_DEVICE';

    return (
        <div className="p-3">
            {/* Page Header */}
            <div className="mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <Button
                            type="link"
                            icon={<ArrowLeftOutlined />}
                            onClick={() => navigate(-1)}
                            className="pl-0 mb-2"
                        >
                            Quay lại
                        </Button>
                        <Title level={3} className="m-0!">
                            Chi tiết MAC: {device.mac}
                        </Title>
                        <Text type="secondary">ID: {device.id}</Text>
                    </div>

                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Làm mới</Button>
                        <Button icon={<PrinterOutlined />} onClick={() => window.print()}>In</Button>
                        {isInServiceCenter && (
                            <Tooltip title={isAlreadySwapped ? "Thiết bị này đã được xuất đổi trả bằng một máy khác" : ""}>
                                <Button
                                    type="default"
                                    danger={!isAlreadySwapped}
                                    disabled={isAlreadySwapped}
                                    icon={<SwapOutlined />}
                                    onClick={() => setSwapModalVisible(true)}
                                >
                                    {isAlreadySwapped ? 'Đã Đổi Trả' : 'Đổi trả 1-1 (Swap)'}
                                </Button>
                            </Tooltip>
                        )}
                        {availableTransitions.length > 0 && !isRemoved && (
                            <Button type="primary" icon={<SwapOutlined />} onClick={() => setTransferModalVisible(true)}>
                                Chuyển kho
                            </Button>
                        )}
                    </Space>
                </div>
            </div>

            {/* Alerts */}
            {isRemoved && (
                <Alert
                    message="MAC đã loại khỏi tồn kho"
                    type="error"
                    showIcon
                    className="mb-4"
                />
            )}

            <Row gutter={[16, 16]}>
                {/* Left Column */}
                <Col xs={24} lg={16}>
                    {/* Info */}
                    <Card title=" Thông tin thiết bị" size="small" className="mb-4">
                        <Descriptions column={2} size="small" bordered>
                            <Descriptions.Item label="MAC" span={2}><Text strong>{device.mac}</Text></Descriptions.Item>
                            <Descriptions.Item label="Model">{device.deviceModel}</Descriptions.Item>
                            <Descriptions.Item label="Tên">{device.name}</Descriptions.Item>
                            <Descriptions.Item label="Serial">{device.serial || '-'}</Descriptions.Item>
                        </Descriptions>
                    </Card>

                    {/* Warehouse Status */}
                    <Card title="📍 Trạng thái hiện tại" size="small" className="mb-4">
                        <Tag color={currentWarehouse?.color || 'default'} className="text-base px-3 py-1">
                            {currentWarehouse?.name || 'Unknown'}
                        </Tag>
                        <div className="mt-3">
                            <Text type="secondary">Cập nhật lúc: </Text>
                            {device.warehouseUpdatedAt ? dayjs(device.warehouseUpdatedAt).format('DD/MM/YYYY HH:mm') : 'Chưa xác định'}
                        </div>
                    </Card>

                    {/* Timeline */}
                    <Card title="📜 Lịch sử hoạt động" size="small">
                        <Timeline
                            mode="left"
                            items={timeline.map((ev: any, idx: number) => ({
                                dot: getTimelineIcon(ev),
                                children: (
                                    <div key={idx}>
                                        <Text type="secondary" className="text-xs">
                                            {ev.date ? dayjs(ev.date).format('DD/MM/YYYY HH:mm') : 'Chưa xác định'} • {ev.actor}
                                        </Text>
                                        <br />
                                        <Text strong>{ev.description}</Text>
                                        {ev.note && <div className="text-gray-500 mt-1">💬 {ev.note}</div>}

                                        {/* QC Result */}
                                        {ev.qcResult && (
                                            <div className="mt-1">
                                                <Tag color={ev.qcResult === 'PASS' ? 'success' : 'error'}>
                                                    {ev.qcResult}
                                                </Tag>
                                            </div>
                                        )}
                                    </div>
                                )
                            })).reverse()}
                        />
                    </Card>
                </Col>

                {/* Right Column */}
                <Col xs={24} lg={8}>
                    {device.qcStatus && device.qcStatus !== 'PENDING' && (
                        <Card title="Kết quả QC" size="small" className="mb-4">
                            <Tag color={device.qcStatus === 'PASS' ? 'success' : 'error'}>{device.qcStatus}</Tag>
                            {device.qcNote && <div className="mt-2">{device.qcNote}</div>}
                        </Card>
                    )}

                    {/* Import/Export Info */}
                    {(device.importId || device.currentExportId) && (
                        <Card title="Thông tin phiếu" size="small" className="mb-4">
                            <Descriptions column={1} size="small" bordered>
                                {device.importId && (
                                    <>
                                        <Descriptions.Item label="Phiếu nhập">
                                            <Space direction="vertical" size={0}>
                                                <Link to={`/import/${device.importId.id}`} className="font-bold text-blue-600 hover:underline">
                                                    {device.importId.code}
                                                </Link>
                                                <Text type="secondary" className="text-xs">
                                                    {(() => { const d = device.importDate || device.importId?.importDate; return d ? dayjs(d).format('DD/MM/YYYY') : 'Chưa nhập kho'; })()}
                                                </Text>
                                            </Space>
                                        </Descriptions.Item>
                                        {device.importId.createdBy?.name && (
                                            <Descriptions.Item label="Người nhập">
                                                {device.importId.createdBy.name}
                                            </Descriptions.Item>
                                        )}
                                        {device.importId.supplier && (
                                            <Descriptions.Item label="Nhà cung cấp">
                                                {device.importId.supplier}
                                            </Descriptions.Item>
                                        )}
                                        {device.importId.notes && (
                                            <Descriptions.Item label="Ghi chú nhập">
                                                {device.importId.notes}
                                            </Descriptions.Item>
                                        )}
                                    </>
                                )}
                                {device.currentExportId && (
                                    <>
                                        <Descriptions.Item label="Phiếu xuất">
                                            <Space direction="vertical" size={0}>
                                                <Link to={`/export/${device.currentExportId.id}`} className="font-bold text-blue-600 hover:underline">
                                                    {device.currentExportId.code}
                                                </Link>
                                                <Text type="secondary" className="text-xs">
                                                    {device.exportDate ? dayjs(device.exportDate).format('DD/MM/YYYY') : 'Chưa xuất kho'}
                                                </Text>
                                            </Space>
                                        </Descriptions.Item>
                                        {device.currentExportId.exportReason && (
                                            <Descriptions.Item label="Lý do">
                                                {device.currentExportId.exportReason}
                                            </Descriptions.Item>
                                        )}
                                        {device.currentExportId.receiver && (
                                            <Descriptions.Item label="Đơn vị nhận">
                                                {device.currentExportId.receiver}
                                            </Descriptions.Item>
                                        )}
                                        {device.currentExportId.receiverPerson && (
                                            <Descriptions.Item label="Người nhận">
                                                {device.currentExportId.receiverPerson}
                                            </Descriptions.Item>
                                        )}
                                        {device.currentExportId.project && (
                                            <Descriptions.Item label="Dự án">
                                                {device.currentExportId.project}
                                            </Descriptions.Item>
                                        )}
                                        {device.currentExportId.customer && (
                                            <Descriptions.Item label="Khách hàng">
                                                {device.currentExportId.customer}
                                            </Descriptions.Item>
                                        )}
                                        {device.currentExportId.notes && (
                                            <Descriptions.Item label="Ghi chú xuất">
                                                {device.currentExportId.notes}
                                            </Descriptions.Item>
                                        )}
                                    </>
                                )}
                            </Descriptions>
                        </Card>
                    )}

                    {/* Warranties */}
                    {(device.warrantyActivatedDate || device.warrantyExpiredDate) && (
                        <Card title="Thông tin bảo hành" size="small">
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label="Thời hạn">{device.warrantyMonths ? `${device.warrantyMonths} tháng` : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Kích hoạt">{device.warrantyActivatedDate ? dayjs(device.warrantyActivatedDate).format('DD/MM/YYYY') : 'Chưa kích hoạt'}</Descriptions.Item>
                                <Descriptions.Item label="Hết hạn">{device.warrantyExpiredDate ? dayjs(device.warrantyExpiredDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                                {device.warrantyExpiredDate && (
                                    <Descriptions.Item label="Trạng thái">
                                        {dayjs(device.warrantyExpiredDate).isAfter(dayjs()) ? (
                                            <Tag color="green">Còn hạn</Tag>
                                        ) : (
                                            <Tag color="red">Hết hạn</Tag>
                                        )}
                                    </Descriptions.Item>
                                )}
                            </Descriptions>
                        </Card>
                    )}
                </Col>
            </Row>

            {/* Modal */}
            <Modal
                title="Chuyển kho"
                open={transferModalVisible}
                onCancel={() => setTransferModalVisible(false)}
                footer={null}
            >
                <Form form={form} onFinish={handleTransferSubmit} layout="vertical">
                    <Form.Item name="toWarehouseCode" label="Chọn kho đích" rules={[{ required: true }]}>
                        <Radio.Group className="w-full">
                            <Space direction="vertical" className="w-full">
                                {availableTransitions.map((t: any) => (
                                    <Radio key={t.to} value={t.to} className="border p-2 rounded w-full block">
                                        <Text strong>{t.label}</Text>
                                        <div className="text-xs text-gray-500">{t.description}</div>
                                    </Radio>
                                ))}
                            </Space>
                        </Radio.Group>
                    </Form.Item>

                    {isTransferringToError && (
                        <Form.Item
                            name="errorReason"
                            label="Nguyên do lỗi (Bắt buộc)"
                            rules={[{ required: true, message: 'Vui lòng nhập nguyên do lỗi' }]}
                            className="mb-4"
                        >
                            <TextArea rows={2} placeholder="Mô tả lỗi của thiết bị..." />
                        </Form.Item>
                    )}

                    <Form.Item name="note" label="Ghi chú">
                        <TextArea rows={2} />
                    </Form.Item>
                    <div className="flex justify-end gap-2">
                        <Button onClick={() => setTransferModalVisible(false)}>Hủy</Button>
                        <Button type="primary" htmlType="submit" loading={isTransferring}>Xác nhận</Button>
                    </div>
                </Form>
            </Modal>

            {/* SwapDeviceModal – Đổi trả 1-1 */}
            <SwapDeviceModal
                open={swapModalVisible}
                onCancel={() => setSwapModalVisible(false)}
                originDevice={device}
                onSuccess={() => {
                    setSwapModalVisible(false);
                    refetch();
                }}
            />
        </div>
    );
}
