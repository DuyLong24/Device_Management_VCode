import {
    Card,
    Table,
    Button,
    Input,
    Select,
    DatePicker,
    Space,
    Tag,
    Typography,
    Empty,
    Spin,
    Tooltip,
} from 'antd';
import {
    PlusOutlined,
    ReloadOutlined,
    EditOutlined,
    LockOutlined,
    UnlockOutlined,
    KeyOutlined,
    ExportOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import dayjs from 'dayjs';
import type { UserDTO } from '../../services/user-management.service';
import { useUserManagement } from '../../hooks/useUserManagement';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';
import ResetPasswordModal from './ResetPasswordModal';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const roleConfig: Record<string, { color: string; label: string }> = {
    SUPER_ADMIN: { color: 'red', label: 'Super Admin' },
    ADMIN: { color: 'volcano', label: 'Admin' },
    USER: { color: 'blue', label: 'User' },
};

const statusConfig: Record<string, { color: string; label: string }> = {
    ACTIVE: { color: 'success', label: 'Hoạt động' },
    LOCKED: { color: 'default', label: 'Đã khóa' },
    PENDING: { color: 'warning', label: 'Chờ xử lý' },
};

export default function UserManagementPage() {
    const {
        users,
        loading,
        filters,
        total,
        setFilters,
        loadUsers,
        handleLock,
        handleUnlock,
        handleExport,
        createModalVisible,
        editModalVisible,
        resetPasswordModalVisible,
        selectedUser,
        openCreateModal,
        openEditModal,
        openResetPasswordModal,
        handleCreate,
        handleUpdate,
        handleResetPassword,
        closeCreateModal,
        closeEditModal,
        closeResetPasswordModal,
    } = useUserManagement();

    const columns: TableColumnsType<UserDTO> = [
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            width: 250,
            render: (email) => <Text strong>{email}</Text>,
        },
        {
            title: 'Họ tên',
            dataIndex: 'fullName',
            key: 'fullName',
            width: 180,
        },
        {
            title: 'Số điện thoại',
            dataIndex: 'phone',
            key: 'phone',
            width: 130,
            render: (phone) => phone || <Text type="secondary">-</Text>,
        },
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            width: 140,
            render: (role) => (
                <Tag color={roleConfig[role]?.color || 'default'}>
                    {roleConfig[role]?.label || role}
                </Tag>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            align: 'center',
            render: (status) => (
                <Tag color={statusConfig[status]?.color || 'default'}>
                    {statusConfig[status]?.label || status}
                </Tag>
            ),
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 150,
            render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 180,
            align: 'center',
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Sửa">
                        <Button
                            type="link"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => openEditModal(record)}
                        />
                    </Tooltip>

                    {record.status === 'ACTIVE' ? (
                        <Tooltip title="Khóa tài khoản">
                            <Button
                                type="link"
                                size="small"
                                danger
                                icon={<LockOutlined />}
                                onClick={() => handleLock(record)}
                            />
                        </Tooltip>
                    ) : (
                        <Tooltip title="Mở khóa">
                            <Button
                                type="link"
                                size="small"
                                icon={<UnlockOutlined />}
                                onClick={() => handleUnlock(record)}
                            />
                        </Tooltip>
                    )}

                    <Tooltip title="Reset mật khẩu">
                        <Button
                            type="link"
                            size="small"
                            icon={<KeyOutlined />}
                            onClick={() => openResetPasswordModal(record)}
                        />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            Quản lý tài khoản
                        </Title>
                        <Text type="secondary">Quản lý người dùng trong hệ thống</Text>
                    </div>

                    <Space>
                        <Button icon={<ExportOutlined />} onClick={handleExport}>
                            Xuất Excel
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                            Thêm tài khoản
                        </Button>
                    </Space>
                </div>
            </div>

            <Card size="small" style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Input
                        placeholder="Tìm theo email hoặc tên"
                        prefix={<SearchOutlined />}
                        style={{ width: 250 }}
                        allowClear
                        onChange={(e) =>
                            setFilters({ ...filters, keyword: e.target.value, page: 1 })
                        }
                    />

                    <Select
                        placeholder="Vai trò"
                        style={{ width: 150 }}
                        allowClear
                        onChange={(value) =>
                            setFilters({ ...filters, roleCode: value, page: 1 })
                        }
                    >
                        <Select.Option value="super_admin">Super Admin</Select.Option>
                        <Select.Option value="admin">Admin</Select.Option>
                        <Select.Option value="user">User</Select.Option>
                    </Select>

                    <Select
                        placeholder="Trạng thái"
                        style={{ width: 150 }}
                        allowClear
                        onChange={(value) =>
                            setFilters({ ...filters, status: value, page: 1 })
                        }
                    >
                        <Select.Option value="active">Hoạt động</Select.Option>
                        <Select.Option value="inactive">Đã khóa</Select.Option>
                        <Select.Option value="pending">Chờ xử lý</Select.Option>
                    </Select>

                    <RangePicker
                        placeholder={['Từ ngày', 'Đến ngày']}
                        format="DD/MM/YYYY"
                        onChange={(dates) => {
                            setFilters({
                                ...filters,
                                fromDate: dates?.[0]?.toISOString(),
                                toDate: dates?.[1]?.toISOString(),
                                page: 1,
                            });
                        }}
                    />

                    <Button icon={<ReloadOutlined />} onClick={loadUsers} loading={loading}>
                        Làm mới
                    </Button>
                </Space>
            </Card>

            <Card size="small">
                {loading && !users.length ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Spin size="large" />
                        <div style={{ marginTop: 16 }}>
                            <Text type="secondary">Đang tải dữ liệu...</Text>
                        </div>
                    </div>
                ) : (
                    <Table
                        dataSource={users}
                        columns={columns}
                        rowKey="id"
                        loading={loading}
                        size="middle"
                        bordered
                        scroll={{ x: 1200 }}
                        pagination={{
                            current: filters.page,
                            pageSize: filters.limit,
                            total,
                            showTotal: (total) => `Tổng ${total} tài khoản`,
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '20', '50', '100'],
                            onChange: (page, limit) => {
                                setFilters({ ...filters, page, limit });
                            },
                        }}
                        locale={{
                            emptyText: (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="Không có tài khoản nào"
                                />
                            ),
                        }}
                    />
                )}
            </Card>

            {/* Modals */}
            <CreateUserModal
                visible={createModalVisible}
                onSuccess={loadUsers}
                onCancel={closeCreateModal}
                onCreate={handleCreate}
            />

            <EditUserModal
                visible={editModalVisible}
                user={selectedUser}
                onSuccess={loadUsers}
                onCancel={closeEditModal}
                onUpdate={handleUpdate}
            />

            <ResetPasswordModal
                visible={resetPasswordModalVisible}
                user={selectedUser}
                onSuccess={loadUsers}
                onCancel={closeResetPasswordModal}
                onReset={handleResetPassword}
            />
        </div>
    );
}
