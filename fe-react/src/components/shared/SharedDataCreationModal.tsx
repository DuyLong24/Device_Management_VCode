import { Modal, Form, Input, Button, App } from 'antd';
import { generateProjectCode } from '../../utils/string.helper';
import { sharedDataService } from '../../services/shared-data.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '../../utils/logger';

interface SharedDataCreationModalProps {
    open: boolean;
    onCancel: () => void;
    initialName?: string;
    groupCode: string;
    title: string;
    onSuccess: (code: string, name: string) => void;
}

export const SharedDataCreationModal = ({
    open,
    onCancel,
    initialName,
    groupCode,
    title,
    onSuccess,
}: SharedDataCreationModalProps) => {
    const [form] = Form.useForm();
    const { message } = App.useApp();
    const queryClient = useQueryClient();

    const { mutate: createItem, isPending } = useMutation({
        mutationFn: async (values: { name: string; code: string }) => {
            const groups = await sharedDataService.getGroups();
            const targetGroup = groups.find((g: any) => g.code === groupCode);
            if (!targetGroup) throw new Error(`Không tìm thấy nhóm dữ liệu ${groupCode}`);

            return sharedDataService.createData({
                code: values.code,
                name: values.name,
                description: `Tạo tự động`,
                groupId: targetGroup._id,
                order: 99,
            });
        },
        onSuccess: (data) => {
            message.success('Đã tạo mới thành công');
            queryClient.invalidateQueries({ queryKey: [groupCode.toLowerCase()] });
            onSuccess(data.code, data.name);
            form.resetFields();
            onCancel();
        },
        onError: (error) => {
            logger.error(`Failed to create SharedData [${groupCode}]`, { error });
            message.error('Không thể tạo mới. Vui lòng thử lại.');
        },
    });

    return (
        <Modal title={title} open={open} onCancel={onCancel} footer={null}>
            <div className="p-4">
                <p className="mb-4 text-gray-600">
                    Mục <strong>"{initialName}"</strong> chưa tồn tại. Bạn có muốn tạo mới không?
                </p>
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{
                        name: initialName,
                        code: generateProjectCode(initialName || ''),
                    }}
                    onFinish={createItem}
                >
                    <Form.Item
                        name="name"
                        label="Tên hiển thị"
                        rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="code"
                        label="Mã định danh"
                        rules={[{ required: true, message: 'Vui lòng nhập mã' }]}
                    >
                        <Input />
                    </Form.Item>
                    <div className="flex justify-end space-x-2 mt-3">
                        <Button onClick={onCancel}>Hủy</Button>
                        <Button type="primary" htmlType="submit" loading={isPending}>
                            Tạo mới
                        </Button>
                    </div>
                </Form>
            </div>
        </Modal>
    );
};
