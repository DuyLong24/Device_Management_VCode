import React from 'react';
import { Card, Row, Col, Input, Select, DatePicker, Button } from 'antd';
import { SearchOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface DeviceFilterBarProps {
    searchText: string;
    setSearchText: (val: string) => void;
    selectedWarehouseId: string | null;
    setSelectedWarehouseId: (val: string | null) => void;
    warehouseOptions: { label: string; value: string }[];
    dateRange: [Dayjs | null, Dayjs | null] | null;
    setDateRange: (range: [Dayjs | null, Dayjs | null] | null) => void;
    onReset: () => void;
    onReload: () => void;
}

export const DeviceFilterBar: React.FC<DeviceFilterBarProps> = ({
    searchText,
    setSearchText,
    selectedWarehouseId,
    setSelectedWarehouseId,
    warehouseOptions,
    dateRange,
    setDateRange,
    onReset,
    onReload
}) => {
    return (
        <Card size="small" className="mb-4 shadow-sm border-gray-200">
            <Row gutter={[16, 16]} align="middle">
                <Col xs={24} md={6}>
                    <Input
                        placeholder="Tìm MAC, model, tên..."
                        prefix={<SearchOutlined className="text-gray-400" />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        allowClear
                    />
                </Col>
                <Col xs={24} md={6}>
                    <Select
                        placeholder="Lọc theo kho"
                        className="w-full"
                        value={selectedWarehouseId || undefined}
                        onChange={(val) => setSelectedWarehouseId(val)}
                        options={warehouseOptions}
                        allowClear
                    />
                </Col>
                <Col xs={24} md={6}>
                    <RangePicker
                        placeholder={['Từ ngày', 'Đến ngày']}
                        className="w-full"
                        value={dateRange}
                        onChange={setDateRange}
                        format="DD/MM/YYYY"
                    />
                </Col>
                <Col xs={24} md={6} className="flex justify-end gap-2">
                    <Button icon={<FilterOutlined />} onClick={onReset}>
                        Reset
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={onReload}>
                        Tải lại
                    </Button>
                </Col>
            </Row>
        </Card>
    );
};
