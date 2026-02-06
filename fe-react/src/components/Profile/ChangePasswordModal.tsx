import { useState } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone, LockOutlined } from '@ant-design/icons';
import { userService } from '../../services/user-profile.service';
import { useAuth } from '../../hooks/useAuth';

interface ChangePasswordModalProps {
    open: boolean;
    onClose: () => void;
}

export const ChangePasswordModal = ({ open, onClose }: ChangePasswordModalProps) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const { logout } = useAuth();

    const handleSubmit = async (values: { currentPassword: string; newPassword: string }) => {
        setLoading(true);
        try {
            await userService.changePassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            });

            message.success('Đổi mật khẩu thành công! Đang đăng xuất...');
            form.resetFields();
            onClose();

            // Auto logout sau 1.5s
            setTimeout(() => {
                logout();
            }, 1500);
        } catch (error: any) {
            const errorMessage = error?.response?.data?.message || 'Đổi mật khẩu thất bại';
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        onClose();
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <LockOutlined />
                    <span>Đổi mật khẩu</span>
                </div>
            }
            open={open}
            onCancel={handleCancel}
            footer={null}
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                autoComplete="off"
            >
                <Form.Item
                    label="Mật khẩu hiện tại"
                    name="currentPassword"
                    rules={[
                        { required: true, message: 'Vui lòng nhập mật khẩu hiện tại' },
                        { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
                    ]}
                >
                    <Input.Password
                        placeholder="Nhập mật khẩu hiện tại"
                        iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                    />
                </Form.Item>

                <Form.Item
                    label="Mật khẩu mới"
                    name="newPassword"
                    rules={[
                        { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                        { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('currentPassword') !== value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error('Mật khẩu mới phải khác mật khẩu hiện tại'));
                            },
                        }),
                    ]}
                >
                    <Input.Password
                        placeholder="Nhập mật khẩu mới"
                        iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                    />
                </Form.Item>

                <Form.Item
                    label="Xác nhận mật khẩu mới"
                    name="confirmPassword"
                    dependencies={['newPassword']}
                    rules={[
                        { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('newPassword') === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error('Xác nhận mật khẩu không khớp'));
                            },
                        }),
                    ]}
                >
                    <Input.Password
                        placeholder="Nhập lại mật khẩu mới"
                        iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                    />
                </Form.Item>

                <Form.Item className="mb-0">
                    <div className="flex justify-end gap-2">
                        <Button onClick={handleCancel}>
                            Hủy
                        </Button>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            Đổi mật khẩu
                        </Button>
                    </div>
                </Form.Item>
            </Form>
        </Modal>
    );
};
