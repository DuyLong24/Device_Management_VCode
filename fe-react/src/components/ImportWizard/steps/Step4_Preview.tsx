
import React, { useState } from 'react';
import { Table, Tag, Segmented } from 'antd';
import type { ValidationSummary } from '../../../services/data-import.service';

interface Step4Props {
    validationResult: ValidationSummary | null;
}

export const Step4_Preview: React.FC<Step4Props> = ({ validationResult }) => {
    const [filter, setFilter] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');

    if (!validationResult) return <div>Chưa có dữ liệu kiểm tra.</div>;

    const columns = [
        {
            title: 'Dòng',
            dataIndex: 'row',
            width: 80,
            render: (v: number) => v + 1, // 0-indexed to 1-indexed
        },
        {
            title: 'Trạng thái',
            key: 'status',
            width: 120,
            render: (_: any, record: any) => (
                record.valid
                    ? <Tag color="success">Hợp lệ</Tag>
                    : <Tag color="error">Lỗi ({record.errors.length})</Tag>
            )
        },
        {
            title: 'Chi tiết lỗi',
            dataIndex: 'errors',
            render: (errors: string[]) => (
                <ul className="pl-4 m-0 text-red-600 list-disc">
                    {errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
            )
        },
        {
            title: 'Dữ liệu (Preview)',
            dataIndex: 'data',
            render: (data: any) => (
                <div className="text-xs text-gray-500 truncate max-w-xs">
                    {JSON.stringify(data)}
                </div>
            )
        }
    ];

    const dataSource = validationResult.details.filter(item => {
        if (filter === 'VALID') return item.valid;
        if (filter === 'INVALID') return !item.valid;
        return true;
    });

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                <div>
                    <div>Tổng số dòng: <b>{validationResult.total}</b></div>
                    <div className="text-green-600">Hợp lệ: <b>{validationResult.valid}</b></div>
                    <div className="text-red-600">Lỗi: <b>{validationResult.invalid}</b></div>
                </div>
                <Segmented
                    options={[
                        { label: 'Tất cả', value: 'ALL' },
                        { label: 'Hợp lệ', value: 'VALID' },
                        { label: 'Lỗi', value: 'INVALID' }
                    ]}
                    value={filter}
                    onChange={(v) => setFilter(v as any)}
                />
            </div>

            <Table
                columns={columns}
                dataSource={dataSource}
                rowKey="row"
                scroll={{ y: 300 }}
                pagination={false}
                size="small"
            />

            {validationResult.invalid > 0 && (
                <div className="text-red-500 italic text-sm">
                    * Các dòng lỗi sẽ bị bỏ qua khi thực hiện Import.
                </div>
            )}
        </div>
    );
};
