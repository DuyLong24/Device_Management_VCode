import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import type { UserDTO } from '../../services/user-management.service';
import { roleService } from '../../services/role.service';
import type { RoleDTO } from '../../services/role.service';

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
    const [roles, setRoles] = useState<RoleDTO[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(false);

    useEffect(() => {
        if (visible) {
            loadRoles();
        }
    }, [visible]);

    useEffect(() => {
        if (user) {
            form.setFieldsValue({
                email: user.email,
                name: user.name,
                phoneNumber: user.phoneNumber,
                roleCode: user.role?.toLowerCase() || '', // SUPER_ADMIN → super_admin
            });
        }
    }, [user, form]);

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
        if (!user) return;

        try {
            const values = await form.validateFields();
            setLoading(true);

            await onUpdate(user.id, {
                name: values.name,
                phoneNumber: values.phoneNumber || '',
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
                    name="name"
                    rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                >
                    <Input placeholder="Nguyễn Văn A" />
                </Form.Item>

                <Form.Item label="Số điện thoại" name="phoneNumber">
                    <Input placeholder="0912345678" />
                </Form.Item>

                <Form.Item
                    label="Vai trò"
                    name="roleCode"
                >
                    <Select placeholder="Chọn vai trò" loading={loadingRoles}>
                        {roles.map(role => (
                            <Select.Option key={role.id} value={role.code}>
                                {role.name}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
}

