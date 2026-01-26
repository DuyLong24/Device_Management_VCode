import { useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Badge, Avatar, Dropdown, Breadcrumb, Space, Typography, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { BellOutlined, UserOutlined, LoadingOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { warehouseService } from '../../services/warehouse.service';
import type { Warehouse } from '../../types/warehouse.type';

import logoImage from '../../assets/logo_alvar.png';

// Import Constants & Utils
import {
    DASHBOARD_COLORS, COLOR_MAP, ICON_MAP,
    MENU_KEYS, MENU_LABELS, SECTION_ICONS
} from '../../constants/dashboard.constants';
import { findMenuItemLabel, getActiveKeysFromPath } from '../../utils/navigation.utils';

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

    // Logic lấy dữ liệu kho từ API
    const { data: warehouses, isLoading } = useQuery({
        queryKey: ['warehouses'],
        queryFn: warehouseService.getAll,
    });

    const { data: groups } = useQuery({
        queryKey: ['warehouse-groups'],
        queryFn: warehouseService.getAllGroups,
    });

    const renderBadgeLabel = (label: string, count?: number, colorName?: string) => {
        if (!count) return label;
        const color = COLOR_MAP[colorName || 'blue'] || DASHBOARD_COLORS.BLUE;

        return (
            <div className="flex justify-between items-center w-full">
                <span>{label}</span>
                <Badge
                    count={count}
                    style={{ backgroundColor: color, boxShadow: 'none', marginLeft: 8 }}
                    overflowCount={9999}
                    size="small"
                />
            </div>
        );
    };

    const menuItems: MenuProps['items'] = useMemo(() => {
        const internalItems: MenuProps['items'] = [];
        const exportedItems: MenuProps['items'] = [];

        if (warehouses) {
            warehouses.forEach((wh: Warehouse) => {
                const whGroupId = (typeof wh.groupId === 'object' && wh.groupId) ? (wh.groupId as any)._id || (wh.groupId as any).id : wh.groupId;

                const group = groups?.find((g: any) => {
                    const gId = g._id || g.id;
                    return gId === whGroupId;
                }) || (typeof wh.groupId === 'object' ? wh.groupId : { _id: 'other', name: 'Khác', code: 'OTHER' });

                const item = {
                    key: `warehouse-${wh.code}`,
                    label: renderBadgeLabel(wh.name, wh.count, wh.color),
                    icon: ICON_MAP[wh.icon] || ICON_MAP['default'],
                    onClick: () => navigate(`/warehouse/${wh.code}`),
                };

                // Logic phân nhóm kho theo code
                if (group.code === 'INTERNAL' || group.name === 'Kho nội bộ') {
                    // console.log(`  -> Added to INTERNAL`);
                    internalItems.push(item);
                } else if (group.code === 'EXPORTED' || group.name === 'Đã xuất') {
                    // console.log(`  -> Added to EXPORTED`);
                    exportedItems.push(item);
                } else {
                    // console.log(`  -> NOT MATCHED - group.code: ${group.code}, group.name: ${group.name}`);
                }
            });
        }

        return [
            {
                key: MENU_KEYS.DASHBOARD,
                icon: SECTION_ICONS.DASHBOARD,
                label: MENU_LABELS.DASHBOARD,
                onClick: () => navigate('/dashboard'),
            },
            {
                key: MENU_KEYS.IMPORT.ROOT,
                icon: SECTION_ICONS.IMPORT,
                label: MENU_LABELS.IMPORT.ROOT,
                children: [
                    { key: MENU_KEYS.IMPORT.LIST, icon: SECTION_ICONS.IMPORT_LIST, label: MENU_LABELS.IMPORT.LIST, onClick: () => navigate('/import/list') },
                    { key: MENU_KEYS.IMPORT.CREATE, icon: SECTION_ICONS.IMPORT_CREATE, label: MENU_LABELS.IMPORT.CREATE, onClick: () => navigate('/import/create') },
                    { key: MENU_KEYS.IMPORT.INVENTORY, icon: SECTION_ICONS.IMPORT_INVENTORY, label: MENU_LABELS.IMPORT.INVENTORY, onClick: () => navigate('/import/inventory-list') },
                ],
            },
            { type: 'divider' },
            {
                key: MENU_KEYS.ALL_DEVICES,
                icon: SECTION_ICONS.ALL_DEVICES,
                label: renderBadgeLabel(MENU_LABELS.ALL_DEVICES),
                onClick: () => navigate('/all-devices'),
            },
            {
                key: MENU_KEYS.INTERNAL_GROUP,
                icon: SECTION_ICONS.INTERNAL,
                label: MENU_LABELS.INTERNAL_GROUP,
                children: internalItems.length > 0 ? internalItems : undefined,
            },
            {
                key: MENU_KEYS.EXPORTED_GROUP,
                icon: SECTION_ICONS.EXPORTED,
                label: MENU_LABELS.EXPORTED_GROUP,
                children: exportedItems.length > 0 ? exportedItems : undefined,
            },
            { type: 'divider' },
            {
                key: MENU_KEYS.EXPORT.ROOT,
                icon: SECTION_ICONS.EXPORT,
                label: MENU_LABELS.EXPORT.ROOT,
                children: [
                    { key: MENU_KEYS.EXPORT.LIST, icon: SECTION_ICONS.EXPORT_LIST, label: MENU_LABELS.EXPORT.LIST, onClick: () => navigate('/export/list') },
                    { key: MENU_KEYS.EXPORT.CREATE, icon: SECTION_ICONS.EXPORT_CREATE, label: MENU_LABELS.EXPORT.CREATE, onClick: () => navigate('/export/create') },
                    { key: MENU_KEYS.EXPORT.CHECK, icon: SECTION_ICONS.EXPORT_CHECK, label: MENU_LABELS.EXPORT.CHECK, onClick: () => navigate('/export/check') },
                ],
            },
            { type: 'divider' },
            {
                key: MENU_KEYS.SYSTEM.ROOT,
                icon: SECTION_ICONS.SYSTEM,
                label: MENU_LABELS.SYSTEM.ROOT,
                children: [
                    { key: MENU_KEYS.SYSTEM.USERS, icon: SECTION_ICONS.SYSTEM_USERS, label: MENU_LABELS.SYSTEM.USERS, onClick: () => navigate('/system/users') },
                    { key: MENU_KEYS.SYSTEM.ROLES, icon: SECTION_ICONS.SYSTEM_ROLES, label: MENU_LABELS.SYSTEM.ROLES, onClick: () => navigate('/system/roles') },
                ],
            },
        ];
    }, [warehouses, navigate]);



    // Handle Navigation Active State
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
        { key: MENU_KEYS.USER.PROFILE, icon: SECTION_ICONS.USER_PROFILE, label: MENU_LABELS.USER.PROFILE },
        { key: MENU_KEYS.USER.CHANGE_PASS, icon: SECTION_ICONS.USER_LOCK, label: MENU_LABELS.USER.CHANGE_PASS },
        { type: 'divider' },
        { key: MENU_KEYS.USER.LOGOUT, icon: SECTION_ICONS.USER_LOGOUT, label: MENU_LABELS.USER.LOGOUT, danger: true, onClick: () => navigate('/login') },
    ];

    const notificationItems: MenuProps['items'] = [
        { key: '1', label: <div className="py-2"><Text strong>Có 5 thiết bị chờ QC</Text><br /><Text type="secondary" style={{ fontSize: 12 }}>2 phút trước</Text></div> },
        { key: '2', label: <div className="py-2"><Text strong>3 thiết bị lỗi cần xử lý</Text><br /><Text type="secondary" style={{ fontSize: 12 }}>15 phút trước</Text></div> },
        { type: 'divider' },
        { key: 'all', label: <Text className="text-blue-500">Xem tất cả thông báo</Text> },
    ];

    const currentBreadcrumbTitle = (findMenuItemLabel(menuItems, selectedKey) as ReactNode) || MENU_LABELS.DASHBOARD;

    const breadcrumbItems = [
        { title: 'Trang chủ' },
        { title: currentBreadcrumbTitle }
    ];

    // Detect Detail Page (Import)
    if (selectedKey === MENU_KEYS.IMPORT.LIST && !location.pathname.endsWith('/list') && location.pathname.includes('/import/')) {
        breadcrumbItems.push({ title: 'Chi tiết phiếu nhập' });
    }
    // Detect Detail Page (Export)
    if (selectedKey === MENU_KEYS.EXPORT.LIST && !location.pathname.endsWith('/list') && location.pathname.includes('/export/')) {
        breadcrumbItems.push({ title: 'Chi tiết phiếu xuất' });
    }
    // Detect Detail Page (Warehouse Devices -> Serial Detail)
    if (!selectedKey.startsWith('warehouse-') && location.pathname.includes('/serial/')) {
        // Override for Serial Detail if needed, or if it falls into All Serials
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
                    overflowY: 'scroll', // Force scrollbar to prevent layout shift
                    overflowX: 'hidden',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 100,
                }}
                className="bg-[#001529]"
                theme="dark"
            >
                <div className="flex items-center justify-center p-4 border-b border-gray-700 bg-[#001529] sticky top-0 z-10">
                    <img src={logoImage} alt="Logo" className={collapsed ? "w-8 h-8" : "w-10 h-10"} />
                    {!collapsed && <span className="text-white font-semibold ml-2 text-base">Quản lý kho Alvar</span>}
                </div>

                {isLoading ? (
                    <div className="flex justify-center mt-10">
                        <Spin indicator={<LoadingOutlined className="text-2xl text-white" spin />} />
                    </div>
                ) : (
                    <Menu
                        theme="dark"
                        mode="inline"
                        selectedKeys={[selectedKey]}
                        openKeys={openKeys}
                        onOpenChange={setOpenKeys}
                        items={menuItems}
                        className="border-r-0"
                    />
                )}
            </Sider>

            <Layout
                className={`transition-all duration-200 ease-in-out ${collapsed ? 'ml-[80px]' : 'ml-[280px]'}`}
            >
                <Header
                    className="px-6 !bg-white flex items-center justify-between shadow-sm sticky top-0 z-[99] h-16 w-full"
                >
                    <Breadcrumb items={breadcrumbItems} />

                    <Space size="large">
                        <Dropdown menu={{ items: notificationItems }} trigger={['click']}>
                            <Badge count={8} overflowCount={99}>
                                <BellOutlined className="text-xl cursor-pointer" />
                            </Badge>
                        </Dropdown>

                        <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
                            <Space className="cursor-pointer">
                                <Avatar icon={<UserOutlined />} />
                                <Text strong>nhanvien</Text>
                            </Space>
                        </Dropdown>
                    </Space>
                </Header>

                <Content className="m-6 overflow-initial min-h-[calc(100vh-112px)]">
                    {children ? children : <Outlet />}
                </Content>

                <Footer className="text-center py-3 px-12 bg-gray-100">
                    <Text type="secondary">Quản lý kho Alvar © 2026 - Version 1.0.0</Text>
                </Footer>
            </Layout>
        </Layout>
    );
}