import React from 'react';
import { Radio, Select, Checkbox, Card, Space, Typography, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

export interface ImportConfig {
    mergeStrategy: 'upsert' | 'insert' | 'update';
    duplicateKey: string;
    skipEmpty: boolean;
    autoCreateCategory: boolean;
}

interface Step2_ConfigurationProps {
    config: ImportConfig;
    onChange: (config: ImportConfig) => void;
    fieldDefinitions: any[]; // To get available keys for duplicate check
}

export const Step2_Configuration: React.FC<Step2_ConfigurationProps> = ({
    config,
    onChange
}) => {
    const handleChange = (key: keyof ImportConfig, value: any) => {
        onChange({ ...config, [key]: value });
    };

    return (
        <div className="max-w-2xl mx-auto py-4">
            <Title level={4} className="mb-6 text-center">Cấu hình Quy tắc Nhập liệu</Title>

            <Space direction="vertical" size="large" className="w-full">
                {/* 1. Strategy Selection */}
                <Card title="1. Chế độ Nhập (Mode)" size="small" className="shadow-sm">
                    <Radio.Group
                        value={config.mergeStrategy}
                        onChange={(e) => handleChange('mergeStrategy', e.target.value)}
                        className="flex flex-col gap-4"
                    >
                        <Radio value="insert">
                            <Space direction="vertical" size={0}>
                                <Text strong>Thêm mới (Insert Only)</Text>
                                <Text type="secondary" className="text-xs">
                                    Chỉ thêm dòng có mã chưa tồn tại. Bỏ qua các dòng trùng.
                                </Text>
                            </Space>
                        </Radio>
                        <Radio value="update">
                            <Space direction="vertical" size={0}>
                                <Text strong>Cập nhật (Update Only)</Text>
                                <Text type="secondary" className="text-xs">
                                    Chỉ cập nhật thông tin cho các mã đã tồn tại. Bỏ qua dòng mới.
                                </Text>
                            </Space>
                        </Radio>
                        <Radio value="upsert">
                            <Space direction="vertical" size={0}>
                                <Text strong>Thêm mới & Cập nhật (Upsert)</Text>
                                <Text type="secondary" className="text-xs">
                                    Tự động thêm mới nếu chưa có, hoặc cập nhật nếu đã tồn tại.
                                </Text>
                            </Space>
                        </Radio>
                    </Radio.Group>
                </Card>

                {/* 2. Duplicate Key */}
                <Card title="2. Khóa Định danh (Duplicate Key)" size="small" className="shadow-sm">
                    <div className="flex flex-col gap-2">
                        <Text className="mb-1">Hệ thống dùng trường nào để kiểm tra trùng lặp?</Text>
                        <Select
                            value={config.duplicateKey}
                            onChange={(val) => handleChange('duplicateKey', val)}
                            className="w-full"
                        >
                            <Select.Option value="mac">MAC Address (Mặc định)</Select.Option>
                            <Select.Option value="serial">Serial Number</Select.Option>
                            {/* Add other potential unique keys here */}
                        </Select>
                        <Text type="secondary" className="text-xs">
                            <InfoCircleOutlined className="mr-1" />
                            Khuyến nghị sử dụng <b>MAC Address</b> làm khóa chính cho thiết bị.
                        </Text>
                    </div>
                </Card>

                {/* 3. Advanced Options */}
                <Card title="3. Tùy chọn Nâng cao" size="small" className="shadow-sm">
                    <Space direction="vertical" className="w-full">
                        <Checkbox
                            checked={config.skipEmpty}
                            onChange={(e) => handleChange('skipEmpty', e.target.checked)}
                        >
                            <Space>
                                <Text>Bỏ qua ô trống (Skip Empty)</Text>
                                <Tooltip title="Nếu file Excel có ô trống, hệ thống sẽ giữ nguyên dữ liệu cũ trong Database thay vì xóa đi.">
                                    <InfoCircleOutlined className="text-gray-400" />
                                </Tooltip>
                            </Space>
                        </Checkbox>

                        <Checkbox
                            checked={config.autoCreateCategory}
                            onChange={(e) => handleChange('autoCreateCategory', e.target.checked)}
                        >
                            <Space>
                                <Text>Tự động tạo danh mục (Auto Create Category)</Text>
                                <Tooltip title="Nếu danh mục nhập vào chưa có, hệ thống sẽ tự động tạo mới.">
                                    <InfoCircleOutlined className="text-gray-400" />
                                </Tooltip>
                            </Space>
                        </Checkbox>
                        {/* 
                            Tính năng này tạm thời đánh dấu là OK vì chưa có DB cho danh mục.
                            Tương lai sẽ cần implement logic tạo mới Category/Model thật sự. 
                        */}
                    </Space>
                </Card>
            </Space>
        </div>
    );
};
