import type { ReactNode } from 'react';
import {
    DashboardOutlined, InboxOutlined, FileAddOutlined, UnorderedListOutlined, CheckCircleOutlined,
    CloseCircleOutlined, ToolOutlined, ExportOutlined, ClockCircleOutlined, FolderOutlined,
    AppstoreOutlined, DatabaseOutlined, CustomerServiceOutlined, SettingOutlined, TeamOutlined, SafetyOutlined, UserOutlined, LockOutlined, LogoutOutlined,
    SafetyCertificateOutlined,
    FieldTimeOutlined,
    DeleteOutlined
} from '@ant-design/icons';

// Màu sắc
export const DASHBOARD_COLORS = {
    BLUE: '#1890ff',
    GREEN: '#52c41a',
    RED: '#ff4d4f',
    ORANGE: '#faad14',
    PURPLE: '#722ed1',
    GREY: '#8c8c8c',
    PRIMARY: '#1677ff',
    BG_DARK: '#001529',
};

export const DEVICE_STATUS = {
    PENDING: 'PENDING',
    PENDING_QC: 'PENDING_QC',
    READY_TO_EXPORT: 'READY_TO_EXPORT',
    PASS: 'PASS',
    DEFECT: 'DEFECT',
    IN_WARRANTY: 'IN_WARRANTY',
    SOLD: 'SOLD'
};

export const DEVICE_STATUS_LABEL: Record<string, string> = {
    [DEVICE_STATUS.PENDING]: 'Chờ QC',
    [DEVICE_STATUS.PENDING_QC]: 'Chờ QC',
    [DEVICE_STATUS.READY_TO_EXPORT]: 'Sẵn sàng xuất',
    [DEVICE_STATUS.PASS]: 'Sẵn sàng xuất',
    [DEVICE_STATUS.DEFECT]: 'Lỗi',
    [DEVICE_STATUS.IN_WARRANTY]: 'Đang bảo hành',
    [DEVICE_STATUS.SOLD]: 'Đã bán',
    'default': 'Không xác định'
};

// Mapping màu (cho dynamic warehouse)
export const COLOR_MAP: Record<string, string> = {
    blue: DASHBOARD_COLORS.BLUE,
    green: DASHBOARD_COLORS.GREEN,
    red: DASHBOARD_COLORS.RED,
    orange: DASHBOARD_COLORS.ORANGE,
    purple: DASHBOARD_COLORS.PURPLE,
    grey: DASHBOARD_COLORS.GREY,
};

// Mapping Icons
export const ICON_MAP: Record<string, ReactNode> = {
    'clock-circle': <ClockCircleOutlined />,
    'check-circle': <CheckCircleOutlined />,
    'close-circle': <CloseCircleOutlined />,
    'tool': <ToolOutlined />,
    'export': <ExportOutlined />,
    'folder': <FolderOutlined />,
    'safety-certificate': <SafetyCertificateOutlined />,
    'field-time': <FieldTimeOutlined />,
    'delete': <DeleteOutlined />,
    'default': <AppstoreOutlined />
};

// Menu Labels & Keys
export const MENU_KEYS = {
    DASHBOARD: 'dashboard',
    IMPORT: {
        ROOT: 'import',
        LIST: 'import-list',
        CREATE: 'create-import',
        INVENTORY: 'inventory-list'
    },
    ALL_SERIALS: 'all-serials',
    INTERNAL_GROUP: 'group-internal',
    EXPORTED_GROUP: 'group-exported',
    EXPORT: {
        ROOT: 'export',
        LIST: 'export-list',
        CREATE: 'create-export',
        CHECK: 'export-check'
    },
    WARRANTY: {
        ROOT: 'warranty',
        LIST: 'warranty-activation-list'
    },
    SYSTEM: {
        ROOT: 'system',
        USERS: 'user-management',
        ROLES: 'role-permission'
    },
    USER: {
        PROFILE: 'profile',
        CHANGE_PASS: 'change-password',
        LOGOUT: 'logout'
    }
};

export const MENU_LABELS = {
    DASHBOARD: 'Dashboard',
    IMPORT: {
        ROOT: 'Quản lý nhập kho',
        LIST: 'Danh sách phiếu nhập kho',
        CREATE: 'Thêm mới phiếu nhập kho',
        INVENTORY: 'Kiểm kê sản phẩm nhập kho'
    },
    ALL_SERIALS: 'Danh sách MAC',
    INTERNAL_GROUP: 'Kho nội bộ',
    EXPORTED_GROUP: 'Đã xuất',
    EXPORT: {
        ROOT: 'Quản lý xuất kho',
        LIST: 'Danh sách phiếu xuất kho',
        CREATE: 'Thêm mới phiếu xuất kho',
        CHECK: 'Xuất kho - Quét MAC'
    },
    WARRANTY: {
        ROOT: 'Quản lý bảo hành',
        LIST: 'Danh sách bảo hành'
    },
    SYSTEM: {
        ROOT: 'Quản trị hệ thống',
        USERS: 'Quản lý tài khoản',
        ROLES: 'Quản lý vai trò & phân quyền'
    },
    USER: {
        PROFILE: 'Thông tin tài khoản',
        CHANGE_PASS: 'Đổi mật khẩu',
        LOGOUT: 'Đăng xuất'
    }
};

// Static Icon Definitions for Menu Sections
export const SECTION_ICONS = {
    DASHBOARD: <DashboardOutlined />,
    IMPORT: <InboxOutlined />,
    IMPORT_LIST: <UnorderedListOutlined />,
    IMPORT_CREATE: <FileAddOutlined />,
    IMPORT_INVENTORY: <CheckCircleOutlined />,
    ALL_SERIALS: <DatabaseOutlined />,
    INTERNAL: <AppstoreOutlined />,
    EXPORTED: <ExportOutlined />,
    EXPORT: <ExportOutlined rotate={180} />,
    EXPORT_LIST: <UnorderedListOutlined />,
    EXPORT_CREATE: <FileAddOutlined />,
    EXPORT_CHECK: <ScanOutlinedIcon />, // Helper wrapper if needed, or just import scan
    WARRANTY: <CustomerServiceOutlined />,
    WARRANTY_LIST: <UnorderedListOutlined />,
    SYSTEM: <SettingOutlined />,
    SYSTEM_USERS: <TeamOutlined />,
    SYSTEM_ROLES: <SafetyOutlined />,
    USER_PROFILE: <UserOutlined />,
    USER_LOCK: <LockOutlined />,
    USER_LOGOUT: <LogoutOutlined />
};

import { ScanOutlined } from '@ant-design/icons';
function ScanOutlinedIcon() { return <ScanOutlined />; }
