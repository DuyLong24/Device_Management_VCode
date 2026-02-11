import { useState, useEffect, useMemo } from 'react';
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
import { warehouseService } from '../../services/warehouse.service';
import { useQuery } from '@tanstack/react-query';

const { Title, Text } = Typography;

type PermissionAction =
    | 'VIEW'
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'SUBMIT'
    | 'APPROVE'
    | 'REJECT'
    | 'IMPORT'
    | 'EXPORT'
    | 'PRINT'
    | 'CHECK'
    | 'SCAN'
    | 'COMPLETE'
    | 'TRANSFER'
    | 'RESET_PASS'
    | 'SAVE_DRAFT'
    | 'DETAIL';

interface PermissionRow {
    key: string;
    module: string;
    feature: string;
    permissions: Partial<Record<PermissionAction, boolean>>;
}

export default function RolePermissionDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [role, setRole] = useState<RoleDTO | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [selectedModule, setSelectedModule] = useState<string>('dashboard');

    const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
    const [originalKeys, setOriginalKeys] = useState<string[]>([]);
    const [hasChanges, setHasChanges] = useState(false);

    const { data: warehouses = [] } = useQuery({
        queryKey: ['warehouses'],
        queryFn: warehouseService.getAll,
    });

    const { data: groups } = useQuery({
        queryKey: ['warehouse-groups'],
        queryFn: warehouseService.getAllGroups,
    });

    const { internalWarehouses, exportedWarehouses } = useMemo(() => {
        const internal: any[] = [];
        const exported: any[] = [];
        if (warehouses && groups) {
            warehouses.forEach((wh: any) => {
                const whGroupId = (typeof wh.groupId === 'object' && wh.groupId)
                    ? (wh.groupId as any)._id || (wh.groupId as any).id
                    : wh.groupId;
                const group = groups.find((g: any) => {
                    const gId = g._id || g.id;
                    return gId === whGroupId;
                }) || (typeof wh.groupId === 'object' ? wh.groupId : { code: 'OTHER' });

                if (group.code === 'INTERNAL') internal.push(wh);
                else if (group.code === 'EXPORTED') exported.push(wh);
            });
        }
        return { internalWarehouses: internal, exportedWarehouses: exported };
    }, [warehouses, groups]);

    const moduleTreeData: DataNode[] = useMemo(() => [
        { title: 'Dashboard', key: 'dashboard', isLeaf: true },
        { title: 'Tất cả thiết bị', key: 'devices', isLeaf: true },
        {
            title: 'Nhập kho', key: 'import',
            children: [
                { title: 'Danh sách phiếu nhập', key: 'import.list', isLeaf: true },
                { title: 'Tạo mới phiếu nhập', key: 'import.create', isLeaf: true },
                { title: 'Kiểm kê', key: 'import.inventory', isLeaf: true },
            ]
        },
        {
            title: 'Xuất kho', key: 'export',
            children: [
                { title: 'Danh sách phiếu xuất', key: 'export.list', isLeaf: true },
                { title: 'Tạo mới phiếu xuất', key: 'export.create', isLeaf: true },
                { title: 'Quét / Kiểm hàng', key: 'export.check', isLeaf: true },
            ]
        },
        {
            title: 'Kho nội bộ', key: 'warehouse_internal',
            children: internalWarehouses.map((wh: any) => ({
                title: wh.name, key: `wh_internal_${wh.code}`, isLeaf: true,
            }))
        },
        {
            title: 'Đã xuất', key: 'warehouse_exported',
            children: exportedWarehouses.map((wh: any) => ({
                title: wh.name, key: `wh_exported_${wh.code}`, isLeaf: true,
            }))
        },
        {
            title: 'Quản trị hệ thống', key: 'system',
            children: [
                { title: 'Người dùng', key: 'system.user', isLeaf: true },
                { title: 'Vai trò', key: 'system.role', isLeaf: true },
                { title: 'Dữ liệu dùng chung', key: 'system.shared', isLeaf: true },
            ]
        },
    ], [internalWarehouses, exportedWarehouses]);

    const getFeaturesByModule = (moduleKey: string): { key: string; title: string }[] => {
        // Top-level modules → show root + sub-features
        if (moduleKey === 'dashboard') return [{ key: 'dashboard', title: 'Dashboard' }];
        if (moduleKey === 'devices') return [
            { key: 'device.root', title: 'Truy cập Module' },
            { key: 'device.list', title: 'Danh sách thiết bị' },
        ];
        // Parent nodes: Import, Export, System → show root access only
        if (moduleKey === 'import') return [{ key: 'import.root', title: 'Truy cập Module Nhập kho' }];
        if (moduleKey === 'export') return [{ key: 'export.root', title: 'Truy cập Module Xuất kho' }];
        if (moduleKey === 'system') return [{ key: 'system.root', title: 'Truy cập Module Hệ thống' }];

        // Leaf children of Import
        if (moduleKey === 'import.list') return [{ key: 'import.list', title: 'Danh sách phiếu nhập' }];
        if (moduleKey === 'import.create') return [{ key: 'import.create', title: 'Tạo mới phiếu nhập' }];
        if (moduleKey === 'import.inventory') return [{ key: 'import.inventory', title: 'Kiểm kê' }];

        // Leaf children of Export
        if (moduleKey === 'export.list') return [{ key: 'export.list', title: 'Danh sách phiếu xuất' }];
        if (moduleKey === 'export.create') return [{ key: 'export.create', title: 'Tạo mới phiếu xuất' }];
        if (moduleKey === 'export.check') return [{ key: 'export.check', title: 'Quét / Kiểm hàng' }];

        // Warehouse groups (parent node) → show root + all warehouses in that group
        if (moduleKey === 'warehouse_internal') return [
            { key: 'warehouse.root', title: 'Truy cập Module Kho' },
            ...internalWarehouses.map((wh: any) => ({
                key: `warehouse.${wh.code}`, title: wh.name,
            }))
        ];
        if (moduleKey === 'warehouse_exported') return [
            { key: 'warehouse.root', title: 'Truy cập Module Kho' },
            ...exportedWarehouses.map((wh: any) => ({
                key: `warehouse.${wh.code}`, title: wh.name,
            }))
        ];

        // Individual warehouse leaf
        if (moduleKey.startsWith('wh_internal_') || moduleKey.startsWith('wh_exported_')) {
            const code = moduleKey.replace('wh_internal_', '').replace('wh_exported_', '');
            const wh = warehouses.find((w: any) => w.code === code);
            if (wh) return [{ key: `warehouse.${wh.code}`, title: wh.name }];
        }

        // Leaf children of System
        if (moduleKey === 'system.user') return [{ key: 'system.user', title: 'Quản lý người dùng' }];
        if (moduleKey === 'system.role') return [{ key: 'system.role', title: 'Quản lý vai trò' }];
        if (moduleKey === 'system.shared') return [{ key: 'system.shared', title: 'Dữ liệu dùng chung' }];

        return [];
    };

    const isActionApplicable = (featureKey: string, action: PermissionAction): boolean => {
        const key = featureKey.toLowerCase();
        if (key.includes('root') || key === 'dashboard') return action === 'VIEW';

        // Specific Lists
        if (key === 'import.list') return ['VIEW', 'DETAIL', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT'].includes(action);
        if (key === 'export.list') return ['VIEW', 'DETAIL', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT'].includes(action);
        if (key === 'device.list') return ['VIEW', 'DETAIL', 'EXPORT'].includes(action);
        if (key === 'system.user') return ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'RESET_PASS'].includes(action);
        if (key === 'system.role') return ['VIEW', 'UPDATE'].includes(action);
        if (key === 'system.shared') return ['VIEW', 'CREATE', 'UPDATE', 'DELETE'].includes(action);

        // Specific Pages
        if (key === 'import.create') return ['VIEW', 'SAVE_DRAFT', 'SUBMIT'].includes(action);
        if (key === 'export.create') return ['VIEW', 'SAVE_DRAFT', 'SUBMIT'].includes(action);

        // Inventory/Check
        if (key === 'import.inventory') return ['VIEW', 'CHECK'].includes(action);
        if (key === 'export.check') return ['VIEW', 'SCAN', 'COMPLETE'].includes(action);

        // Dynamic Warehouse
        if (key.startsWith('warehouse.')) return ['VIEW', 'TRANSFER'].includes(action);

        return false;
    };

    const getModuleRootKey = (moduleKey: string): string | null => {
        const rootMap: Record<string, string> = {
            'import': 'import.root',
            'export': 'export.root',
            'devices': 'device.root',
            'system': 'system.root',
            'warehouse': 'warehouse.root',
        };
        return rootMap[moduleKey] || null;
    };

    const getModuleForFeature = (featureKey: string): string | null => {
        if (featureKey.startsWith('import.')) return 'import';
        if (featureKey.startsWith('export.')) return 'export';
        if (featureKey.startsWith('device.')) return 'devices';
        if (featureKey.startsWith('system.')) return 'system';
        if (featureKey.startsWith('warehouse.')) return 'warehouse';
        return null;
    };

    const getPermissionKey = (featureKey: string, action: PermissionAction): string => {
        return `${featureKey}.${action.toLowerCase()}`;
    };

    const handlePermissionChange = (featureKey: string, action: PermissionAction, checked: boolean) => {
        let newKeys = [...checkedKeys];
        const permKey = getPermissionKey(featureKey, action);
        const isRoot = featureKey.includes('root');

        if (isRoot && action === 'VIEW') {
            if (!checked) {
                const moduleKey = getModuleForFeature(featureKey);
                if (moduleKey) {
                    const allModuleKeys = [moduleKey, ...getSubModuleKeys(moduleKey)];
                    allModuleKeys.forEach(mk => {
                        const features = getFeaturesByModule(mk);
                        features.forEach(feat => {
                            newKeys = newKeys.filter(k => !k.startsWith(feat.key + '.'));
                        });
                    });
                }
            } else {
                if (!newKeys.includes(permKey)) newKeys.push(permKey);
            }
        } else if (action === 'VIEW') {
            if (!checked) {
                newKeys = newKeys.filter(k => !k.startsWith(featureKey + '.'));
            } else {
                if (!newKeys.includes(permKey)) newKeys.push(permKey);
                const moduleKey = getModuleForFeature(featureKey);
                if (moduleKey) {
                    const rootKey = getModuleRootKey(moduleKey);
                    if (rootKey) {
                        const rootViewKey = getPermissionKey(rootKey, 'VIEW');
                        if (!newKeys.includes(rootViewKey)) newKeys.push(rootViewKey);
                    }
                }
            }
        } else {
            if (checked) {
                if (!newKeys.includes(permKey)) newKeys.push(permKey);
                const viewKey = getPermissionKey(featureKey, 'VIEW');
                if (!newKeys.includes(viewKey)) newKeys.push(viewKey);
                const moduleKey = getModuleForFeature(featureKey);
                if (moduleKey) {
                    const rootKey = getModuleRootKey(moduleKey);
                    if (rootKey) {
                        const rootViewKey = getPermissionKey(rootKey, 'VIEW');
                        if (!newKeys.includes(rootViewKey)) newKeys.push(rootViewKey);
                    }
                }
            } else {
                newKeys = newKeys.filter(k => k !== permKey);
            }
        }
        setCheckedKeys(newKeys);
    };

    const getSubModuleKeys = (moduleKey: string): string[] => {
        const subMap: Record<string, string[]> = {
            'import': ['import.list', 'import.create', 'import.inventory'],
            'export': ['export.list', 'export.create', 'export.check'],
            'system': ['system.user', 'system.role', 'system.shared'],
            'warehouse': ['warehouse_internal', 'warehouse_exported'],
        };
        return subMap[moduleKey] || [];
    };

    useEffect(() => {
        if (checkedKeys.length !== originalKeys.length) {
            setHasChanges(true);
        } else {
            const sortedChecked = [...checkedKeys].sort();
            const sortedOriginal = [...originalKeys].sort();
            const isSame = sortedChecked.every((val, index) => val === sortedOriginal[index]);
            setHasChanges(!isSame);
        }
    }, [checkedKeys, originalKeys]);

    useEffect(() => {
        if (id) {
            loadRoleData(id);
        }
    }, [id]);

    const loadRoleData = async (roleId: string) => {
        setLoading(true);
        try {
            const roleData = await roleService.getById(roleId);
            setRole(roleData);
            const perms = roleData.permissions || [];

            if (roleData.code === 'super_admin' || roleData.code === 'SUPER_ADMIN') {
                const allKeys: string[] = [];
                const allModuleKeys = [
                    'dashboard', 'devices',
                    'import', 'import.list', 'import.create', 'import.inventory',
                    'export', 'export.list', 'export.create', 'export.check',
                    'warehouse_internal', 'warehouse_exported',
                    'system', 'system.user', 'system.role', 'system.shared',
                ];
                const actions: PermissionAction[] = ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'SUBMIT', 'APPROVE', 'REJECT', 'IMPORT', 'EXPORT', 'CHECK', 'SCAN', 'COMPLETE', 'TRANSFER', 'RESET_PASS', 'SAVE_DRAFT', 'DETAIL'];

                allModuleKeys.forEach(mod => {
                    const features = getFeaturesByModule(mod);
                    features.forEach(feat => {
                        actions.forEach(act => {
                            if (isActionApplicable(feat.key, act)) {
                                allKeys.push(getPermissionKey(feat.key, act));
                            }
                        });
                    });
                });

                warehouses.forEach((wh: any) => {
                    actions.forEach(act => {
                        if (isActionApplicable(`warehouse.${wh.code}`, act)) {
                            allKeys.push(getPermissionKey(`warehouse.${wh.code}`, act));
                        }
                    });
                });

                setCheckedKeys([...new Set(allKeys)]);
                setOriginalKeys([...new Set(allKeys)]);
            } else {
                setCheckedKeys(perms);
                setOriginalKeys(perms);
            }
        } catch (error) {
            message.error('Không thể tải thông tin vai trò');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!role) return;
        setSaving(true);
        try {
            await roleService.update(role.id, { permissions: checkedKeys });
            message.success('Cập nhật phân quyền thành công');
            setOriginalKeys(checkedKeys);
            setHasChanges(false);
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Lỗi khi lưu phân quyền');
        } finally {
            setSaving(false);
        }
    };

    const handleUndo = () => {
        setCheckedKeys([...originalKeys]);
        message.info('Đã hoàn tác');
    };

    const isSuperAdmin = role?.code === 'super_admin' || role?.code === 'SUPER_ADMIN';

    const allPermissionActions: { key: PermissionAction; label: string }[] = [
        { key: 'VIEW', label: 'Xem' },
        { key: 'DETAIL', label: 'Chi tiết' },
        { key: 'CREATE', label: 'Tạo' },
        { key: 'UPDATE', label: 'Sửa' },
        { key: 'DELETE', label: 'Xóa' },
        { key: 'SAVE_DRAFT', label: 'Lưu nháp' },
        { key: 'SUBMIT', label: 'Gửi' },
        { key: 'APPROVE', label: 'Duyệt' },
        { key: 'REJECT', label: 'Từ chối' },
        { key: 'EXPORT', label: 'Export' },
        { key: 'CHECK', label: 'Kiểm kê' },
        { key: 'SCAN', label: 'Scan' },
        { key: 'COMPLETE', label: 'Hoàn tất' },
        { key: 'TRANSFER', label: 'Chuyển' },
        { key: 'RESET_PASS', label: 'Reset PW' },
    ];

    const currentFeatures = useMemo(() => getFeaturesByModule(selectedModule), [selectedModule, warehouses, internalWarehouses, exportedWarehouses]);

    const visibleActions = useMemo(() => {
        const activeSet = new Set<PermissionAction>();
        currentFeatures.forEach(feat => {
            allPermissionActions.forEach(action => {
                if (isActionApplicable(feat.key, action.key)) {
                    activeSet.add(action.key);
                }
            });
        });
        return allPermissionActions.filter(a => activeSet.has(a.key));
    }, [currentFeatures]);

    const columns: TableColumnsType<PermissionRow> = [
        {
            title: 'Chức năng',
            dataIndex: 'feature',
            key: 'feature',
            width: 120,
            render: (text: string, record: PermissionRow) => {
                const isRoot = record.key.includes('root');
                return (
                    <Text
                        strong={isRoot}
                        style={isRoot ? { color: '#1677ff' } : undefined}
                    >
                        {text}
                    </Text>
                );
            },
        },
        ...visibleActions.map(action => ({
            title: action.label,
            key: action.key,
            width: 70,
            align: 'center' as const,
            render: (_: any, record: PermissionRow) => {
                if (!isActionApplicable(record.key, action.key)) {
                    return <Text type="secondary">-</Text>;
                }
                const permKey = getPermissionKey(record.key, action.key);
                const isChecked = checkedKeys.includes(permKey);

                return (
                    <Checkbox
                        checked={isChecked}
                        disabled={isSuperAdmin}
                        onChange={(e) => handlePermissionChange(record.key, action.key, e.target.checked)}
                    />
                );
            }
        }))
    ];

    const getTableData = (): PermissionRow[] => {
        const features = getFeaturesByModule(selectedModule);
        return features.map(feat => ({
            key: feat.key,
            module: selectedModule,
            feature: feat.title,
            permissions: {}
        }));
    };

    const findTreeNodeTitle = (nodes: DataNode[], key: string): string | null => {
        for (const node of nodes) {
            if (node.key === key) return node.title as string;
            if (node.children) {
                const found = findTreeNodeTitle(node.children, key);
                if (found) return found;
            }
        }
        return null;
    };

    if (loading) return <Spin className="block m-10 text-center" size="large" />;

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
            <div className="flex-1 overflow-hidden flex gap-4">
                {/* Left: Module Tree */}
                <Card
                    title="Danh sách module"
                    size="small"
                    className="w-1/4 h-full flex flex-col shadow-sm"
                    bodyStyle={{ flex: 1, overflow: 'auto' }}
                >
                    <Tree
                        treeData={moduleTreeData}
                        defaultExpandAll
                        selectedKeys={[selectedModule]}
                        onSelect={(keys) => {
                            if (keys.length > 0) setSelectedModule(keys[0] as string);
                        }}
                    />
                </Card>

                {/* Right: Permission Matrix */}
                <Card
                    title={`Phân quyền - ${findTreeNodeTitle(moduleTreeData, selectedModule) || selectedModule}`}
                    size="small"
                    className="w-3/4 h-full flex flex-col shadow-sm"
                    bodyStyle={{ flex: 1, overflow: 'hidden', padding: 0 }}
                >
                    {isSuperAdmin && (
                        <Alert
                            message="Super Admin mặc định có tất cả các quyền (Chế độ chỉ xem)"
                            type="info"
                            showIcon
                            className="m-4 mb-0"
                        />
                    )}
                    <Table
                        dataSource={getTableData()}
                        columns={columns}
                        pagination={false}
                        size="small"
                        bordered
                        tableLayout="fixed"
                        scroll={{
                            x: 'max-content',
                            y: 'calc(100vh - 280px)'
                        }}
                        rowKey="key"
                    />
                </Card>
            </div>
        </div>
    );
}
