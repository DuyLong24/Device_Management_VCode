import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import type { UserDTO } from '../../services/user-management.service';

interface EditUserModalProps {
    visible: boolean;
    user: UserDTO | null;
    onSuccess: () => void;
    onCancel: () => void;
    onUpdate: (id: string, data: any) => Promise<void>;
}

export default function EditUserModal({ visible, user, onSuccess, onCancel, onUpdate }: EditUserModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            form.setFieldsValue({
                email: user.email,
                fullName: user.fullName,
                phone: user.phone,
                roleCode: user.role?.toLowerCase() || '', // SUPER_ADMIN → super_admin
            });
        }
    }, [user, form]);

    const handleSubmit = async () => {
        if (!user) return;

        try {
            const values = await form.validateFields();
            setLoading(true);

            // Transform fullName → name, phone → phoneNumber
            await onUpdate(user.id, {
                name: values.fullName,
                phoneNumber: values.phone || '',
                roleCode: values.roleCode,
            });

            message.success('Cập nhật thành công!');
            onSuccess();
        } catch (error: any) {
            if (error.errorFields) return;
            message.error(error.message || 'Không thể cập nhật tài khoản');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Chỉnh sửa tài khoản"
            open={visible}
            onOk={handleSubmit}
            onCancel={onCancel}
            confirmLoading={loading}
            okText="Lưu thay đổi"
            cancelText="Hủy"
            width={600}
        >
            <Form form={form} layout="vertical">
                <Form.Item label="Email" name="email">
                    <Input disabled />
                </Form.Item>

                <Form.Item
                    label="Họ tên"
                    name="fullName"
                    rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                >
                    <Input placeholder="Nguyễn Văn A" />
                </Form.Item>

                <Form.Item label="Số điện thoại" name="phone">
                    <Input placeholder="0912345678" />
                </Form.Item>

                <Form.Item
                    label="Vai trò"
                    name="roleCode"
                >
                    <Select placeholder="Chọn vai trò">
                        <Select.Option value="super_admin">Super Admin</Select.Option>
                        <Select.Option value="admin">Admin</Select.Option>
                        <Select.Option value="user">User</Select.Option>
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
}
