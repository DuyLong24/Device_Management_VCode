import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Checkbox, message } from 'antd';
import { roleService } from '../../services/role.service';
import type { RoleDTO } from '../../services/role.service';

interface CreateUserModalProps {
    visible: boolean;
    onSuccess: () => void;
    onCancel: () => void;
    onCreate: (data: any) => Promise<void>;
}

export default function CreateUserModal({ visible, onSuccess, onCancel, onCreate }: CreateUserModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [roles, setRoles] = useState<RoleDTO[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(false);

    useEffect(() => {
        if (visible) {
            loadRoles();
        }
    }, [visible]);

    const loadRoles = async () => {
        setLoadingRoles(true);
        try {
            const result = await roleService.getAll();
            setRoles(result.data);
        } catch (error) {
            console.error('Failed to load roles', error);
        } finally {
            setLoadingRoles(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            // Transform fullName → name, phone → phoneNumber
            await onCreate({
                email: values.email,
                name: values.name,
                phoneNumber: values.phoneNumber || '',
                roleCode: values.roleCode,
                temporaryPassword: values.password,
                mustChangePassword: values.mustChangePassword ?? true,
            });

            message.success('Tài khoản đã tạo thành công!');
            form.resetFields();
            onSuccess();
        } catch (error: any) {
            if (error.errorFields) return; // Validation error
            message.error(error.message || 'Không thể tạo tài khoản');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Thêm tài khoản mới"
            open={visible}
            onOk={handleSubmit}
            onCancel={onCancel}
            confirmLoading={loading}
            okText="Tạo tài khoản"
            cancelText="Hủy"
            width={600}
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{ mustChangePassword: true }}
            >
                <Form.Item
                    label="Email"
                    name="email"
                    rules={[
                        { required: true, message: 'Vui lòng nhập email' },
                        { type: 'email', message: 'Email không hợp lệ' },
                    ]}
                >
                    <Input placeholder="user@example.com" />
                </Form.Item>

                <Form.Item
                    label="Họ tên"
                    name="name"
                    rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                >
                    <Input placeholder="Nguyễn Văn A" />
                </Form.Item>

                <Form.Item
                    label="Số điện thoại"
                    name="phoneNumber"
                >
                    <Input placeholder="0912345678" />
                </Form.Item>

                <Form.Item
                    label="Vai trò"
                    name="roleCode"
                    rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
                >
                    <Select placeholder="Chọn vai trò" loading={loadingRoles}>
                        {roles.map(role => (
                            <Select.Option key={role.id} value={role.code}>
                                {role.name}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    label="Mật khẩu tạm thời"
                    name="password"
                    rules={[
                        { required: true, message: 'Vui lòng nhập mật khẩu' },
                        { min: 8, message: 'Mật khẩu tối thiểu 8 ký tự' },
                    ]}
                >
                    <Input.Password placeholder="Nhập mật khẩu tạm (tối thiểu 8 ký tự)" />
                </Form.Item>

                <Form.Item name="mustChangePassword" valuePropName="checked">
                    <Checkbox>Bắt buộc đổi mật khẩu khi đăng nhập lần đầu</Checkbox>
                </Form.Item>
            </Form>
        </Modal>
    );
}
