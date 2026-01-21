import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Typography, Space, Button, Checkbox, Input, Select, App } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeftOutlined,
    ReloadOutlined,
    ScanOutlined,
    ImportOutlined,
    SwapOutlined,
    DownloadOutlined,
    SearchOutlined,
    EyeOutlined
} from '@ant-design/icons';

import { deviceService } from '../../services/device.service';
import { warehouseService } from '../../services/warehouse.service';
import { WAREHOUSE_LABELS } from '../../constants/warehouse.constants';

import TransferModal from './components/TransferModal';
import { ImportWizardModal } from '../../components/ImportWizard/ImportWizardModal';
import { type FieldDefinition } from '../../components/ImportWizard/steps/Step3_Mapping';

const { Title, Text } = Typography;

export default function WarehousePage() {
    const { code } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { message } = App.useApp(); // Use Context
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Filter States
    const [searchText, setSearchText] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<string | undefined>(undefined);

    // Selection State
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    // Modal States
    // Modal States
    const [transferModalVisible, setTransferModalVisible] = useState(false);
    const [importModalVisible, setImportModalVisible] = useState(false);

    // Import Fields
    const DEVICE_IMPORT_FIELDS: FieldDefinition[] = [
        { key: 'serial', label: 'Serial Number', required: true, description: 'Mã định danh duy nhất' },
        { key: 'deviceModel', label: 'Mã Model', required: true, description: 'Mã sản phẩm (SKU)' },
        { key: 'name', label: 'Tên thiết bị', description: 'Tên hiển thị (nếu trống sẽ dùng Model)' },
    ];

    // 1. Get Warehouse Info
    const { data: warehouses } = useQuery({
        queryKey: ['warehouses'],
        queryFn: warehouseService.getAll,
        staleTime: 5 * 60 * 1000
    });

    const currentWarehouse = useMemo(() => warehouses?.find(w => w.code === code), [warehouses, code]);

    // 2. Get Devices in Warehouse
    const { data: deviceData, isLoading, refetch } = useQuery({
        queryKey: ['devices', code, page, pageSize, searchText, selectedProduct],
        queryFn: () => deviceService.getAll({
            page,
            limit: pageSize,
            warehouseId: currentWarehouse?.id,
        }),
        enabled: !!currentWarehouse?.id
    });

    useEffect(() => {
        setPage(1);
        setSelectedRowKeys([]);
        setSearchText('');
    }, [code]);


    // --- Actions ---
    const { mutate: transferDevices } = useMutation({
        mutationFn: deviceService.bulkTransfer,
        onSuccess: (data) => {
            message.success(`Đã chuyển thành công ${data.success.length} thiết bị.`);
            queryClient.invalidateQueries({ queryKey: ['devices'] });
            refetch();
            setTransferModalVisible(false);
            setSelectedRowKeys([]);
        },
        onError: () => message.error('Có lỗi xảy ra khi xử lý')
    });

    const handleTransferSubmit = (toWarehouse: string, note: string, errorReason?: string) => {
        const targetWh = warehouses?.find(w => w.code === toWarehouse);
        if (!targetWh) {
            message.error('Kho đích không hợp lệ');
            return;
        }
        transferDevices({
            deviceIds: selectedRowKeys as string[],
            toWarehouseId: targetWh.id,
            note,
            errorReason
        });
    };

    /*                               3. DYNAMIC UI                                      */

    const getColumnDef = (colConfig: { key: string; title: string; type: string }) => {
        const base = {
            title: titleMap(colConfig),
            key: colConfig.key,
            dataIndex: colConfig.key,
        };
        base.title = colConfig.title || base.title;

        if (colConfig.key === 'serial') {
            return {
                ...base,
                render: (text: string) => (
                    <Button
                        type="link"
                        style={{ padding: 0 }}
                        onClick={() => navigate(`/serial/${text}`)}
                    >
                        {text}
                    </Button>
                )
            };
        }
        if (colConfig.type === 'action') {
            return {
                ...base,
                title: 'Thao tác',
                align: 'center' as const,
                width: 100,
                fixed: 'right' as const,
                render: (_: any, record: any) => (
                    <Button
                        type="text"
                        icon={<EyeOutlined />}
                        size="small"
                        title="Xem chi tiết"
                        onClick={() => navigate(`/serial/${record.serial}`)}
                    >
                        Chi tiết
                    </Button>
                )
            };
        }
        if (colConfig.type === 'date' || colConfig.key.includes('Date') || colConfig.key.includes('At')) {
            return {
                ...base,
                render: (date: string) => date ? new Date(date).toLocaleDateString('vi-VN') : '-'
            };
        }
        return base;
    };

    const titleMap = (c: any) => {
        const map: Record<string, string> = {
            serial: 'Serial',
            name: 'Tên thiết bị',
            model: 'Mã Model',
            importDate: 'Ngày nhập',
            qcStatus: 'QC Status',
            qcNote: 'QC Note',
        };
        return c.title || map[c.key] || c.key;
    };

    const normalizedColumns = (currentWarehouse?.config?.columns || []).map((c: any) => {
        if (typeof c === 'string') return { key: c, title: titleMap({ key: c }), type: 'text' };
        return c;
    });

    const dataColumns = normalizedColumns.map(getColumnDef);

    const transferOptions = useMemo(() => {
        if (!currentWarehouse?.config?.quickTransfers) return [];
        return currentWarehouse.config.quickTransfers.map(qt => ({
            to: qt.to,
            label: qt.label,
            description: qt.description,
        }));
    }, [currentWarehouse]);

    const rowSelection = {
        selectedRowKeys,
        onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
    };

    if (!code) return null;

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-4">
                <Button
                    type="link"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/dashboard')}
                    className="pl-0 mb-2"
                >
                    Quay lại Danh sách tổng
                </Button>
                <div className="flex justify-between items-center">
                    <div>
                        <Title level={3} className="!m-0">
                            📦 {currentWarehouse ? currentWarehouse.name : code}
                            <span className="text-base text-gray-400 ml-3 font-normal">
                                {deviceData?.totalResults || 0} serial
                            </span>
                        </Title>
                        {currentWarehouse?.description && <Text type="secondary">{currentWarehouse.description}</Text>}
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <Card size="small" className="mb-4">
                <Space wrap>
                    {currentWarehouse?.config?.actions?.includes('scan') && (
                        <Button type="primary" icon={<ScanOutlined />}>Quét mã</Button>
                    )}
                    {currentWarehouse?.config?.actions?.includes('import_excel') && (
                        <Button icon={<ImportOutlined />} onClick={() => setImportModalVisible(true)}>Import Excel</Button>
                    )}

                    {currentWarehouse?.config?.actions?.includes('transfer') && (
                        <Button
                            icon={<SwapOutlined />}
                            disabled={selectedRowKeys.length === 0}
                            onClick={() => setTransferModalVisible(true)}
                        >
                            Chuyển ({selectedRowKeys.length})
                        </Button>
                    )}

                    <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Làm mới</Button>
                    <Button icon={<DownloadOutlined />}>Xuất Excel</Button>
                </Space>
            </Card>

            {/* Filters */}
            <Card size="small" className="mb-4">
                <Space wrap>
                    <Input
                        placeholder="Tìm serial, mã SP..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-[300px]"
                        allowClear
                    />
                    <Select
                        placeholder="Lọc theo sản phẩm"
                        className="w-[200px]"
                        value={selectedProduct}
                        onChange={setSelectedProduct}
                        allowClear
                        options={[]} // Placeholder
                    />
                </Space>
            </Card>

            {/* Table Area */}
            <Card bodyStyle={{ padding: 0 }}>
                {selectedRowKeys.length > 0 && (
                    <div className="px-4 py-2 bg-blue-50 border-b border-gray-200">
                        <Space>
                            <Checkbox
                                checked={true}
                                disabled
                            />
                            <Text>Đã chọn <Text strong>{selectedRowKeys.length}</Text> serial</Text>
                            <Button type="link" size="small" onClick={() => setSelectedRowKeys([])}>Bỏ chọn</Button>
                        </Space>
                    </div>
                )}

                {!currentWarehouse && !isLoading ? (
                    <div className="text-center py-10">
                        <Text type="secondary">{WAREHOUSE_LABELS.NOT_FOUND}</Text>
                    </div>
                ) : (
                    <Table
                        columns={dataColumns}
                        dataSource={deviceData?.results || []}
                        loading={isLoading}
                        rowKey="id"
                        rowSelection={rowSelection}
                        pagination={{
                            current: page,
                            pageSize: pageSize,
                            total: deviceData?.totalResults || 0,
                            onChange: (p, ps) => {
                                setPage(p);
                                setPageSize(ps);
                            },
                            showSizeChanger: true,
                            showTotal: (total) => `Tổng ${total} serial`
                        }}
                    />
                )}
            </Card>

            {/* Modals */}
            <TransferModal
                open={transferModalVisible}
                onCancel={() => setTransferModalVisible(false)}
                onConfirm={handleTransferSubmit}
                count={selectedRowKeys.length}
                options={transferOptions}
            />

            <ImportWizardModal
                open={importModalVisible}
                onCancel={() => setImportModalVisible(false)}
                onSuccess={() => {
                    refetch();
                }}
                strategy="DEVICE"
                fieldDefinitions={DEVICE_IMPORT_FIELDS}
                payload={{ warehouseId: currentWarehouse?.id }}
            />
        </div>
    );
}
