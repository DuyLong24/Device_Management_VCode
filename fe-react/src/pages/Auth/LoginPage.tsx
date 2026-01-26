import { useState } from 'react';
import { Form, Input, Button, Typography, Card, Space, Modal, Alert } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined, PhoneOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import logoAlvar from '../../assets/logo_alvar.png';

const { Title, Text, Link } = Typography;

export default function LoginPage() {
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Modal states
    const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
    const [adminContactModalVisible, setAdminContactModalVisible] = useState(false);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
    const [forgotPasswordSubmitted, setForgotPasswordSubmitted] = useState(false);

    const onFinish = async (values: any) => {
        setLoading(true);
        setErrorMessage(null);

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (values.email && values.password) {
                localStorage.setItem('accessToken', 'mock-token-' + Date.now());
                localStorage.setItem('user', JSON.stringify({ email: values.email, name: 'Admin User' }));

                navigate('/');
            } else {
                setErrorMessage('Email hoặc mật khẩu không đúng');
            }
        } catch (error) {
            setErrorMessage('Đã có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPasswordSubmit = () => {
        if (forgotPasswordEmail) {
            setForgotPasswordSubmitted(true);
        }
    };

    const handleForgotModalClose = () => {
        setForgotPasswordModalVisible(false);
        setForgotPasswordSubmitted(false);
        setForgotPasswordEmail('');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <Card
                className="w-full max-w-md shadow-2xl rounded-xl"
                bordered={false}
            >
                <div className="text-center mb-6">
                    {/* Logo */}
                    <div className="w-20 h-20 mx-auto mb-4">
                        <img src={logoAlvar} alt="logo Alvar" className="w-full h-full object-contain" />
                    </div>
                    <Title level={2} className="m-0!">Quản lý kho Alvar</Title>
                    <Text type="secondary">Đăng nhập để tiếp tục</Text>
                </div>

                {errorMessage && (
                    <Alert
                        message={errorMessage}
                        type="error"
                        showIcon
                        closable
                        onClose={() => setErrorMessage(null)}
                        className="mb-4"
                    />
                )}

                <Form
                    form={form}
                    name="login"
                    onFinish={onFinish}
                    autoComplete="off"
                    layout="vertical"
                    size="large"
                    initialValues={{
                        email: '',
                        password: '',
                    }}
                >
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập email' },
                            { type: 'email', message: 'Email không hợp lệ' }
                        ]}
                    >
                        <Input
                            prefix={<MailOutlined className="text-gray-400" />}
                            placeholder="name@company.com"
                            disabled={loading}
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="Mật khẩu"
                        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined className="text-gray-400" />}
                            placeholder="Nhập mật khẩu"
                            disabled={loading}
                        />
                    </Form.Item>

                    <Form.Item>
                        <div className="flex justify-end">
                            <Link
                                onClick={() => setForgotPasswordModalVisible(true)}
                                disabled={loading}
                                className="text-sm"
                            >
                                Quên mật khẩu?
                            </Link>
                        </div>
                    </Form.Item>

                    <Form.Item className="mb-4">
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            size="large"
                            className="bg-blue-600 hover:bg-blue-500 font-medium"
                        >
                            Đăng nhập
                        </Button>
                    </Form.Item>

                    <div className="text-center">
                        <Link
                            onClick={() => setAdminContactModalVisible(true)}
                            className="text-xs text-gray-500 hover:text-blue-600"
                        >
                            Liên hệ quản trị để cấp tài khoản
                        </Link>
                    </div>
                </Form>

                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                    <Text type="secondary" className="text-xs">
                        © 2026 Hệ thống Quản lý Kho. Version 1.0.0
                    </Text>
                </div>
            </Card>

            {/* Forgot Password Modal */}
            <Modal
                title="Quên mật khẩu"
                open={forgotPasswordModalVisible}
                onCancel={handleForgotModalClose}
                footer={null}
                centered
            >
                {!forgotPasswordSubmitted ? (
                    <div className="pt-2">
                        <Text className="block mb-4">
                            Nhập địa chỉ email của bạn và chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
                        </Text>
                        <Input
                            placeholder="name@company.com"
                            prefix={<MailOutlined />}
                            value={forgotPasswordEmail}
                            onChange={(e) => setForgotPasswordEmail(e.target.value)}
                            onPressEnter={handleForgotPasswordSubmit}
                            size="large"
                            className="mb-4"
                        />
                        <div className="flex justify-end gap-2">
                            <Button onClick={handleForgotModalClose}>Hủy</Button>
                            <Button
                                type="primary"
                                onClick={handleForgotPasswordSubmit}
                                disabled={!forgotPasswordEmail}
                            >
                                Gửi liên kết
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Alert
                        message="Thành công"
                        description="Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu qua email."
                        type="success"
                        showIcon
                    />
                )}
            </Modal>

            {/* Admin Contact Modal */}
            <Modal
                title="Liên hệ quản trị"
                open={adminContactModalVisible}
                onCancel={() => setAdminContactModalVisible(false)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setAdminContactModalVisible(false)}>
                        Đóng
                    </Button>
                ]}
                centered
            >
                <Space direction="vertical" size="middle" className="w-full py-2">
                    <Text>Liên hệ quản trị viên để cấp tài khoản:</Text>
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <UserOutlined className="mr-3 text-blue-500" />
                        <Text strong>Nguyễn Văn A</Text>
                    </div>
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <MailOutlined className="mr-3 text-blue-500" />
                        <Text copyable>admin@alvar.com</Text>
                    </div>
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <PhoneOutlined className="mr-3 text-blue-500" />
                        <Text copyable>0123456789</Text>
                    </div>
                </Space>
            </Modal>
        </div>
    );
}
