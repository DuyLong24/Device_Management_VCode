import { useState, useEffect } from 'react';
import {
    Card,
    Button,
    Space,
    Typography,
    Tag,
    Tree,
    Table,
    Checkbox,
    Alert,
    message,
    Spin
} from 'antd';
import {
    SaveOutlined,
    UndoOutlined,
    ArrowLeftOutlined,
    SafetyOutlined,
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { useNavigate, useParams } from 'react-router-dom';
import { roleService } from '../../services/role.service';
import type { RoleDTO } from '../../services/role.service';

const { Title, Text } = Typography;

// --- Types ---
type PermissionAction = 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'SUBMIT' | 'APPROVE' | 'REJECT' | 'EXPORT' | 'PRINT' | 'IMPORT' | 'CHECK';

interface PermissionRow {
    key: string;
    feature: string;
    permissions: Partial<Record<PermissionAction, boolean>>;
}

// --- Module Tree Data (Matched with PERMISSION_KEYS) ---
const moduleTreeData: DataNode[] = [
    { title: 'Dashboard', key: 'dashboard' },
    {
        title: 'Nhập kho',
        key: 'import',
        children: [
            { title: 'Quản lý phiếu nhập', key: 'import' },
            { title: 'Kiểm kê (Theo phiên)', key: 'import.inventory' },
        ],
    },
    {
        title: 'Xuất kho',
        key: 'export',
        children: [
            { title: 'Quản lý phiếu xuất', key: 'export' },
            { title: 'Duyệt phiếu xuất', key: 'export.approve' },
            { title: 'Kiểm tra xuất (Theo phiên)', key: 'export.check' },
        ],
    },
    {
        title: 'Thiết bị & Kho',
        key: 'resources',
        children: [
            { title: 'Danh sách thiết bị', key: 'device' },
            { title: 'Thông tin kho hàng', key: 'warehouse' },
        ]
    },
    {
        title: 'Hệ thống',
        key: 'system',
        children: [
            { title: 'Quản lý người dùng', key: 'system.user' },
            { title: 'Quản lý vai trò', key: 'system.role' },
            { title: 'Dữ liệu dùng chung', key: 'system.shared' },
        ],
    },
];

export default function RolePermissionDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    // State
    const [role, setRole] = useState<RoleDTO | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedModule, setSelectedModule] = useState<string>('dashboard');

    // Matrix State: { 'import.list': { VIEW: true, CREATE: false } }
    const [permissions, setPermissions] = useState<Record<string, Partial<Record<PermissionAction, boolean>>>>({});
    const [originalPermissions, setOriginalPermissions] = useState<Record<string, Partial<Record<PermissionAction, boolean>>>>({});
    const [hasChanges, setHasChanges] = useState(false);

    // Load Data
    useEffect(() => {
        if (id) {
            loadRoleData(id);
        }
    }, [id]);

    useEffect(() => {
        setHasChanges(JSON.stringify(permissions) !== JSON.stringify(originalPermissions));
    }, [permissions, originalPermissions]);

    const loadRoleData = async (roleId: string) => {
        setLoading(true);
        try {
            const roleData = await roleService.getById(roleId);
            setRole(roleData);

            // Convert API Array ['import.list:VIEW'] -> Matrix Object
            const matrix = convertApiToMatrix(roleData.permissions || []);
            setPermissions(matrix);
            setOriginalPermissions(matrix);
        } catch (error) {
            message.error('Không thể tải thông tin vai trò');
        } finally {
            setLoading(false);
        }
    };

    // --- Conversion Logic ---
    const convertApiToMatrix = (apiPerms: string[]) => {
        const matrix: Record<string, Partial<Record<PermissionAction, boolean>>> = {};

        apiPerms.forEach(permStr => {
            const [moduleKey, action] = permStr.split(':');
            if (!moduleKey || !action) return;

            if (!matrix[moduleKey]) matrix[moduleKey] = {};
            matrix[moduleKey][action as PermissionAction] = true;
        });
        return matrix;
    };

    const convertMatrixToApi = () => {
        const apiPerms: string[] = [];
        Object.entries(permissions).forEach(([moduleKey, actions]) => {
            Object.entries(actions).forEach(([action, isChecked]) => {
                if (isChecked) {
                    apiPerms.push(`${moduleKey}:${action}`);
                }
            });
        });
        return apiPerms;
    };

    // --- Handlers ---
    const handlePermissionChange = (featureKey: string, action: PermissionAction, checked: boolean) => {
        setPermissions(prev => {
            const newPerms = { ...prev };
            const featureActions = { ...(newPerms[featureKey] || {}) };

            // Logic: Checking any action auto-checks VIEW
            if (checked && action !== 'VIEW') {
                featureActions.VIEW = true;
            }

            // Logic: Unchecking VIEW unchecks everything
            if (!checked && action === 'VIEW') {
                Object.keys(featureActions).forEach(k => {
                    featureActions[k as PermissionAction] = false;
                });
            } else {
                featureActions[action] = checked;
            }

            newPerms[featureKey] = featureActions;
            return newPerms;
        });
    };

    const handleSave = async () => {
        if (!role) return;

        setSaving(true);
        try {
            const apiPerms = convertMatrixToApi();
            await roleService.update(role.id, { permissions: apiPerms });
            message.success('Cập nhật phân quyền thành công');
            setOriginalPermissions(permissions);
            setHasChanges(false);
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Lỗi khi lưu phân quyền');
        } finally {
            setSaving(false);
        }
    };

    const handleUndo = () => {
        setPermissions(JSON.parse(JSON.stringify(originalPermissions)));
        message.info('Đã hoàn tác');
    };

    // --- Render Helpers ---
    const getPermissionTableData = (): PermissionRow[] => {
        // Flatten tree to find children of selected module
        const findChildren = (nodes: DataNode[], key: string): DataNode[] => {
            for (const node of nodes) {
                if (node.key === key) {
                    return node.children || [node]; // Return children or self if leaf
                }
                if (node.children) {
                    const found = findChildren(node.children, key);
                    if (found.length) return found;
                }
            }
            return [];
        };

        const features = findChildren(moduleTreeData, selectedModule);

        return features.map(f => ({
            key: f.key.toString(),
            feature: f.title as string,
            permissions: permissions[f.key.toString()] || {}
        }));
    };

    // Mapping: Feature Key -> Allowed Actions
    const featureActionMap: Record<string, PermissionAction[]> = {
        'dashboard': ['VIEW'],
        'import': ['VIEW', 'CREATE', 'UPDATE', 'EXPORT'],
        'import.inventory': ['VIEW', 'CHECK'],
        'export': ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT'],
        'export.approve': ['APPROVE', 'REJECT'],
        'export.check': ['VIEW', 'CHECK'],
        'device': ['VIEW', 'EXPORT'],
        'warehouse': ['VIEW'],
        'system.user': ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
        'system.role': ['VIEW', 'UPDATE'],
        'system.shared': ['VIEW', 'CREATE', 'UPDATE', 'DELETE'],
    };

    const allPermissionActions: { key: PermissionAction; label: string }[] = [
        { key: 'VIEW', label: 'Xem' },
        { key: 'CREATE', label: 'Tạo' },
        { key: 'UPDATE', label: 'Sửa' },
        { key: 'DELETE', label: 'Xóa' },
        { key: 'APPROVE', label: 'Duyệt' },
        { key: 'REJECT', label: 'Từ chối' },
        { key: 'EXPORT', label: 'Export' },
        { key: 'CHECK', label: 'Kiểm (Scan)' },
    ];

    const columns: TableColumnsType<PermissionRow> = [
        { title: 'Chức năng', dataIndex: 'feature', key: 'feature', fixed: 'left', width: 250 },
        ...allPermissionActions.map(action => ({
            title: action.label,
            key: action.key,
            align: 'center' as const,
            render: (_: any, record: PermissionRow) => {
                const allowedActions = featureActionMap[record.key] || [];
                if (!allowedActions.includes(action.key)) {
                    return null;
                }

                return (
                    <Checkbox
                        checked={isSuperAdmin ? true : record.permissions?.[action.key]}
                        disabled={isSuperAdmin}
                        onChange={(e) => handlePermissionChange(record.key, action.key, e.target.checked)}
                    />
                );
            }
        }))
    ];

    if (loading) return <Spin className="block m-10 text-center" size="large" />;

    const isSuperAdmin = role?.code === 'super_admin' || role?.code === 'SUPER_ADMIN';

    return (
        <div className="p-4 h-[calc(100vh-64px)] flex flex-col">
            {/* Header */}
            <div className="mb-4 flex justify-between items-center bg-white p-4 rounded shadow-sm">
                <Space>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/system/roles')}>Quay lại</Button>
                    <div className="ml-2">
                        <Title level={4} className="!m-0 flex items-center gap-2">
                            <SafetyOutlined />
                            Phân quyền: {role?.name}
                        </Title>
                        <Tag color="geekblue">{role?.code}</Tag>
                    </div>
                </Space>

                <Space>
                    {isSuperAdmin && <Text type="danger" strong>Super Admin có toàn quyền (Không thể sửa)</Text>}

                    <Button
                        icon={<UndoOutlined />}
                        disabled={!hasChanges || isSuperAdmin}
                        onClick={handleUndo}
                    >
                        Hoàn tác
                    </Button>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        disabled={!hasChanges || isSuperAdmin}
                        loading={saving}
                        onClick={handleSave}
                    >
                        Lưu thay đổi
                    </Button>
                </Space>
            </div>

            {/* Content */}
            <div className="flex-1 flex gap-4 overflow-hidden">
                {/* Module Tree */}
                <Card title="Module" className="w-1/4 h-full overflow-auto shadow-sm" size="small">
                    <Tree
                        treeData={moduleTreeData}
                        defaultExpandAll
                        selectedKeys={[selectedModule]}
                        onSelect={(keys) => keys.length && setSelectedModule(keys[0].toString())}
                        blockNode
                    />
                </Card>

                {/* Matrix */}
                <Card title="Ma trận phân quyền" className="w-3/4 h-full overflow-auto shadow-sm" size="small">
                    {isSuperAdmin && (
                        <Alert
                            message="Super Admin mặc định có tất cả các quyền (Chế độ chỉ xem)"
                            type="info"
                            showIcon
                            className="mb-4"
                        />
                    )}
                    <Table
                        dataSource={getPermissionTableData()}
                        columns={columns}
                        pagination={false}
                        bordered
                        size="small"
                    />
                </Card>
            </div>
        </div>
    );
}
