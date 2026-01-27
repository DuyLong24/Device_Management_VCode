import { Button, Typography, Card } from 'antd';
import logoAlvar from '../../assets/logo_alvar.png';
import keycloak from '../../configs/auth.config';

const { Title, Text } = Typography;

export default function LoginPage() {

    const handleLogin = () => {
        keycloak.login();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <Card
                className="w-full max-w-md shadow-2xl rounded-xl"
                bordered={false}
            >
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto mb-4">
                        <img src={logoAlvar} alt="logo Alvar" className="w-full h-full object-contain" />
                    </div>
                    <Title level={2} className="m-0!">Quản lý kho Alvar</Title>
                    <Text type="secondary">Đăng nhập thông qua hệ thống SSO</Text>
                </div>

                <div className="mb-4">
                    <Button
                        type="primary"
                        onClick={handleLogin}
                        block
                        size="large"
                        className="bg-blue-600 hover:bg-blue-500 font-medium h-12 text-lg"
                    >
                        Đăng nhập với Keycloak
                    </Button>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                    <Text type="secondary" className="text-xs">
                        © 2026 Hệ thống Quản lý Kho. Version 1.0.0
                    </Text>
                </div>
            </Card>
        </div>
    );
}
