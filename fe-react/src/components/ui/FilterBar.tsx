import { Card, Form, Row, Col, Input, DatePicker, Select, Button, Space } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';

const { RangePicker } = DatePicker;

interface FilterOption {
    value: string;
    label: string;
}

interface FilterBarProps {
    form: FormInstance;
    onFilter?: () => void;
    onReset?: () => void;
    onValuesChange?: () => void;
    searchPlaceholder?: string;
    showDateRange?: boolean;
    statusOptions?: FilterOption[];
    statusPlaceholder?: string;
    showReload?: boolean;
    onReload?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
    form,
    onFilter,
    onReset,
    onValuesChange,
    searchPlaceholder = 'Tìm kiếm...',
    showDateRange = true,
    statusOptions = [],
    statusPlaceholder = 'Trạng thái',
    showReload = false,
    onReload,
}) => {
    const handleReset = () => {
        form.resetFields();
        onReset?.();
    };

    return (
        <Card className="mb-6">
            <Form form={form} layout="inline" onFinish={onFilter} onValuesChange={onValuesChange}>
                <Row gutter={16} align="middle" style={{ width: '100%' }}>
                    <Col xs={24} sm={24} md={8} lg={8}>
                        <Form.Item name="keyword" style={{ marginBottom: 0, width: '100%' }}>
                            <Input placeholder={searchPlaceholder} prefix={<SearchOutlined />} allowClear />
                        </Form.Item>
                    </Col>

                    {showDateRange && (
                        <Col xs={24} sm={12} md={6} lg={6}>
                            <Form.Item name="dateRange" style={{ marginBottom: 0, width: '100%' }}>
                                <RangePicker
                                    style={{ width: '100%' }}
                                    format="DD/MM/YYYY"
                                    placeholder={['Từ ngày', 'Đến ngày']}
                                />
                            </Form.Item>
                        </Col>
                    )}

                    {statusOptions.length > 0 && (
                        <Col xs={24} sm={12} md={6} lg={6}>
                            <Form.Item name="status" style={{ marginBottom: 0, width: '100%' }}>
                                <Select placeholder={statusPlaceholder} allowClear options={statusOptions} />
                            </Form.Item>
                        </Col>
                    )}

                    <Col xs={24} sm={24} md={4} lg={4}>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            {onFilter && (
                                <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                                    Lọc
                                </Button>
                            )}
                            <Button icon={<ReloadOutlined />} onClick={showReload ? onReload : handleReset}>
                                {showReload ? '' : 'Reset'}
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Form>
        </Card>
    );
};
