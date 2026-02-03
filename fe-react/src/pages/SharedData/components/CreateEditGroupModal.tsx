
import { useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { sharedDataService } from '../../../services/shared-data.service';
import type { SharedDataGroup } from '../../../services/shared-data.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CreateEditGroupModalProps {
    open: boolean;
    onCancel: () => void;
    group?: SharedDataGroup | null; // If null -> Create mode
}

export const CreateEditGroupModal = ({ open, onCancel, group }: CreateEditGroupModalProps) => {
    const [form] = Form.useForm();
    const queryClient = useQueryClient();
    const isEdit = !!group;

    useEffect(() => {
        if (open) {
            if (group) {
                form.setFieldsValue(group);
            } else {
                form.resetFields();
            }
        }
    }, [open, group, form]);

    const mutation = useMutation({
        mutationFn: async (values: any) => {
            if (isEdit && group) {
                return sharedDataService.updateGroup(group._id, values);
            } else {
                return sharedDataService.createGroup(values);
            }
        },
        onSuccess: () => {
            message.success(isEdit ? 'Cập nhật nhóm thành công' : 'Tạo nhóm mới thành công');
            queryClient.invalidateQueries({ queryKey: ['shared-data-groups'] });
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
            title={isEdit ? "Cập nhật Nhóm dữ liệu" : "Tạo Nhóm dữ liệu mới"}
            open={open}
            onOk={handleOk}
            onCancel={onCancel}
            confirmLoading={mutation.isPending}
            destroyOnClose
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    name="code"
                    label="Mã nhóm"
                    rules={[{ required: true, message: 'Vui lòng nhập mã nhóm' }]}
                >
                    <Input disabled={isEdit} placeholder="VD: ORIGIN, UNIT..." className="font-mono uppercase" />
                </Form.Item>
                <Form.Item
                    name="name"
                    label="Tên nhóm"
                    rules={[{ required: true, message: 'Vui lòng nhập tên nhóm' }]}
                >
                    <Input placeholder="VD: Nguồn gốc, Đơn vị tính..." />
                </Form.Item>
                <Form.Item
                    name="description"
                    label="Mô tả"
                >
                    <Input.TextArea rows={3} />
                </Form.Item>
            </Form>
        </Modal>
    );
};
