import { useState } from 'react';
import { Modal, Form, Input, DatePicker, Button, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { userService, type UserProfile } from '../../services/user-profile.service';

interface EditProfileModalProps {
    open: boolean;
    onClose: () => void;
    currentProfile: UserProfile;
    onSuccess: () => void;
}

export const EditProfileModal = ({ open, onClose, currentProfile, onSuccess }: EditProfileModalProps) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (values: {
        name: string;
        phoneNumber?: string;
        dateOfBirth?: dayjs.Dayjs;
    }) => {
        setLoading(true);
        try {
            const updateData: Partial<UserProfile> = {
                name: values.name,
            };

            if (values.phoneNumber) {
                updateData.phoneNumber = values.phoneNumber;
            }

            if (values.dateOfBirth) {
                updateData.dateOfBirth = values.dateOfBirth.format('YYYY-MM-DD');
            }

            await userService.updateMyProfile(updateData);

            message.success('Cập nhật thông tin thành công!');
            form.resetFields();
            onSuccess();
            onClose();
        } catch (error: any) {
            const errorMessage = error?.response?.data?.message || 'Cập nhật thông tin thất bại';
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        onClose();
    };

    // Tự động fill form khi modal mở
    const handleOpen = () => {
        if (open) {
            form.setFieldsValue({
                name: currentProfile.name,
                phoneNumber: currentProfile.phoneNumber || undefined,
                dateOfBirth: currentProfile.dateOfBirth ? dayjs(currentProfile.dateOfBirth) : undefined,
            });
        }
    };

    useState(() => {
        handleOpen();
    });

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <EditOutlined />
                    <span>Chỉnh sửa thông tin</span>
                </div>
            }
            open={open}
            onCancel={handleCancel}
            footer={null}
            destroyOnClose
            afterOpenChange={handleOpen}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                    name: currentProfile.name,
                    phoneNumber: currentProfile.phoneNumber || undefined,
                    dateOfBirth: currentProfile.dateOfBirth ? dayjs(currentProfile.dateOfBirth) : undefined,
                }}
            >
                <Form.Item
                    label="Họ và tên"
                    name="name"
                    rules={[
                        { required: true, message: 'Vui lòng nhập họ và tên' },
                        { min: 1, message: 'Tên phải có ít nhất 1 ký tự' },
                    ]}
                >
                    <Input placeholder="Nhập họ và tên" />
                </Form.Item>

                <Form.Item
                    label="Số điện thoại"
                    name="phoneNumber"
                    rules={[
                        { pattern: /^[0-9]{10}$/, message: 'Số điện thoại phải có đúng 10 chữ số' },
                    ]}
                >
                    <Input placeholder="Nhập số điện thoại (10 số)" maxLength={10} />
                </Form.Item>

                <Form.Item
                    label="Ngày sinh"
                    name="dateOfBirth"
                >
                    <DatePicker
                        format="DD/MM/YYYY"
                        placeholder="Chọn ngày sinh"
                        className="w-full"
                        disabledDate={(current) => current && current > dayjs().endOf('day')}
                    />
                </Form.Item>

                <Form.Item className="mb-0">
                    <div className="flex justify-end gap-2">
                        <Button onClick={handleCancel}>
                            Hủy
                        </Button>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            Lưu thay đổi
                        </Button>
                    </div>
                </Form.Item>
            </Form>
        </Modal>
    );
};
