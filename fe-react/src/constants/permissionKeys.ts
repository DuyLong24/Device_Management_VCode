export const PERMISSION_KEYS = {
    DASHBOARD: {
        VIEW: 'dashboard.view',
    },
    IMPORT: {
        ROOT: {
            VIEW: 'import.root.view',
        },
        LIST: {
            VIEW: 'import.list.view',
            CREATE: 'import.list.create',
            UPDATE: 'import.list.update', // Sửa phiếu khi ở trạng thái nháp
            DELETE: 'import.list.delete',
            EXPORT: 'import.list.export',
            DETAIL: 'import.list.detail',
        },
        CREATE: {
            VIEW: 'import.create.view',
            SAVE_DRAFT: 'import.create.save_draft',
            SUBMIT: 'import.create.submit',
        },
        INVENTORY: {
            VIEW: 'import.inventory.view',
            CHECK: 'import.inventory.check', // Scan/Kiểm kê
        }
    },
    EXPORT: {
        ROOT: {
            VIEW: 'export.root.view',
        },
        LIST: {
            VIEW: 'export.list.view',
            CREATE: 'export.list.create',
            UPDATE: 'export.list.update',
            APPROVE: 'export.list.approve',
            REJECT: 'export.list.reject',
            EXPORT: 'export.list.export',
            DETAIL: 'export.list.detail',
            DELETE: 'export.list.delete',
        },
        CREATE: {
            VIEW: 'export.create.view',
            SAVE_DRAFT: 'export.create.save_draft',
            SUBMIT: 'export.create.submit',
        },
        CHECK: {
            VIEW: 'export.check.view',
            SCAN: 'export.check.scan',
            COMPLETE: 'export.check.complete',
        }
    },
    WAREHOUSE: {
        ROOT: {
            VIEW: 'warehouse.root.view',
        },
        // Dynamic keys will be handled logically (e.g., warehouse.{code}.view)
    },
    DEVICE: {
        ROOT: {
            VIEW: 'device.root.view',
        },
        LIST: {
            VIEW: 'device.list.view',
            EXPORT: 'device.list.export',
            DETAIL: 'device.list.detail',
        }
    },
    SYSTEM: {
        ROOT: {
            VIEW: 'system.root.view',
        },
        USER: {
            VIEW: 'system.user.view',
            CREATE: 'system.user.create',
            UPDATE: 'system.user.update',
            DELETE: 'system.user.delete',
            RESET_PASS: 'system.user.reset_pass',
        },
        ROLE: {
            VIEW: 'system.role.view',
            UPDATE: 'system.role.update', // Bao gồm cả Create/Delete/Edit permission
        },
        SHARED_DATA: {
            VIEW: 'system.shared.view',
            CREATE: 'system.shared.create',
            UPDATE: 'system.shared.update',
            DELETE: 'system.shared.delete',
        }
    }
} as const;

// Helper constants
export const IMPORT_INVENTORY_CHECK = PERMISSION_KEYS.IMPORT.INVENTORY.CHECK;
export const EXPORT_CHECK = PERMISSION_KEYS.EXPORT.CHECK.SCAN;

