import type { MenuProps } from 'antd';
import type { ReactNode } from 'react';
import { MENU_KEYS } from '../constants/dashboard.constants';


// Tìm label của menu item dựa trên key (đệ quy)

export const findMenuItemLabel = (items: MenuProps['items'], key: string): ReactNode | null => {
    if (!items) return null;
    for (const item of items) {
        if (!item) continue;
        if ('key' in item && item.key === key) return (item as any).label;
        if ('children' in item && (item as any).children) {
            const found = findMenuItemLabel((item as any).children, key);
            if (found) return found;
        }
    }
    return null;
};

/**
 * Xác định Active Key dựa trên URL path hiện tại
 * @param path - location.pathname
 * @returns selectedKey và openKeys (cha)
 */
export const getActiveKeysFromPath = (path: string): { selectedKey: string, parentKey?: string } => {
    // 1. Check Dynamic Warehouse Routes
    // URL: /warehouse/:code
    if (path.includes('/warehouse/')) {
        const parts = path.split('/warehouse/');
        if (parts.length > 1) {
            const code = parts[1].split('/')[0];
            return { selectedKey: `warehouse-${code}` };
        }
    }

    // 2. Check Static Routes
    if (path.includes('/import/create')) return { selectedKey: MENU_KEYS.IMPORT.CREATE, parentKey: MENU_KEYS.IMPORT.ROOT };
    if (path.includes('/import/inventory-list') || path.includes('/import/inventory-check')) return { selectedKey: MENU_KEYS.IMPORT.INVENTORY, parentKey: MENU_KEYS.IMPORT.ROOT };
    if (path.includes('/import/list')) return { selectedKey: MENU_KEYS.IMPORT.LIST, parentKey: MENU_KEYS.IMPORT.ROOT };
    if (path.includes('/import/')) return { selectedKey: MENU_KEYS.IMPORT.LIST, parentKey: MENU_KEYS.IMPORT.ROOT };

    if (path.includes('all-devices')) return { selectedKey: MENU_KEYS.ALL_DEVICES };

    if (path.includes('/export/create')) return { selectedKey: MENU_KEYS.EXPORT.CREATE, parentKey: MENU_KEYS.EXPORT.ROOT };
    if (path.includes('/export/check')) return { selectedKey: MENU_KEYS.EXPORT.CHECK, parentKey: MENU_KEYS.EXPORT.ROOT };
    if (path.includes('/export/list')) return { selectedKey: MENU_KEYS.EXPORT.LIST, parentKey: MENU_KEYS.EXPORT.ROOT };
    if (path.includes('/export/')) return { selectedKey: MENU_KEYS.EXPORT.LIST, parentKey: MENU_KEYS.EXPORT.ROOT };

    if (path.includes('warranty')) return { selectedKey: 'warranty-activation-list', parentKey: 'warranty' };

    if (path.includes('/system/users')) return { selectedKey: MENU_KEYS.SYSTEM.USERS, parentKey: MENU_KEYS.SYSTEM.ROOT };
    if (path.includes('/system/roles')) return { selectedKey: MENU_KEYS.SYSTEM.ROLES, parentKey: MENU_KEYS.SYSTEM.ROOT };
    if (path.includes('/system/shared-data')) return { selectedKey: MENU_KEYS.SYSTEM.SHARED_DATA, parentKey: MENU_KEYS.SYSTEM.ROOT };

    return { selectedKey: MENU_KEYS.DASHBOARD };
};
