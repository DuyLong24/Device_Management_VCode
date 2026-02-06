import { useState } from 'react';
import { Card, Descriptions, Tag, Button, Spin, Space, Row, Col, Typography } from 'antd';
import { UserOutlined, LockOutlined, ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../../hooks/useProfile';
import { ChangePasswordModal } from '../../components/Profile/ChangePasswordModal';
import { EditProfileModal } from '../../components/Profile/EditProfileModal';

const { Title, Text } = Typography;

const ProfilePage = () => {
    const navigate = useNavigate();
    const { profile, isLoading, refetch } = useProfile();
    const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
    const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Spin size="large" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Text type="secondary">Không tìm thấy thông tin tài khoản</Text>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/dashboard')}
                    type="text"
                    className="mb-4"
                >
                    Quay lại
                </Button>
                <Title level={3}>Thông tin tài khoản</Title>
            </div>

            <Row gutter={24}>
                {/* Cột trái: Thông tin cơ bản */}
                <Col xs={24} lg={8}>
                    <Card className="shadow-sm text-center">
                        <div className="flex flex-col items-center">
                            {/* Avatar placeholder */}
                            <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                                <UserOutlined style={{ fontSize: 64, color: '#1677ff' }} />
                            </div>

                            <Title level={4} className="!mb-2">{profile.name}</Title>
                            <Text type="secondary" className="block mb-4">{profile.email}</Text>

                            <Button
                                type="primary"
                                icon={<LockOutlined />}
                                block
                                onClick={() => setChangePasswordModalOpen(true)}
                            >
                                Đổi mật khẩu
                            </Button>

                            <Button
                                icon={<EditOutlined />}
                                block
                                onClick={() => setEditProfileModalOpen(true)}
                                className="mt-2"
                            >
                                Chỉnh sửa thông tin
                            </Button>
                        </div>
                    </Card>
                </Col>

                {/* Cột phải: Thông tin chi tiết */}
                <Col xs={24} lg={16}>
                    <Space direction="vertical" size="large" className="w-full">
                        {/* Thông tin cá nhân */}
                        <Card title="Thông tin cá nhân" className="shadow-sm">
                            <Descriptions column={1} bordered>
                                <Descriptions.Item label="Tên đăng nhập">
                                    {profile.username}
                                </Descriptions.Item>
                                <Descriptions.Item label="Email">
                                    {profile.email}
                                </Descriptions.Item>
                                <Descriptions.Item label="Số điện thoại">
                                    {profile.phoneNumber || '--'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Ngày sinh">
                                    {profile.dateOfBirth ? dayjs(profile.dateOfBirth).format('DD/MM/YYYY') : '--'}
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>

                        {/* Vai trò và quyền hạn */}
                        <Card title="Vai trò và quyền hạn" className="shadow-sm">
                            <Descriptions column={1} bordered>
                                <Descriptions.Item label="Vai trò">
                                    {profile.roles.length > 0 ? (
                                        <Space size={[0, 8]} wrap>
                                            {profile.roles.map((role) => (
                                                <Tag key={role} color="blue">
                                                    {role.toUpperCase()}
                                                </Tag>
                                            ))}
                                        </Space>
                                    ) : (
                                        '--'
                                    )}
                                </Descriptions.Item>
                                <Descriptions.Item label="Quyền hạn">
                                    {profile.permissions.length > 0 ? (
                                        profile.permissions.includes('*') ? (
                                            <Tag color="gold">Toàn quyền</Tag>
                                        ) : (
                                            <Space size={[0, 4]} wrap>
                                                {profile.permissions.slice(0, 10).map((permission) => (
                                                    <Tag key={permission} color="green" className="text-xs">
                                                        {permission}
                                                    </Tag>
                                                ))}
                                                {profile.permissions.length > 10 && (
                                                    <Tag color="default">+{profile.permissions.length - 10} quyền khác</Tag>
                                                )}
                                            </Space>
                                        )
                                    ) : (
                                        '--'
                                    )}
                                </Descriptions.Item>
                                <Descriptions.Item label="Ngày tạo tài khoản">
                                    {dayjs(profile.createdAt).format('DD/MM/YYYY HH:mm')}
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>
                    </Space>
                </Col>
            </Row>

            {/* Change Password Modal */}
            <ChangePasswordModal
                open={changePasswordModalOpen}
                onClose={() => setChangePasswordModalOpen(false)}
            />

            {/* Edit Profile Modal */}
            {profile && (
                <EditProfileModal
                    open={editProfileModalOpen}
                    onClose={() => setEditProfileModalOpen(false)}
                    currentProfile={profile}
                    onSuccess={refetch}
                />
            )}
        </div>
    );
};

export default ProfilePage;
