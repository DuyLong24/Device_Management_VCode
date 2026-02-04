import { useState } from 'react';
import { Modal, Form, Input, Checkbox, Alert, message } from 'antd';
import type { UserDTO } from '../../services/user-management.service';

interface ResetPasswordModalProps {
    visible: boolean;
    user: UserDTO | null;
    onSuccess: () => void;
    onCancel: () => void;
    onReset: (id: string, password: string, mustChange: boolean) => Promise<void>;
}

export default function ResetPasswordModal({ visible, user, onSuccess, onCancel, onReset }: ResetPasswordModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!user) return;

        try {
            const values = await form.validateFields();
            setLoading(true);

            await onReset(user.id, values.password, values.mustChange ?? true);

            message.success('Mật khẩu đã được reset!');
            form.resetFields();
            onSuccess();
        } catch (error: any) {
            if (error.errorFields) return;
            message.error(error.message || 'Không thể reset mật khẩu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Reset mật khẩu"
            open={visible}
            onOk={handleSubmit}
            onCancel={onCancel}
            confirmLoading={loading}
            okText="Reset mật khẩu"
            cancelText="Hủy"
            width={500}
        >
            <Alert
                type="warning"
                message={`Reset mật khẩu cho: ${user?.email}`}
                className="mb-4"
            />

            <Form
                form={form}
                layout="vertical"
                initialValues={{ mustChange: true }}
            >
                <Form.Item
                    label="Mật khẩu mới"
                    name="password"
                    rules={[
                        { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                        { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
                    ]}
                >
                    <Input.Password placeholder="Nhập mật khẩu mới" />
                </Form.Item>

                <Form.Item
                    label="Nhập lại mật khẩu"
                    name="confirmPassword"
                    dependencies={['password']}
                    rules={[
                        { required: true, message: 'Vui lòng nhập lại mật khẩu' },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('password') === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error('Mật khẩu không khớp!'));
                            },
                        }),
                    ]}
                >
                    <Input.Password placeholder="Nhập lại mật khẩu" />
                </Form.Item>

                <Form.Item name="mustChange" valuePropName="checked">
                    <Checkbox>Bắt buộc đổi mật khẩu khi đăng nhập lần đầu</Checkbox>
                </Form.Item>
            </Form>
        </Modal>
    );
}
