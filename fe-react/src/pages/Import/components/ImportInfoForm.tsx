import React from 'react';
import { Card, Form, Input, Select, DatePicker, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';


const { TextArea } = Input;

interface ImportInfoFormProps {
    categoryOptions: { label: string; value: string }[];
    originOptions: { label: string; value: string }[];
    // userOptions: { label: string; value: string }[]; // Currently commented out in original
}

export const ImportInfoForm: React.FC<ImportInfoFormProps> = ({
    categoryOptions,
    originOptions,
}) => {
    return (
        <Card title={<span className="text-lg font-semibold">Thông tin chung phiếu nhập</span>} className="mb-6 shadow-sm border-gray-200" variant="borderless">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6">
                <Form.Item
                    name="code"
                    label={
                        <span>
                            Mã phiếu nhập{' '}
                            <Tooltip title="Mã tự sinh theo đợt xuất kho, có thể chỉnh sửa">
                                <InfoCircleOutlined className="text-gray-400" />
                            </Tooltip>
                        </span>
                    }
                    className="col-span-1" rules={[{ required: true, message: 'Vui lòng nhập mã phiếu' }]}>
                    <Input placeholder="Nhập mã phiếu nhập" className="font-semibold text-blue-600" />
                </Form.Item>

                <Form.Item name="deviceType" label="Loại hàng hóa" rules={[{ required: true }]} className="col-span-1 md:col-span-2 lg:col-span-1">
                    <Select placeholder="Chọn loại hàng" options={categoryOptions} />
                </Form.Item>

                <Form.Item name="origin" label="Nguồn gốc" rules={[{ required: true }]} className="col-span-1">
                    <Select options={originOptions} placeholder="Chọn nguồn gốc" />
                </Form.Item>

                <Form.Item name="importDate" label="Ngày nhập" rules={[{ required: true }]} className="col-span-1">
                    <DatePicker className="w-full" format="DD/MM/YYYY" />
                </Form.Item>

                <Form.Item name="supplier" label="Đơn vị xuất" className="col-span-1 md:col-span-2 lg:col-span-1">
                    <Input placeholder="Nhập tên nhà cung cấp" />
                </Form.Item>

                <Form.Item name="handoverPerson" label="Người bàn giao" className="col-span-1 md:col-span-2 lg:col-span-1">
                    <Input placeholder="Tên người giao hàng" />
                </Form.Item>

                <Form.Item name="notes" label="Ghi chú" className="col-span-1 md:col-span-2 lg:col-span-3">
                    <TextArea rows={2} placeholder="Ghi chú thêm..." className="resize-none" />
                </Form.Item>
            </div>
        </Card>
    );
};
