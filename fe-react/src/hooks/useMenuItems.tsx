import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MenuProps } from 'antd';
import {
    DASHBOARD_COLORS, COLOR_MAP, ICON_MAP,
    MENU_KEYS, MENU_LABELS, SECTION_ICONS
} from '../constants/dashboard.constants';
import { PERMISSION_KEYS } from '../constants/permissionKeys';
import type { Warehouse } from '../types/warehouse.type';
import { Badge } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';

import type { User } from '../types/user.type';

export const useMenuItems = (
    user: User | null,
    warehouses: Warehouse[] | undefined,
    groups: any[] | undefined,
    hasRole: (role: string) => boolean,
    hasPermission: (permission: string) => boolean
) => {
    const navigate = useNavigate();

    const renderBadgeLabel = (label: string, count?: number, colorName?: string) => {
        if (!count) return label;
        const color = COLOR_MAP[colorName || 'blue'] || DASHBOARD_COLORS.BLUE;

        return (
            <div className="flex justify-between items-center w-full">
                <span>{label}</span>
                <Badge
                    count={count}
                    className="shadow-none ml-2"
                    style={{ backgroundColor: color }}
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
                    internalItems.push(item);
                } else if (group.code === 'EXPORTED' || group.name === 'Đã xuất') {
                    exportedItems.push(item);
                }
            });
        }

        const items: MenuProps['items'] = [
            {
                key: MENU_KEYS.DASHBOARD,
                icon: SECTION_ICONS.DASHBOARD,
                label: MENU_LABELS.DASHBOARD,
                onClick: () => navigate('/dashboard'),
            },
            { type: 'divider' },
        ];

        // --- DEVICE & WAREHOUSE ---
        if (hasRole('super_admin') || hasRole('SUPER_ADMIN') || hasPermission(PERMISSION_KEYS.DEVICE.ROOT.VIEW)) {
            items.push({
                key: MENU_KEYS.ALL_DEVICES,
                icon: SECTION_ICONS.ALL_DEVICES,
                label: renderBadgeLabel(MENU_LABELS.ALL_DEVICES),
                onClick: () => navigate('/all-devices'),
            });
        }

        // --- IMPORT ---
        if (hasRole('super_admin') || hasRole('SUPER_ADMIN') || hasPermission(PERMISSION_KEYS.IMPORT.ROOT.VIEW)) {
            const children = [];
            if (hasRole('super_admin') || hasRole('SUPER_ADMIN') || hasPermission(PERMISSION_KEYS.IMPORT.LIST.VIEW)) {
                children.push({ key: MENU_KEYS.IMPORT.LIST, icon: SECTION_ICONS.IMPORT_LIST, label: MENU_LABELS.IMPORT.LIST, onClick: () => navigate('/import/list') });
            }
            if (hasRole('super_admin') || hasRole('SUPER_ADMIN') || hasPermission(PERMISSION_KEYS.IMPORT.CREATE.VIEW)) {
                children.push({ key: MENU_KEYS.IMPORT.CREATE, icon: SECTION_ICONS.IMPORT_CREATE, label: MENU_LABELS.IMPORT.CREATE, onClick: () => navigate('/import/create') });
            }
            if (hasRole('super_admin') || hasRole('SUPER_ADMIN') || hasPermission(PERMISSION_KEYS.IMPORT.INVENTORY.VIEW)) {
                children.push({ key: MENU_KEYS.IMPORT.INVENTORY, icon: SECTION_ICONS.IMPORT_INVENTORY, label: MENU_LABELS.IMPORT.INVENTORY, onClick: () => navigate('/import/inventory-list') });
            }

            if (children.length > 0) {
                items.push({
                    key: MENU_KEYS.IMPORT.ROOT,
                    icon: SECTION_ICONS.IMPORT,
                    label: MENU_LABELS.IMPORT.ROOT,
                    children: children,
                });
            }
        }

        items.push({ type: 'divider' });

        // --- EXPORT ---
        if (hasRole('super_admin') || hasRole('SUPER_ADMIN') || hasPermission(PERMISSION_KEYS.EXPORT.ROOT.VIEW)) {
            const children = [];
            if (hasRole('super_admin') || hasRole('SUPER_ADMIN') || hasPermission(PERMISSION_KEYS.EXPORT.LIST.VIEW)) {
                children.push({ key: MENU_KEYS.EXPORT.LIST, icon: SECTION_ICONS.EXPORT_LIST, label: MENU_LABELS.EXPORT.LIST, onClick: () => navigate('/export/list') });
            }
            if (hasRole('super_admin') || hasRole('SUPER_ADMIN') || hasPermission(PERMISSION_KEYS.EXPORT.CREATE.VIEW)) {
                children.push({ key: MENU_KEYS.EXPORT.CREATE, icon: SECTION_ICONS.EXPORT_CREATE, label: MENU_LABELS.EXPORT.CREATE, onClick: () => navigate('/export/create') });
            }
            if (hasRole('super_admin') || hasRole('SUPER_ADMIN') || hasPermission(PERMISSION_KEYS.EXPORT.CHECK.VIEW)) {
                children.push({ key: MENU_KEYS.EXPORT.CHECK, icon: SECTION_ICONS.EXPORT_CHECK, label: MENU_LABELS.EXPORT.CHECK, onClick: () => navigate('/export/check') });
            }
            if (children.length > 0) {
                items.push({
                    key: MENU_KEYS.EXPORT.ROOT,
                    icon: SECTION_ICONS.EXPORT,
                    label: MENU_LABELS.EXPORT.ROOT,
                    children: children,
                });
            }
        }

        items.push({ type: 'divider' });

        // --- WAREHOUSES ---
        const filteredInternal = internalItems?.filter(item =>
            hasRole('super_admin') || hasRole('SUPER_ADMIN') || hasPermission(`warehouse.${(item as any).key.replace('warehouse-', '')}.view`)
        );
        const filteredExported = exportedItems?.filter(item =>
            hasRole('super_admin') || hasRole('SUPER_ADMIN') || hasPermission(`warehouse.${(item as any).key.replace('warehouse-', '')}.view`)
        );

        if (filteredInternal && filteredInternal.length > 0) {
            items.push({
                key: MENU_KEYS.INTERNAL_GROUP,
                icon: SECTION_ICONS.INTERNAL,
                label: MENU_LABELS.INTERNAL_GROUP,
                children: filteredInternal,
            });
        }

        if (filteredExported && filteredExported.length > 0) {
            items.push({
                key: MENU_KEYS.EXPORTED_GROUP,
                icon: SECTION_ICONS.EXPORTED,
                label: MENU_LABELS.EXPORTED_GROUP,
                children: filteredExported,
            });
        }

        items.push({ type: 'divider' });

        // --- SYSTEM ---
        if (hasRole('super_admin') || hasRole('SUPER_ADMIN')) {
            // System menu logic
            const children: MenuProps['items'] = [];
            if (hasRole('super_admin') || hasRole('SUPER_ADMIN') || hasPermission(PERMISSION_KEYS.SYSTEM.USER.VIEW)) {
                children.push({ key: MENU_KEYS.SYSTEM.USERS, icon: SECTION_ICONS.SYSTEM_USERS, label: MENU_LABELS.SYSTEM.USERS, onClick: () => navigate('/system/users') });
            }
            if (hasRole('super_admin') || hasRole('SUPER_ADMIN') || hasPermission(PERMISSION_KEYS.SYSTEM.ROLE.VIEW)) {
                children.push({ key: MENU_KEYS.SYSTEM.ROLES, icon: SECTION_ICONS.SYSTEM_ROLES, label: MENU_LABELS.SYSTEM.ROLES, onClick: () => navigate('/system/roles') });
            }
            if (hasRole('super_admin') || hasRole('SUPER_ADMIN') || hasPermission(PERMISSION_KEYS.SYSTEM.SHARED_DATA.VIEW)) {
                children.push({ key: MENU_KEYS.SYSTEM.SHARED_DATA, icon: <AppstoreOutlined />, label: MENU_LABELS.SYSTEM.SHARED_DATA, onClick: () => navigate('/system/shared-data') });
            }

            if (children.length > 0) {
                items.push({
                    key: MENU_KEYS.SYSTEM.ROOT,
                    icon: SECTION_ICONS.SYSTEM,
                    label: MENU_LABELS.SYSTEM.ROOT,
                    children: children,
                });
            }
        }

        return items;
    }, [warehouses, navigate, groups, hasRole, user, hasPermission]);

    return menuItems;
};
