import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
    message
} from 'antd';
import {
    ArrowLeftOutlined,
    ReloadOutlined,
    PrinterOutlined,
    SwapOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSerialDetail, getTimelineIcon } from '../../hooks/useSerialDetail';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function SerialDetailPage() {
    const { serial } = useParams();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [transferModalVisible, setTransferModalVisible] = useState(false);

    const {
        device,
        timeline,
        isLoading,
        refetch,
        currentWarehouse,
        availableTransitions,
        transferDevice,
        isTransferring
    } = useSerialDetail(serial);

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
                note: values.note
            }, {
                onSuccess: () => {
                    setTransferModalVisible(false);
                    form.resetFields();
                }
            });
        });
    };

    if (isLoading) return <div className="p-10 text-center"><Spin size="large" /></div>;
    if (!device) return <div className="p-10 text-center"><Text type="danger">Không tìm thấy serial {serial}</Text></div>;

    const isRemoved = currentWarehouse?.code === 'REMOVED';

    return (
        <div className="p-6">
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
                        <Title level={3} className="!m-0">
                            Chi tiết Serial: {device.serial}
                        </Title>
                        <Text type="secondary">ID: {device.id}</Text>
                    </div>

                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Làm mới</Button>
                        <Button icon={<PrinterOutlined />} onClick={() => window.print()}>In</Button>
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
                    message="Serial đã loại khỏi tồn kho"
                    type="error"
                    showIcon
                    className="mb-4"
                />
            )}

            <Row gutter={[16, 16]}>
                {/* Left Column */}
                <Col xs={24} lg={16}>
                    {/* Info */}
                    <Card title="📦 Thông tin thiết bị" size="small" className="mb-4">
                        <Descriptions column={2} size="small" bordered>
                            <Descriptions.Item label="Serial" span={2}><Text strong>{device.serial}</Text></Descriptions.Item>
                            <Descriptions.Item label="Model">{device.deviceModel}</Descriptions.Item>
                            <Descriptions.Item label="Tên">{device.name}</Descriptions.Item>
                            <Descriptions.Item label="MAC">{device.mac || '-'}</Descriptions.Item>
                        </Descriptions>
                    </Card>

                    {/* Warehouse Status */}
                    <Card title="📍 Trạng thái hiện tại" size="small" className="mb-4">
                        <Tag color={currentWarehouse?.color || 'default'} className="text-base px-3 py-1">
                            {currentWarehouse?.name || 'Unknown'}
                        </Tag>
                        <div className="mt-3">
                            <Text type="secondary">Cập nhật lúc: </Text>
                            {device.warehouseUpdatedAt ? dayjs(device.warehouseUpdatedAt).format('DD/MM/YYYY HH:mm') : '-'}
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
                                            {dayjs(ev.date).format('DD/MM/YYYY HH:mm')} • {ev.actor}
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
                    {/* QC Info if exists */}
                    {device.qcStatus && device.qcStatus !== 'PENDING' && (
                        <Card title="Kết quả QC" size="small" className="mb-4">
                            <Tag color={device.qcStatus === 'PASS' ? 'success' : 'error'}>{device.qcStatus}</Tag>
                            {device.qcNote && <div className="mt-2">{device.qcNote}</div>}
                        </Card>
                    )}

                    {/* Warranties */}
                    {(device.warrantyActivatedDate || device.warrantyExpiredDate) && (
                        <Card title="Thông tin bảo hành" size="small">
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label="Kích hoạt">{device.warrantyActivatedDate ? dayjs(device.warrantyActivatedDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Hết hạn">{device.warrantyExpiredDate ? dayjs(device.warrantyExpiredDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
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
                    <Form.Item name="note" label="Ghi chú">
                        <TextArea rows={2} />
                    </Form.Item>
                    <div className="flex justify-end gap-2">
                        <Button onClick={() => setTransferModalVisible(false)}>Hủy</Button>
                        <Button type="primary" htmlType="submit" loading={isTransferring}>Xác nhận</Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}
