import { Modal, Form, Input, Button, App } from 'antd';
import { generateProjectCode } from '../../../utils/string.helper';
import { sharedDataService } from '../../../services/shared-data.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '../../../utils/logger';

interface ProjectCreationModalProps {
    open: boolean;
    onCancel: () => void;
    initialName?: string;
    onSuccess: (code: string, name: string) => void;
}

export const ProjectCreationModal = ({ open, onCancel, initialName, onSuccess }: ProjectCreationModalProps) => {
    const [form] = Form.useForm();
    const { message } = App.useApp();
    const queryClient = useQueryClient();

    const { mutate: createProject, isPending } = useMutation({
        mutationFn: async (values: { name: string; code: string }) => {
            const groups = await sharedDataService.getGroups();
            const projectGroup = groups.find((g: any) => g.code === 'PROJECT');
            if (!projectGroup) throw new Error('Không tìm thấy nhóm dữ liệu PROJECT');

            return sharedDataService.createData({
                code: values.code,
                name: values.name,
                description: 'Tạo tự động từ Phiếu xuất kho',
                groupId: projectGroup._id,
                order: 99
            });
        },
        onSuccess: (data) => {
            message.success('Đã tạo dự án mới');
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            onSuccess(data.code, data.name);
            onCancel();
        },
        onError: (error) => {
            logger.error('Failed to create project', { error });
            message.error('Không thể tạo dự án mới');
        }
    });

    return (
        <Modal
            title="Tạo Dự án Mới?"
            open={open}
            onCancel={onCancel}
            footer={null}
        >
            <div className="p-4">
                <p className="mb-4 text-gray-600">
                    Dự án <strong>"{initialName}"</strong> chưa tồn tại. Bạn có muốn tạo mới không?
                </p>
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{
                        name: initialName,
                        code: generateProjectCode(initialName || '')
                    }}
                    onFinish={createProject}
                >
                    <Form.Item
                        name="name"
                        label="Tên dự án"
                        rules={[{ required: true, message: 'Vui lòng nhập tên dự án' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="code"
                        label="Mã dự án (Tự sinh)"
                        rules={[{ required: true, message: 'Vui lòng nhập mã dự án' }]}
                    >
                        <Input />
                    </Form.Item>
                    <div className="flex justify-end space-x-2 mt-3">
                        <Button onClick={onCancel}>Hủy</Button>
                        <Button type="primary" htmlType="submit" loading={isPending}>
                            Tạo Dự án
                        </Button>
                    </div>
                </Form>
            </div>
        </Modal>
    );
};
