import { Modal, Form, Radio, Input, Button, Space, Card, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ToolOutlined, ClockCircleOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useEffect } from 'react';

const { Text } = Typography;
const { TextArea } = Input;

interface TransferOption {
    to: string;
    label: string;
    description?: string;
    color?: string;
    icon?: React.ReactNode;
}

interface TransferModalProps {
    open: boolean;
    onCancel: () => void;
    onConfirm: (toWarehouse: string, note: string) => void;
    count: number;
    options: TransferOption[];
}

export default function TransferModal({ open, onCancel, onConfirm, count, options }: TransferModalProps) {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open) {
            form.resetFields();
        }
    }, [open, form]);

    const handleSubmit = () => {
        form.validateFields().then((values) => {
            onConfirm(values.toWarehouse, values.note);
        });
    };

    const getIcon = (opt: TransferOption) => {
        if (opt.icon) return opt.icon;
        if (opt.to.includes('READY')) return <CheckCircleOutlined />;
        if (opt.to.includes('DEFECT')) return <CloseCircleOutlined />;
        if (opt.to.includes('WARRANTY')) return <ToolOutlined />;
        if (opt.to.includes('SOLD')) return <ClockCircleOutlined />;
        return <ArrowRightOutlined />;
    };

    const getColor = (opt: TransferOption) => {
        if (opt.color) return opt.color;
        if (opt.to.includes('READY')) return '#52c41a';
        if (opt.to.includes('DEFECT')) return '#ff4d4f';
        if (opt.to.includes('WARRANTY')) return '#faad14';
        return '#1890ff';
    };

    return (
        <Modal
            title={`Chuyển ${count} serial`}
            open={open}
            onCancel={onCancel}
            width={600}
            footer={[
                <Button key="cancel" onClick={onCancel}>
                    Hủy
                </Button>,
                <Button key="submit" type="primary" onClick={handleSubmit}>
                    Xác nhận chuyển
                </Button>,
            ]}
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    label={<Text strong>Chọn kho đích</Text>}
                    name="toWarehouse"
                    rules={[{ required: true, message: 'Vui lòng chọn kho đích' }]}
                >
                    <Radio.Group style={{ width: '100%' }}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            {options.map((opt) => (
                                <Card
                                    key={opt.to}
                                    size="small"
                                    style={{
                                        cursor: 'pointer',
                                        borderColor: '#d9d9d9',
                                    }}
                                    hoverable
                                    onClick={() => form.setFieldValue('toWarehouse', opt.to)}
                                >
                                    <Radio value={opt.to} style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <span style={{ color: getColor(opt), fontSize: 20 }}>
                                                {getIcon(opt)}
                                            </span>
                                            <div>
                                                <div>
                                                    <Text strong>{opt.label}</Text>
                                                </div>
                                                {opt.description && (
                                                    <div>
                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                            {opt.description}
                                                        </Text>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Radio>
                                </Card>
                            ))}
                        </Space>
                    </Radio.Group>
                </Form.Item>

                <Form.Item label={<Text strong>Ghi chú</Text>} name="note">
                    <TextArea
                        placeholder="Nhập ghi chú (tùy chọn)"
                        rows={3}
                        maxLength={500}
                        showCount
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}
