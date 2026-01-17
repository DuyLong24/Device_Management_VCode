import type { MenuProps } from 'antd';
import type { ReactNode } from 'react';


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
    if (path.includes('/import/create')) return { selectedKey: 'create-import', parentKey: 'import' };
    if (path.includes('/import/inventory-list') || path.includes('/import/inventory-check')) return { selectedKey: 'inventory-list', parentKey: 'import' };
    if (path.includes('/import/list')) return { selectedKey: 'import-list', parentKey: 'import' };

    if (path.includes('all-serials')) return { selectedKey: 'all-serials' };

    if (path.includes('/export/create')) return { selectedKey: 'create-export', parentKey: 'export' };
    if (path.includes('/export/check')) return { selectedKey: 'export-check', parentKey: 'export' };
    if (path.includes('export')) return { selectedKey: 'export-list', parentKey: 'export' };

    if (path.includes('warranty')) return { selectedKey: 'warranty-activation-list', parentKey: 'warranty' };

    if (path.includes('/system/users')) return { selectedKey: 'user-management', parentKey: 'system' };
    if (path.includes('/system/roles')) return { selectedKey: 'role-permission', parentKey: 'system' };

    return { selectedKey: 'dashboard' };
};
