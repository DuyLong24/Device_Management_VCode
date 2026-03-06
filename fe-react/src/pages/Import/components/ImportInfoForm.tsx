import React from 'react';
import { Card, Form, Input, Select, DatePicker, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';

import { categoryService } from '../../../services/category.service';
import { sharedDataService } from '../../../services/shared-data.service';

const { TextArea } = Input;

interface ImportInfoFormProps {
}

export const ImportInfoForm: React.FC<ImportInfoFormProps> = () => {
    // 1. Categories
    const { data: categoryOptions = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: () => categoryService.getAll(),
        select: (data: any[]) => data.map(c => ({ label: c.name, value: c.name })),
        staleTime: 60 * 60 * 1000
    });

    // 2. Origins (Sources)
    const { data: originOptions = [] } = useQuery({
        queryKey: ['origins'],
        queryFn: () => sharedDataService.getDataByGroupCode('ORIGIN'),
        select: (data: any[]) => (data || []).map(o => ({ label: o.name, value: o.code })),
        staleTime: 10 * 60 * 1000
    });

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

                <Form.Item name="deviceType" label="Loại hàng hóa" rules={[{ required: true, message: 'Vui lòng chọn loại hàng' }]} className="col-span-1 md:col-span-2 lg:col-span-1">
                    <Select placeholder="Chọn loại hàng" options={categoryOptions} />
                </Form.Item>

                <Form.Item name="origin" label="Nguồn gốc" rules={[{ required: true, message: 'Vui lòng chọn nguồn gốc' }]} className="col-span-1">
                    <Select options={originOptions} placeholder="Chọn nguồn gốc" />
                </Form.Item>

                <Form.Item name="importDate" label="Ngày nhập" rules={[{ required: true, message: 'Vui lòng chọn ngày nhập' }]} className="col-span-1">
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
