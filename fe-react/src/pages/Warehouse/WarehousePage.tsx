import { useState } from 'react';
import { Card, Typography, Space, Button, Input, Select, Checkbox, Tooltip } from 'antd';
import {
    ReloadOutlined,
    ScanOutlined,
    ImportOutlined,
    SwapOutlined,
    DownloadOutlined,
    SearchOutlined
} from '@ant-design/icons';

import { WAREHOUSE_LABELS } from '../../constants/warehouse.constants';
import TransferModal from './components/TransferModal';
import { ScanSelectionModal } from './components/ScanSelectionModal';
import { ImportWizardModal } from '../../components/ImportWizard/ImportWizardModal';
import { type FieldDefinition } from '../../components/ImportWizard/steps/Step3_Mapping';
import { useWarehouseData } from '../../hooks/useWarehouseData';
import { WarehouseTable } from './components/WarehouseTable';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSION_KEYS } from '../../constants/permissionKeys';

const { Title, Text } = Typography;

export default function WarehousePage() {
    const { hasPermission } = useAuth();
    const canExport = hasPermission(PERMISSION_KEYS.WAREHOUSE.EXPORT);

    const {
        code,
        currentWarehouse,
        isLoading,
        dataSource,
        totalResults,
        page, setPage,
        pageSize, setPageSize,
        searchText, setSearchText,
        importCode, setImportCode,
        exportCode, setExportCode,
        selectedDeviceModel, setSelectedDeviceModel,
        selectedRowKeys, setSelectedRowKeys,
        setPriorityItems,
        modelOptions,
        transferOptions,
        refetch,
        handleTransferSubmit
    } = useWarehouseData();

    // Modal States - local UI state can remain here or move to hook if complex
    const [transferModalVisible, setTransferModalVisible] = useState(false);
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [scanModalVisible, setScanModalVisible] = useState(false);

    // Import Fields
    const DEVICE_IMPORT_FIELDS: FieldDefinition[] = [
        { key: 'mac', label: 'MAC Address', required: true, description: 'Địa chỉ MAC (Duy nhất)' },
        { key: 'serial', label: 'Serial (Optional)', required: false, description: 'Serial Number' },
        { key: 'deviceModel', label: 'Mã Model', required: true, description: 'Mã thiết bị (SKU)' },
        { key: 'name', label: 'Tên thiết bị', description: 'Tên hiển thị (nếu trống sẽ dùng Model)' },
    ];

    if (!code) return null;

    return (
        <div className="p-2">
            {/* Header */}
            <div className="mb-1">
                <div className="flex justify-between items-center">
                    <div>
                        <Title level={3} className="!m-0">
                            {currentWarehouse ? currentWarehouse.name : code}
                            <span className="text-base text-gray-400 ml-3 font-normal">
                                {totalResults || 0} thiết bị
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
                        <Button type="primary" icon={<ScanOutlined />} onClick={() => setScanModalVisible(true)}>Quét mã</Button>
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
                    <Tooltip title={!canExport ? 'Bạn không có quyền xuất file' : 'Xuất danh sách thiết bị trong kho'}>
                        <Button
                            icon={<DownloadOutlined />}
                            disabled={!canExport}
                        >
                            Xuất Excel
                        </Button>
                    </Tooltip>
                </Space>
            </Card>

            {/* Filters */}
            <Card size="small" className="mb-4">
                <Space wrap>
                    <Input
                        placeholder="Tìm mac, tên, model..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-[200px]"
                        allowClear
                    />
                    <Input
                        placeholder="Mã phiếu nhập"
                        value={importCode}
                        onChange={(e) => setImportCode(e.target.value)}
                        className="w-[150px]"
                        allowClear
                    />
                    <Input
                        placeholder="Mã phiếu xuất"
                        value={exportCode}
                        onChange={(e) => setExportCode(e.target.value)}
                        className="w-[150px]"
                        allowClear
                    />
                    <Select
                        placeholder="Lọc theo mã model"
                        className="w-[200px]"
                        value={selectedDeviceModel}
                        onChange={setSelectedDeviceModel}
                        allowClear
                        showSearch
                        options={modelOptions}
                        optionRender={(option) => (
                            <Space>
                                <span className="font-semibold">{option.data.value}</span>
                                {option.data.desc && <span className="text-gray-500">({option.data.desc})</span>}
                            </Space>
                        )}
                        filterOption={(input, option) =>
                            String(option?.value ?? '').toLowerCase().includes(input.toLowerCase()) ||
                            String(option?.desc ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                    />
                </Space>
            </Card>

            {/* Table Area */}
            <Card styles={{ body: { padding: 0 } }}>
                {selectedRowKeys.length > 0 && (
                    <div className="px-4 py-2 bg-blue-50 border-b border-gray-200">
                        <Space>
                            <Checkbox
                                checked={true}
                                disabled
                            />
                            <Text>Đã chọn <Text strong>{selectedRowKeys.length}</Text> thiết bị</Text>
                            <Button type="link" size="small" onClick={() => { setSelectedRowKeys([]); setPriorityItems([]); }}>Bỏ chọn</Button>
                        </Space>
                    </div>
                )}

                {!currentWarehouse && !isLoading ? (
                    <div className="text-center py-10">
                        <Text type="secondary">{WAREHOUSE_LABELS.NOT_FOUND}</Text>
                    </div>
                ) : (
                    <WarehouseTable
                        dataSource={dataSource}
                        isLoading={isLoading}
                        currentWarehouse={currentWarehouse}
                        page={page}
                        pageSize={pageSize}
                        totalResults={totalResults}
                        onChangePage={(p, ps) => {
                            setPage(p);
                            setPageSize(ps);
                        }}
                        rowSelection={{
                            selectedRowKeys,
                            onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
                        }}
                    />
                )}
            </Card>

            {/* Modals */}
            <TransferModal
                open={transferModalVisible}
                onCancel={() => setTransferModalVisible(false)}
                onConfirm={(to, note, err) => {
                    handleTransferSubmit(to, note, err);
                    setTransferModalVisible(false);
                }}
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

            <ScanSelectionModal
                visible={scanModalVisible}
                onCancel={() => setScanModalVisible(false)}
                onSelect={(ids, devices) => {
                    setSelectedRowKeys(prev => {
                        const set = new Set([...prev, ...ids]);
                        return Array.from(set);
                    });

                    if (devices && devices.length > 0) {
                        setPriorityItems(prev => {
                            const newItems = [...devices, ...prev];
                            const unique = new Map();
                            newItems.forEach(i => unique.set(i.id, i));
                            return Array.from(unique.values());
                        });
                    }
                }}
                currentWarehouseId={currentWarehouse?.id}
            />
        </div>
    );
}
