
import { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, message } from 'antd';
import { sharedDataService } from '../../../services/shared-data.service';
import type { SharedData } from '../../../services/shared-data.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CreateEditDataModalProps {
    open: boolean;
    onCancel: () => void;
    data?: SharedData | null; // If null -> Create mode
    groupId: string; // Parent Group ID
}

export const CreateEditDataModal = ({ open, onCancel, data, groupId }: CreateEditDataModalProps) => {
    const [form] = Form.useForm();
    const queryClient = useQueryClient();
    const isEdit = !!data;

    useEffect(() => {
        if (open) {
            if (data) {
                form.setFieldsValue(data);
            } else {
                form.resetFields();
                form.setFieldValue('order', 0);
            }
        }
    }, [open, data, form]);

    const mutation = useMutation({
        mutationFn: async (values: any) => {
            const payload = { ...values, groupId };
            if (isEdit && data) {
                return sharedDataService.updateData(data._id, payload);
            } else {
                return sharedDataService.createData(payload);
            }
        },
        onSuccess: () => {
            message.success(isEdit ? 'Cập nhật dữ liệu thành công' : 'Thêm dữ liệu mới thành công');
            queryClient.invalidateQueries({ queryKey: ['shared-data-list', groupId] });
            onCancel();
        },
        onError: () => {
            message.error('Có lỗi xảy ra');
        }
    });

    const handleOk = () => {
        form.validateFields().then(values => {
            mutation.mutate(values);
        });
    };

    return (
        <Modal
            title={isEdit ? "Cập nhật Dữ liệu" : "Thêm Dữ liệu mới"}
            open={open}
            onOk={handleOk}
            onCancel={onCancel}
            confirmLoading={mutation.isPending}
            destroyOnClose
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    name="code"
                    label="Mã dữ liệu"
                    rules={[{ required: true, message: 'Vui lòng nhập mã' }]}
                >
                    <Input disabled={isEdit} placeholder="VD: VN, IMPORT..." className="font-mono uppercase" />
                </Form.Item>
                <Form.Item
                    name="name"
                    label="Tên hiển thị"
                    rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
                >
                    <Input placeholder="VD: Việt Nam, Nhập khẩu..." />
                </Form.Item>
                <Form.Item
                    name="order"
                    label="Thứ tự sắp xếp"
                >
                    <InputNumber className="w-full" />
                </Form.Item>
                <Form.Item
                    name="description"
                    label="Mô tả"
                >
                    <Input.TextArea rows={2} />
                </Form.Item>
            </Form>
        </Modal>
    );
};
