import { useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Badge, Avatar, Dropdown, Breadcrumb, Space, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { BellOutlined, UserOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { warehouseService } from '../../services/warehouse.service';


import logoImage from '../../assets/logo_alvar.png';

// Import Constants & Utils
import {
    MENU_KEYS, MENU_LABELS, SECTION_ICONS
} from '../../constants/dashboard.constants';

import { findMenuItemLabel, getActiveKeysFromPath } from '../../utils/navigation.utils';
import { useAuth } from '../../hooks/useAuth';
import { useMenuItems } from '../../hooks/useMenuItems';
import { useNotification } from '../../contexts/useNotification';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

interface DashboardLayoutProps {
    children?: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const [collapsed, setCollapsed] = useState(false);
    const [selectedKey, setSelectedKey] = useState<string>(MENU_KEYS.DASHBOARD);
    const [openKeys, setOpenKeys] = useState<string[]>([]);

    const { user, logout, hasRole, isAuthenticated, login, hasPermission } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) {
            login();
        }
    }, [isAuthenticated, login]);

    const { notifications, unreadCount, markAsRead, markAllRead } = useNotification();

    // Logic lấy dữ liệu kho từ API
    const { data: warehouses } = useQuery({
        queryKey: ['warehouses'],
        queryFn: warehouseService.getAll,
    });

    const { data: groups } = useQuery({
        queryKey: ['warehouse-groups'],
        queryFn: warehouseService.getAllGroups,
    });

    const menuItems = useMenuItems(user, warehouses, groups, hasRole, hasPermission);

    // Lọc menu items để ẩn System cho người dùng không có quyền super_admin
    const filteredMenuItems = useMemo(() => {
        const items = [...(menuItems || [])];
        if (!hasRole('super admin') && !hasRole('Super admin')) {
            const systemIndex = items.findIndex(item => item && (item as any).key === MENU_KEYS.SYSTEM.ROOT);
            if (systemIndex !== -1) {
                items.splice(systemIndex, 1);
            }
        }
        return items;
    }, [menuItems, hasRole]);

    // Xử lý trạng thái active menu
    useEffect(() => {
        const { selectedKey: newKey, parentKey } = getActiveKeysFromPath(location.pathname);
        setSelectedKey(newKey);

        if (parentKey && !collapsed) {
            setOpenKeys((prev) => [...new Set([...prev, parentKey])]);
        }
        if (warehouses && newKey.startsWith('warehouse-')) {
            const whCode = newKey.split('warehouse-')[1];
            const wh = warehouses.find(w => w.code === whCode);
            if (wh) {
                const gCode = (typeof wh.groupId === 'object' ? wh.groupId.code : 'OTHER');
                let parent = '';
                if (gCode === 'INTERNAL') parent = MENU_KEYS.INTERNAL_GROUP;
                if (gCode === 'EXPORTED') parent = MENU_KEYS.EXPORTED_GROUP;

                if (parent && !collapsed) setOpenKeys((prev) => [...new Set([...prev, parent])]);
            }
        }

    }, [location.pathname, warehouses, collapsed]);



    const userMenuItems: MenuProps['items'] = [
        { key: MENU_KEYS.USER.PROFILE, icon: SECTION_ICONS.USER_PROFILE, label: MENU_LABELS.USER.PROFILE, onClick: () => navigate('/profile') },
        // { key: MENU_KEYS.USER.CHANGE_PASS, icon: SECTION_ICONS.USER_LOCK, label: MENU_LABELS.USER.CHANGE_PASS },
        { type: 'divider' },
        { key: MENU_KEYS.USER.LOGOUT, icon: SECTION_ICONS.USER_LOGOUT, label: MENU_LABELS.USER.LOGOUT, danger: true, onClick: logout },
    ];

    const notificationItems: MenuProps['items'] = [
        {
            key: 'header',
            label: <div className="flex justify-between items-center py-1">
                <Text strong>Thông báo</Text>
                <Text type="secondary" className="cursor-pointer hover:text-blue-500" onClick={(e) => { e.preventDefault(); markAllRead(); }}>Đánh dấu đã đọc</Text>
            </div>,
            disabled: true
        },
        { type: 'divider' },
        ...(notifications.length > 0 ? notifications.slice(0, 5).map(noti => ({
            key: noti._id,
            label: (
                <div
                    className={`py-2 max-w-[300px] ${!noti.isRead ? 'bg-blue-50 -mx-3 px-3' : ''}`}
                    onClick={async (e) => {
                        e.preventDefault();
                        const notiId = noti._id || (noti as any).id;
                        if (notiId) {
                            await markAsRead(notiId);
                        }
                        if (noti.metadata?.link) {
                            navigate(noti.metadata.link);
                        }
                    }}
                >
                    <div className="flex justify-between">
                        <Text strong className="text-sm">{noti.title}</Text>
                        {!noti.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1"></span>}
                    </div>
                    <Text className="text-xs text-gray-500 block truncate">{noti.message}</Text>
                    <Text type="secondary" className="text-[11px]">{dayjs(noti.createdAt).fromNow()}</Text>
                </div>
            )
        })) : [{ key: 'empty', label: <Text type="secondary" className="block text-center py-4">Không có thông báo nào</Text>, disabled: true }]),
        { type: 'divider' },
        { key: 'all', label: <Text className="text-blue-500 block text-center">Xem tất cả thông báo</Text> }
    ];

    const currentBreadcrumbTitle = (findMenuItemLabel(menuItems, selectedKey) as ReactNode) || MENU_LABELS.DASHBOARD;

    const breadcrumbItems = [
        { title: 'Trang chủ' },
        { title: currentBreadcrumbTitle }
    ];

    if (selectedKey === MENU_KEYS.IMPORT.LIST && !location.pathname.endsWith('/list') && location.pathname.includes('/import/')) {
        breadcrumbItems.push({ title: 'Chi tiết phiếu nhập' });
    }
    if (selectedKey === MENU_KEYS.EXPORT.LIST && !location.pathname.endsWith('/list') && location.pathname.includes('/export/')) {
        breadcrumbItems.push({ title: 'Chi tiết phiếu xuất' });
    }
    if (!selectedKey.startsWith('warehouse-') && location.pathname.includes('/device/')) {
        if (selectedKey === MENU_KEYS.ALL_DEVICES) {
            breadcrumbItems.push({ title: 'Chi tiết thiết bị' });
        }
    }

    return (
        <Layout className="min-h-screen">
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={setCollapsed}
                width={280}
                style={{
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    zIndex: 100,
                }}
                className="bg-[#001529]"
                theme="dark"
            >
                {/* Header */}
                <div className="flex items-center justify-center p-4 border-b border-gray-700 bg-[#001529] sticky top-0 z-10">
                    <img src={logoImage} alt="Logo" className={collapsed ? "w-8 h-8" : "w-10 h-10"} />
                    {!collapsed && (
                        <span className="text-white font-semibold ml-2 text-base">
                            Quản lý kho Alvar
                        </span>
                    )}
                </div>

                {/* Scroll area */}
                <div
                    className="overflow-y-auto"
                    style={{
                        height: 'calc(100vh - 64px)', // trừ chiều cao header
                        paddingBottom: 48, // chừa chỗ cho trigger
                    }}
                >
                    <Menu
                        theme="dark"
                        mode="inline"
                        selectedKeys={[selectedKey]}
                        openKeys={openKeys}
                        onOpenChange={setOpenKeys}
                        items={filteredMenuItems as any}
                        className="border-r-0"
                    />
                </div>
            </Sider>

            <Layout
                className={`transition-all duration-200 ease-in-out ${collapsed ? 'ml-20' : 'ml-70'}`}
            >
                <Header
                    className="px-6 bg-white! flex items-center justify-between shadow-sm sticky top-0 z-99 h-16 w-full"
                >
                    <Breadcrumb items={breadcrumbItems} />

                    <Space size="large">
                        <Dropdown menu={{ items: notificationItems }} trigger={['click']} placement="bottomRight" overlayStyle={{ minWidth: 350 }}>
                            <Badge count={unreadCount} overflowCount={99}>
                                <BellOutlined className="text-xl cursor-pointer" />
                            </Badge>
                        </Dropdown>

                        <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
                            <Space className="cursor-pointer">
                                <Avatar icon={<UserOutlined />} className="bg-blue-500" />
                                <Text strong>{user?.name || 'User'}</Text>
                            </Space>
                        </Dropdown>
                    </Space>
                </Header>

                <Content className="mx-6 mt-1 mb-6 overflow-initial min-h-[calc(100vh-112px)]">
                    {children ? children : <Outlet />}
                </Content>

                <Footer className="text-center py-3 px-12 bg-gray-100">
                    <Text type="secondary">Quản lý kho Alvar © 2026 - Version 1.0.0</Text>
                </Footer>
            </Layout>
        </Layout>
    );
}