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
} from 'antd';
import {
    ReloadOutlined,
    EyeOutlined,
    SafetyOutlined,
    InfoCircleOutlined,
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { roleService } from '../../services/role.service';
import type { RoleDTO } from '../../services/role.service';

const { Title, Text } = Typography;

// config màu
const roleConfig: Record<string, { color: string; label: string }> = {
    super_admin: { color: 'red', label: 'Super Admin' },
    admin: { color: 'volcano', label: 'Admin' },
    user: { color: 'blue', label: 'User' },
};

export default function RoleManagementPage() {
    const [roles, setRoles] = useState<RoleDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        console.log('View permissions for role:', role);
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
            width: 150,
            align: 'center',
            render: (_, record) => (
                <Tooltip title="Xem chi tiết phân quyền">
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewPermission(record)}
                    >
                        Xem phân quyền
                    </Button>
                </Tooltip>
            ),
        },
    ];

    return (
        <div className="p-6">
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
        </div>
    );
}
