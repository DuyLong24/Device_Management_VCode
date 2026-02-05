export const PERMISSION_KEYS = {
    DASHBOARD: {
        VIEW: 'dashboard:VIEW',
    },
    IMPORT: {
        ROOT: {
            VIEW: 'import:VIEW',
            CREATE: 'import:CREATE',
            UPDATE: 'import:UPDATE',
            EXPORT: 'import:EXPORT',
        },
        INVENTORY: {
            VIEW: 'import.inventory:VIEW',
            CHECK: 'import.inventory:CHECK',
        }
    },
    EXPORT: {
        ROOT: {
            VIEW: 'export:VIEW',
            CREATE: 'export:CREATE',
            UPDATE: 'export:UPDATE',
            DELETE: 'export:DELETE',
            EXPORT: 'export:EXPORT',
        },
        APPROVE: {
            APPROVE: 'export.approve:APPROVE',
            REJECT: 'export.approve:REJECT',
        },
        CHECK: {
            VIEW: 'export.check:VIEW',
            CHECK: 'export.check:CHECK',
        }
    },
    DEVICE: {
        VIEW: 'device:VIEW',
        EXPORT: 'device:EXPORT',
    },
    WAREHOUSE: {
        VIEW: 'warehouse:VIEW',
        EXPORT: 'warehouse:EXPORT',
    },
    SYSTEM: {
        USER: {
            VIEW: 'system.user:VIEW',
            CREATE: 'system.user:CREATE',
            UPDATE: 'system.user:UPDATE',
            DELETE: 'system.user:DELETE',
        },
        ROLE: {
            VIEW: 'system.role:VIEW',
            UPDATE: 'system.role:UPDATE',
        },
        SHARED_DATA: {
            VIEW: 'system.shared:VIEW',
            UPDATE: 'system.shared:UPDATE',
        }
    }
} as const;

// Các permission keys thường dùng được export riêng để import dễ hơn
export const IMPORT_INVENTORY_CHECK = PERMISSION_KEYS.IMPORT.INVENTORY.CHECK;
export const EXPORT_CHECK = PERMISSION_KEYS.EXPORT.CHECK.CHECK;
