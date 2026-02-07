import { useState, useEffect } from 'react';
import {
    Card,
    Table,
    Tag,
    Typography,
    Space,
    Button,
    Empty,
    Spin,
    Alert,
    Tooltip,
    Modal,
    Form,
    Input,
    message,
    Popconfirm,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import {
    ReloadOutlined,
    EyeOutlined,
    SafetyOutlined,
    InfoCircleOutlined,
    PlusOutlined,
    DeleteOutlined,
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { roleService } from '../../services/role.service';
import type { RoleDTO } from '../../services/role.service';
import { useAuth } from '../../hooks/useAuth';

const { Title, Text } = Typography;

// config màu
const roleConfig: Record<string, { color: string; label: string }> = {
    super_admin: { color: 'red', label: 'Super Admin' },
    admin: { color: 'volcano', label: 'Admin' },
    user: { color: 'blue', label: 'User' },
};

export default function RoleManagementPage() {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const [roles, setRoles] = useState<RoleDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        loadRoles();
    }, []);

    const loadRoles = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await roleService.getAll();
            setRoles(result.data);
        } catch (err: any) {
            setError(err.message || 'Failed to load roles');
        } finally {
            setLoading(false);
        }
    };

    const handleViewPermission = (role: RoleDTO) => {
        navigate(`/system/roles/${role.id}`);
    };

    const handleCreateRole = async (values: { name: string; code: string; description?: string }) => {
        setCreating(true);
        try {
            await roleService.create({
                name: values.name,
                code: values.code.toLowerCase().replace(/\s+/g, '_'),
                description: values.description,
                permissions: [],
            });
            message.success('Tạo vai trò thành công!');
            setCreateModalVisible(false);
            form.resetFields();
            loadRoles();
        } catch (err: any) {
            message.error(err.response?.data?.message || 'Lỗi khi tạo vai trò');
        } finally {
            setCreating(false);
        }
    };

    // 3 roles hệ thống không được xóa
    const SYSTEM_ROLES = ['super_admin', 'admin', 'user'];

    const handleDeleteRole = async (role: RoleDTO) => {
        try {
            await roleService.delete(role.id);
            message.success(`Đã xóa vai trò "${role.name}"`);
            loadRoles();
        } catch (err: any) {
            message.error(err.response?.data?.message || 'Lỗi khi xóa vai trò');
        }
    };

    const columns: TableColumnsType<RoleDTO> = [
        {
            title: 'Tên vai trò',
            dataIndex: 'name',
            key: 'name',
            width: 180,
            render: (name, record) => (
                <Space>
                    <SafetyOutlined
                        className="text-base"
                        style={{ color: roleConfig[record.code]?.color || '#1890ff' }}
                    />
                    <Tag color={roleConfig[record.code]?.color || 'default'}>
                        {roleConfig[record.code]?.label || name}
                    </Tag>
                </Space>
            ),
        },
        {
            title: 'Mã vai trò',
            dataIndex: 'code',
            key: 'code',
            width: 180,
            render: (code) => <Text code>{code}</Text>,
        },
        {
            title: 'Số lượng quyền',
            dataIndex: 'permissions',
            key: 'permissions',
            width: 150,
            align: 'center',
            render: (permissions: string[]) => (
                <Tag color="blue">{permissions?.length || 0} quyền</Tag>
            ),
        },
        {
            title: 'Mô tả',
            key: 'description',
            render: (_, record) => {
                // Mô tả vai trò
                const descriptions: Record<string, string> = {
                    super_admin: 'Toàn quyền quản trị hệ thống, không bị giới hạn bởi bất kỳ quy tắc nào',
                    admin: 'Quản lý vận hành kho. Phê duyệt phiếu nhập/xuất/chuyển kho, sửa/xóa dữ liệu nguồn',
                    user: 'Nhân viên vận hành. Tạo phiếu, quét mã, kiểm kê',
                };
                return <Text type="secondary">{descriptions[record.code] || 'Không có mô tả'}</Text>;
            },
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 200,
            align: 'center',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Xem chi tiết phân quyền">
                        <Button
                            type="link"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewPermission(record)}
                        >
                            Xem phân quyền
                        </Button>
                    </Tooltip>
                    {!SYSTEM_ROLES.includes(record.code) && hasPermission('system.role:UPDATE') && (
                        <Popconfirm
                            title="Xóa vai trò"
                            description={`Bạn có chắc muốn xóa vai trò "${record.name}"?`}
                            onConfirm={() => handleDeleteRole(record)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                        >
                            <Tooltip title="Xóa vai trò">
                                <Button
                                    type="link"
                                    danger
                                    icon={<DeleteOutlined />}
                                />
                            </Tooltip>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div className="p-3">
            {/* Page Header */}
            <div className="mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <Title level={3} className="!m-0">
                            <Space>
                                Quản lý vai trò & phân quyền
                                <Tooltip
                                    title={
                                        <div className="text-[13px]">
                                            <div className="mb-1.5 font-bold">Lưu ý:</div>
                                            <div>• Hệ thống có <strong>3 vai trò cố định</strong> (Super Admin, Admin, User)</div>
                                            <div>• Chỉ <strong>Super Admin</strong> mới được chỉnh sửa phân quyền</div>
                                            <div>• Các vai trò khác chỉ có quyền xem (read-only)</div>
                                        </div>
                                    }
                                    placement="right"
                                >
                                    <InfoCircleOutlined className="text-base text-blue-500 cursor-help" />
                                </Tooltip>
                            </Space>
                        </Title>
                        <Text type="secondary">Xem và cấu hình phân quyền cho từng vai trò</Text>
                    </div>

                    <Space>
                        {hasPermission('system.role:UPDATE') && (
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => setCreateModalVisible(true)}
                            >
                                Tạo vai trò mới
                            </Button>
                        )}
                        <Button icon={<ReloadOutlined />} onClick={loadRoles} loading={loading}>
                            Làm mới
                        </Button>
                    </Space>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <Alert
                    message="Lỗi"
                    description={error}
                    type="error"
                    closable
                    onClose={() => setError(null)}
                    className="mb-4"
                />
            )}

            {/* Table */}
            <Card size="small">
                {loading && !roles.length ? (
                    <div className="text-center py-10">
                        <Spin size="large" />
                        <div className="mt-4">
                            <Text type="secondary">Đang tải dữ liệu...</Text>
                        </div>
                    </div>
                ) : (
                    <Table
                        dataSource={roles}
                        columns={columns}
                        rowKey="id"
                        pagination={false}
                        size="middle"
                        bordered
                        locale={{
                            emptyText: (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="Không có vai trò nào"
                                />
                            ),
                        }}
                    />
                )}
            </Card>

            {/* Create Role Modal */}
            <Modal
                title="Tạo vai trò mới"
                open={createModalVisible}
                onCancel={() => {
                    setCreateModalVisible(false);
                    form.resetFields();
                }}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreateRole}
                >
                    <Form.Item
                        name="name"
                        label="Tên vai trò"
                        rules={[
                            { required: true, message: 'Vui lòng nhập tên vai trò' },
                            { min: 2, message: 'Tên vai trò phải có ít nhất 2 ký tự' }
                        ]}
                    >
                        <Input placeholder="VD: Quản lý kho" />
                    </Form.Item>

                    <Form.Item
                        name="code"
                        label="Mã vai trò"
                        rules={[
                            { required: true, message: 'Vui lòng nhập mã vai trò' },
                            {
                                pattern: /^[a-z0-9_]+$/,
                                message: 'Chỉ chấp nhận chữ thường, số và gạch dưới'
                            }
                        ]}
                    >
                        <Input placeholder="VD: warehouse_manager" />
                    </Form.Item>

                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea rows={3} />
                    </Form.Item>

                    <Form.Item className="mb-0 text-right">
                        <Space>
                            <Button onClick={() => {
                                setCreateModalVisible(false);
                                form.resetFields();
                            }}>
                                Hủy
                            </Button>
                            <Button type="primary" htmlType="submit" loading={creating}>
                                Tạo vai trò
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
