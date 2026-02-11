import { Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Result, Button, Spin } from 'antd';

interface PermissionRouteProps {
    requiredRole?: string;
    requiredPermission?: string;
    children?: React.ReactNode;
}

export const PermissionRoute = ({ requiredRole, requiredPermission, children }: PermissionRouteProps) => {
    const { hasRole, hasPermission, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    let canAccess = true;

    if (requiredRole) {
        canAccess = canAccess && (
            hasRole('super admin') ||
            hasRole('Super admin') ||
            hasRole('superadmin') ||
            hasRole(requiredRole)
        );
    }

    if (requiredPermission) {
        canAccess = canAccess && hasPermission(requiredPermission);
    }

    if (!canAccess) {
        return (
            <Result
                status="403"
                title="403"
                subTitle="Xin lỗi, bạn không có quyền truy cập trang này."
                extra={<Button type="primary" href="/">Về trang chủ</Button>}
            />
        );
    }

    return children ? <>{children}</> : <Outlet />;
};
