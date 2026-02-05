import { Card, Row, Col, Form, Input, Select, InputNumber, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { sharedDataService } from '../../../services/shared-data.service';
import { categoryService } from '../../../services/category.service';
import { userManagementService } from '../../../services/user-management.service';

const { TextArea } = Input;

interface ExportGeneralInfoProps {
    onProjectSearch: (value: string) => void;
    onProjectBlur: () => void;
    onProjectKeyDown: (e: any) => void;
}

export const ExportGeneralInfo = ({
    onProjectSearch,
    onProjectBlur,
    onProjectKeyDown
}: ExportGeneralInfoProps) => {

    // 1. Projects
    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const res = await sharedDataService.getDataByGroupCode('PROJECT');
            return res || [];
        },
        staleTime: 5 * 60 * 1000,
        select: (data) => data.map((p: any) => ({ label: p.name, value: p.code }))
    });

    // 2. Categories
    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: () => categoryService.getAll(),
        staleTime: 60 * 60 * 1000,
        select: (data: any[]) => data.map(c => ({ label: c.name, value: c.name }))
    });

    // 3. Admins
    const { data: admins = [] } = useQuery({
        queryKey: ['admins'],
        queryFn: () => userManagementService.getAll({ limit: 100 }),
        staleTime: 5 * 60 * 1000,
        select: (res: any) => {
            const users = res.data || [];
            return users
                .filter((u: any) => {
                    const roleCode = u.role?.code || u.role;
                    return /admin/i.test(String(roleCode));
                })
                .map((u: any) => ({
                    label: `${u.name} (${u.username || u.email})`,
                    value: u.id || u._id
                }));
        }
    });

    return (
        <Card title="Thông tin chung phiếu xuất" className="mb-6 shadow-sm">
            <Row gutter={16}>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="code"
                        label={
                            <span>
                                Mã phiếu xuất{' '}
                                <Tooltip title="Mã tự sinh theo đợt xuất kho, có thể chỉnh sửa">
                                    <InfoCircleOutlined className="text-gray-400" />
                                </Tooltip>
                            </span>
                        }
                        rules={[{ required: true, message: 'Vui lòng nhập mã phiếu' }]}
                    >
                        <Input className="font-semibold text-blue-600" />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="exportName"
                        label="Tên phiếu xuất"
                        rules={[{ required: true, message: 'Vui lòng nhập tên phiếu' }]}
                    >
                        <Input />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="type"
                        label="Loại hàng hóa xuất kho"
                        rules={[{ required: true, message: 'Vui lòng chọn loại hàng hóa' }]}
                    >
                        <Select
                            showSearch
                            options={categories}
                            placeholder="Chọn loại hàng hóa"
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="exportReason"
                        label="Lý do xuất kho"
                    >
                        <Input />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="assignedApprover"
                        label="Người duyệt (Chỉ định)"
                        rules={[{ required: true, message: 'Vui lòng chọn người duyệt' }]}
                    >
                        <Select
                            allowClear
                            placeholder="Chọn người duyệt"
                            options={admins}
                            showSearch
                            filterOption={(input, option) =>
                                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="project"
                        label="Dự án nhận"
                    >
                        <Select
                            placeholder="Chọn hoặc nhập tên dự án mới"
                            options={projects}
                            showSearch
                            onSearch={onProjectSearch}
                            onBlur={onProjectBlur}
                            onKeyDown={onProjectKeyDown}
                            filterOption={(input, option) =>
                                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col xs={24} md={12}>
                    <Form.Item name="receiverPerson" label="Người nhận">
                        <Input />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="receiver"
                        label="Đơn vị nhận"
                    >
                        <Input />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="activationDays"
                        label={
                            <span>
                                Kích hoạt bảo hành sau (ngày)
                                <Tooltip title="0: Kích hoạt ngay khi xuất. >0: Chờ X ngày sau khi xuất mới kích hoạt.">
                                    <InfoCircleOutlined className="ml-1 text-gray-400" />
                                </Tooltip>
                            </span>
                        }
                        initialValue={0}
                    >
                        <InputNumber min={0} className="w-full" addonAfter="Ngày" />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="defaultWarrantyMonths"
                        label="Thời hạn bảo hành (Tháng)"
                        initialValue={12}
                    >
                        <InputNumber min={0} className="w-full" addonAfter="Tháng" />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col xs={24} md={8}>
                    <Form.Item
                        name="customer"
                        label="Khách hàng"
                    >
                        <Input />
                    </Form.Item>
                </Col>
                <Col xs={24} md={16}>
                    <Form.Item
                        name="deliveryAddress"
                        label="Địa chỉ giao hàng"
                    >
                        <Input />
                    </Form.Item>
                </Col>
            </Row>

            <Row>
                <Col span={24}>
                    <Form.Item name="notes" label="Ghi chú">
                        <TextArea rows={3} maxLength={500} showCount />
                    </Form.Item>
                </Col>
            </Row>
        </Card>
    );
};
