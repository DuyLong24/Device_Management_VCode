import { useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Badge, Avatar, Dropdown, Breadcrumb, Space, Typography, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import {
    DashboardOutlined, InboxOutlined, FileAddOutlined, UnorderedListOutlined, CheckCircleOutlined,
    CloseCircleOutlined, ToolOutlined, ExportOutlined, BellOutlined, UserOutlined, LogoutOutlined,
    SettingOutlined, LockOutlined, DatabaseOutlined, TeamOutlined, SafetyOutlined, CustomerServiceOutlined,
    AppstoreOutlined, ScanOutlined, LoadingOutlined, ClockCircleOutlined, FolderOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { warehouseService } from '../../services/warehouse.service';
import type { Warehouse } from '../../types/warehouse.type';

import logoImage from '../../assets/logo_alvar.png';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

interface DashboardLayoutProps {
    children?: ReactNode;
    onLogout?: () => void;
    onNavigate?: (path: string) => void;
    currentPage?: string;
}

const findMenuItemLabel = (items: MenuProps['items'], key: string): ReactNode => {
    if (!items) return null;
    for (const item of items) {
        if (!item) continue;
        if ('key' in item && item.key === key) return (item as any).label;
        if ('children' in item && item.children) {
            const found = findMenuItemLabel(item.children, key);
            if (found) return found;
        }
    }
    return null;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const [collapsed, setCollapsed] = useState(false);
    const [selectedKey, setSelectedKey] = useState<string>('dashboard');
    const [openKeys, setOpenKeys] = useState<string[]>([]);

    // Logic lấy dữ liệu kho từ API
    const { data: warehouses, isLoading } = useQuery({
        queryKey: ['warehouses'],
        queryFn: warehouseService.getAll,
    });

    const getIcon = (iconName: string) => {
        const icons: Record<string, ReactNode> = {
            'clock-circle': <ClockCircleOutlined />,
            'check-circle': <CheckCircleOutlined />,
            'close-circle': <CloseCircleOutlined />,
            'tool': <ToolOutlined />,
            'export': <ExportOutlined />,
            'folder': <FolderOutlined />
        };
        return icons[iconName] || <AppstoreOutlined />;
    };

    const getColor = (colorName?: string) => {
        const map: Record<string, string> = {
            blue: '#1890ff',
            green: '#52c41a',
            red: '#ff4d4f',
            orange: '#faad14',
            purple: '#722ed1',
            grey: '#8c8c8c'
        };
        return map[colorName || 'blue'] || '#1890ff';
    };

    const renderBadgeLabel = (label: string, count?: number, colorName?: string) => {
        if (!count) return label;
        return (
            <div className="flex justify-between items-center w-full">
                <span>{label}</span>
                <Badge
                    count={count}
                    style={{ backgroundColor: getColor(colorName), boxShadow: 'none', marginLeft: 8 }}
                    overflowCount={9999}
                    size="small"
                />
            </div>
        );
    };

    const menuItems: MenuProps['items'] = useMemo(() => {
        const internalItems: MenuProps['items'] = [];
        const exportedItems: MenuProps['items'] = [];

        // Map dữ liệu kho thật vào menu item
        if (warehouses) {
            warehouses.forEach((wh: Warehouse) => {
                const group = typeof wh.groupId === 'object'
                    ? wh.groupId
                    : { _id: 'other', name: 'Khác', code: 'OTHER' };

                const item = {
                    key: `warehouse-${wh.code}`, // VD: warehouse-PENDING_QC
                    label: renderBadgeLabel(wh.name, wh.count, wh.color),
                    icon: getIcon(wh.icon),
                    onClick: () => navigate(`/warehouse/${wh.code}`),
                };

                if (group.code === 'INTERNAL' || group.name === 'Kho nội bộ') {
                    internalItems.push(item);
                } else if (group.code === 'EXPORTED' || group.name === 'Đã xuất khỏi kho') {
                    exportedItems.push(item);
                }
            });
        }

        return [
            {
                key: 'dashboard',
                icon: <DashboardOutlined />,
                label: 'Dashboard',
                onClick: () => navigate('/dashboard'),
            },
            {
                key: 'import',
                icon: <InboxOutlined />,
                label: 'Quản lý nhập kho',
                children: [
                    { key: 'import-list', icon: <UnorderedListOutlined />, label: 'Danh sách phiếu nhập kho', onClick: () => navigate('/import/list') },
                    { key: 'create-import', icon: <FileAddOutlined />, label: 'Thêm mới phiếu nhập kho', onClick: () => navigate('/import/create') },
                    { key: 'inventory-list', icon: <CheckCircleOutlined />, label: 'Kiểm kê sản phẩm nhập kho', onClick: () => navigate('/import/inventory-list') },
                ],
            },
            {
                type: 'divider',
            },
            {
                key: 'all-serials',
                icon: <DatabaseOutlined />,
                label: renderBadgeLabel('Danh sách tổng'),
                onClick: () => navigate('/all-serials'),
            },
            {
                key: 'group-internal',
                icon: <AppstoreOutlined />,
                label: 'Kho nội bộ',
                children: internalItems.length > 0 ? internalItems : undefined,
            },
            {
                key: 'group-exported',
                icon: <ExportOutlined />,
                label: 'Đã xuất khỏi kho',
                children: exportedItems.length > 0 ? exportedItems : undefined,
            },
            {
                type: 'divider',
            },
            {
                key: 'export',
                icon: <ExportOutlined rotate={180} />,
                label: 'Quản lý xuất kho',
                children: [
                    { key: 'export-list', icon: <UnorderedListOutlined />, label: 'Danh sách phiếu xuất kho', onClick: () => navigate('/export/list') },
                    { key: 'create-export', icon: <FileAddOutlined />, label: 'Thêm mới phiếu xuất kho', onClick: () => navigate('/export/create') },
                    { key: 'export-check', icon: <ScanOutlined />, label: 'Xuất kho - Quét Serial', onClick: () => navigate('/export/check') },
                ],
            },
            {
                type: 'divider',
            },
            {
                key: 'warranty',
                icon: <CustomerServiceOutlined />,
                label: 'Quản lý bảo hành',
                children: [
                    { key: 'warranty-activation-list', icon: <UnorderedListOutlined />, label: 'Danh sách bảo hành', onClick: () => navigate('/warranty/list') },
                ],
            },
            {
                key: 'system',
                icon: <SettingOutlined />,
                label: 'Quản trị hệ thống',
                children: [
                    { key: 'user-management', icon: <TeamOutlined />, label: 'Quản lý tài khoản', onClick: () => navigate('/system/users') },
                    { key: 'role-permission', icon: <SafetyOutlined />, label: 'Quản lý vai trò & phân quyền', onClick: () => navigate('/system/roles') },
                ],
            },
        ];
    }, [warehouses, navigate]);

    useEffect(() => {
        const path = location.pathname;
        let newKey = 'dashboard';

        if (path.includes('/warehouse/')) newKey = `warehouse-${path.split('/warehouse/')[1]}`;
        else if (path.includes('/import/create')) newKey = 'create-import';
        else if (path.includes('/import/inventory-list') || path.includes('/import/inventory-check')) newKey = 'inventory-list';
        else if (path.includes('/import/list')) newKey = 'import-list';
        else if (path.includes('all-serials')) newKey = 'all-serials';
        else if (path.includes('export')) newKey = 'export-list';

        setSelectedKey(newKey);

        const keyToParent: Record<string, string> = {
            'import-list': 'import', 'create-import': 'import', 'inventory-list': 'import',
            'export-list': 'export', 'create-export': 'export', 'export-check': 'export',
            'user-management': 'system', 'role-permission': 'system', 'warranty-activation-list': 'warranty'
        };

        if (warehouses) {
            warehouses.forEach(wh => {
                const gCode = (typeof wh.groupId === 'object' ? wh.groupId.code : 'OTHER');
                if (gCode === 'INTERNAL') keyToParent[`warehouse-${wh.code}`] = 'group-internal';
                if (gCode === 'EXPORTED') keyToParent[`warehouse-${wh.code}`] = 'group-exported';
            });
        }
        const parent = keyToParent[newKey];
        if (parent && !collapsed) setOpenKeys((prev) => [...new Set([...prev, parent])]);

    }, [location.pathname, warehouses, collapsed]);

    const userMenuItems: MenuProps['items'] = [
        { key: 'profile', icon: <UserOutlined />, label: 'Thông tin tài khoản' },
        { key: 'change-password', icon: <LockOutlined />, label: 'Đổi mật khẩu' },
        { type: 'divider' },
        { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true, onClick: () => navigate('/login') },
    ];

    const notificationItems: MenuProps['items'] = [
        { key: '1', label: <div className="py-2"><Text strong>Có 5 sản phẩm chờ QC</Text><br /><Text type="secondary" style={{ fontSize: 12 }}>2 phút trước</Text></div> },
        { key: '2', label: <div className="py-2"><Text strong>3 sản phẩm lỗi cần xử lý</Text><br /><Text type="secondary" style={{ fontSize: 12 }}>15 phút trước</Text></div> },
        { type: 'divider' },
        { key: 'all', label: <Text className="text-blue-500">Xem tất cả thông báo</Text> },
    ];

    const currentBreadcrumbTitle = (findMenuItemLabel(menuItems, selectedKey) as ReactNode) || 'Dashboard';

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={setCollapsed}
                width={250}
                style={{
                    overflow: 'auto',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 100,
                }}
                theme="dark"
            >
                <div className="flex items-center justify-center p-4 border-b border-gray-700 bg-[#001529] sticky top-0 z-10">
                    <img src={logoImage} alt="Logo" className={collapsed ? "w-8 h-8" : "w-10 h-10"} />
                    {!collapsed && <span className="text-white font-semibold ml-2 text-base">Quản lý kho Alvar</span>}
                </div>

                {isLoading ? (
                    <div className="flex justify-center mt-10">
                        <Spin indicator={<LoadingOutlined style={{ fontSize: 24, color: '#fff' }} spin />} />
                    </div>
                ) : (
                    <Menu
                        theme="dark"
                        mode="inline"
                        selectedKeys={[selectedKey]}
                        openKeys={openKeys}
                        onOpenChange={setOpenKeys}
                        items={menuItems}
                        style={{ borderRight: 0 }}
                    />
                )}
            </Sider>

            <Layout
                className="transition-all duration-200 ease-in-out"
                style={{ marginLeft: collapsed ? 80 : 250 }}
            >
                <Header
                    style={{
                        padding: '0 24px',
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 99,
                        height: 64,
                        width: '100%'
                    }}
                >
                    <Breadcrumb items={[{ title: 'Trang chủ' }, { title: currentBreadcrumbTitle }]} />

                    <Space size="large">
                        <Dropdown menu={{ items: notificationItems }} trigger={['click']}>
                            <Badge count={8} overflowCount={99}>
                                <BellOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
                            </Badge>
                        </Dropdown>

                        <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
                            <Space style={{ cursor: 'pointer' }}>
                                <Avatar icon={<UserOutlined />} />
                                <Text strong>nhanvien</Text>
                            </Space>
                        </Dropdown>
                    </Space>
                </Header>

                <Content style={{ margin: '24px 16px', overflow: 'initial', minHeight: 'calc(100vh - 112px)' }}>
                    {children ? children : <Outlet />}
                </Content>

                <Footer style={{ textAlign: 'center', padding: '12px 50px', background: '#f0f2f5' }}>
                    <Text type="secondary">Quản lý kho Alvar © 2026 - Version 1.0.0</Text>
                </Footer>
            </Layout>
        </Layout>
    );
}