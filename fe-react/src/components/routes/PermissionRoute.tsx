import { Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Result, Button } from 'antd';

interface PermissionRouteProps {
    requiredRole: string;
    children?: React.ReactNode;
}

export const PermissionRoute = ({ requiredRole, children }: PermissionRouteProps) => {
    const { hasRole } = useAuth();

    const canAccess =
        hasRole('super admin') ||
        hasRole('Super admin') ||
        hasRole('superadmin') ||
        hasRole(requiredRole);

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
