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
                        style={{
                            color: roleConfig[record.code]?.color || '#1890ff',
                            fontSize: 16
                        }}
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
        <div style={{ padding: 24 }}>
            {/* Page Header */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            Quản lý vai trò & phân quyền
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

            {/* Info Alert */}
            <Card
                size="small"
                style={{
                    marginBottom: 16,
                    backgroundColor: '#e6f7ff',
                    borderColor: '#91d5ff'
                }}
            >
                <Space direction="vertical" size={4}>
                    <Text strong style={{ color: '#0050b3' }}>
                        Lưu ý:
                    </Text>
                    <Text style={{ color: '#0050b3' }}>
                        • Hệ thống có <strong>3 vai trò cố định</strong> (Super Admin, Admin, User), không thể thêm/xóa vai trò mới
                    </Text>
                    <Text style={{ color: '#0050b3' }}>
                        • Chỉ <strong>Super Admin</strong> mới được chỉnh sửa phân quyền
                    </Text>
                    <Text style={{ color: '#0050b3' }}>
                        • Các vai trò khác chỉ có quyền xem (read-only)
                    </Text>
                </Space>
            </Card>

            {/* Error Alert */}
            {error && (
                <Alert
                    message="Lỗi"
                    description={error}
                    type="error"
                    closable
                    onClose={() => setError(null)}
                    style={{ marginBottom: 16 }}
                />
            )}

            {/* Table */}
            <Card size="small">
                {loading && !roles.length ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Spin size="large" />
                        <div style={{ marginTop: 16 }}>
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
