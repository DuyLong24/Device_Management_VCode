import { useNavigate } from 'react-router-dom';
import { Typography, Card, Segmented } from 'antd';
import { useAllDevices } from '../../hooks/useAllDevices';
import { DeviceStatsOverview, type DeviceStatistics } from './components/DeviceStatsOverview';
import { DeviceFilterBar } from './components/DeviceFilterBar';
import { DeviceListTable, type DeviceUI } from './components/DeviceListTable';

const { Title } = Typography;

export default function DeviceListPage() {
    const navigate = useNavigate();

    const {
        loading,
        dataSource,
        paginationConfig,
        handleTableChange,
        stats,
        warehouseOptions,
        categoryOptions,
        selectedCategory, setSelectedCategory,
        searchText, setSearchText,
        selectedWarehouseId, setSelectedWarehouseId,
        dateRange, setDateRange,
        handleReset,
        handleExport
    } = useAllDevices();

    return (
        <div className="p-3 max-w-400 mx-auto">
            {/* Header */}
            <div className="mb-2">
                <Title level={3} className="mb-1!"> Danh sách thiết bị</Title>
                {/* <Text type="secondary">Quản lý toàn bộ thiết bị (Device) trong hệ thống</Text> */}
            </div>

            {/* Category Filter */}
            <Card size="small" className="mb-4 bg-transparent border-0 shadow-none" styles={{ body: { padding: '0' } }}>
                <Segmented
                    options={[
                        { label: 'Tất cả', value: 'ALL' },
                        ...categoryOptions.map(c => ({ label: c.label, value: c.value }))
                    ]}
                    value={selectedCategory || 'ALL'}
                    onChange={(val) => setSelectedCategory(val === 'ALL' ? null : val as string)}
                    size="large"
                    className="shadow-sm bg-white"
                />
            </Card>

            {/* Stats */}
            <DeviceStatsOverview stats={stats as DeviceStatistics} />

            {/* Filters */}
            <DeviceFilterBar
                searchText={searchText}
                setSearchText={setSearchText}
                selectedWarehouseId={selectedWarehouseId}
                setSelectedWarehouseId={setSelectedWarehouseId}
                warehouseOptions={warehouseOptions}
                dateRange={dateRange}
                setDateRange={setDateRange}
                onReset={handleReset}
                onReload={() => window.location.reload()}
            />

            {/* Table */}
            <DeviceListTable
                dataSource={dataSource as DeviceUI[]}
                loading={loading}
                pagination={paginationConfig}
                onChange={handleTableChange}
                onExport={handleExport}
                onViewDetail={(mac) => navigate(`/device/${mac}`, { state: { activeMenuKey: 'all-devices' } })}
            />
        </div>
    );
}
