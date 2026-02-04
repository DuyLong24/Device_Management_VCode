
import React, { useEffect } from 'react';
import { Select } from 'antd';
import { ArrowRightOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';

export interface FieldDefinition {
    key: string;
    label: string;
    required?: boolean;
    description?: string;
}

interface Step3Props {
    excelHeaders: string[];
    fieldDefinitions: FieldDefinition[];
    mapping: Record<string, string>;
    onMappingChange: (newMapping: Record<string, string>) => void;
}

export const Step3_Mapping: React.FC<Step3Props> = ({ excelHeaders, fieldDefinitions, mapping, onMappingChange }) => {

    // Auto-map on load
    useEffect(() => {
        const newMapping = { ...mapping };
        let changed = false;
        fieldDefinitions.forEach(field => {
            if (!newMapping[field.key]) {
                // Try to find matching header (case-insensitive)
                const match = excelHeaders.find(h => h.toLowerCase() === field.label.toLowerCase() || h.toLowerCase() === field.key.toLowerCase());
                if (match) {
                    newMapping[field.key] = match;
                    changed = true;
                }
            }
        });
        if (changed) onMappingChange(newMapping);
    }, [excelHeaders, fieldDefinitions]);

    const handleMap = (fieldKey: string, header: string) => {
        onMappingChange({ ...mapping, [fieldKey]: header });
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
                {fieldDefinitions.map(field => {
                    const isMapped = !!mapping[field.key];
                    return (
                        <div key={field.key} className={`p-3 border rounded-lg flex items-center justify-between ${isMapped ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                            <div className="flex-1">
                                <div className="font-medium flex items-center gap-2">
                                    {field.label}
                                    {field.required && <span className="text-red-500">*</span>}
                                    {isMapped ? <CheckCircleOutlined className="text-green-500" /> : field.required && <WarningOutlined className="text-orange-500" />}
                                </div>
                                <div className="text-xs text-gray-500">{field.description || field.key}</div>
                            </div>

                            <ArrowRightOutlined className="mx-4 text-gray-400" />

                            <div className="flex-1">
                                <Select
                                    className="w-full"
                                    placeholder="Chọn cột Excel"
                                    value={mapping[field.key]}
                                    onChange={(val) => handleMap(field.key, val)}
                                    allowClear
                                    status={field.required && !isMapped ? 'warning' : ''}
                                >
                                    {excelHeaders.map(h => (
                                        <Select.Option key={h} value={h}>{h}</Select.Option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
