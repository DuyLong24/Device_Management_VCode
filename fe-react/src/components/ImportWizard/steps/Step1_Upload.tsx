
import React from 'react';
import { Upload, Select, InputNumber, Form, Card, Button } from 'antd';
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons';
import type { DataImportSession } from '../../../services/data-import.service';

interface Step1Props {
    onUploadFile?: (file: File) => Promise<void>;
    onConfigChange: (sheetName: string, headerRow: number) => void;
    session: DataImportSession | null;
    loading: boolean;
    config: { sheetName: string, headerRow: number };
    onDownloadTemplate: () => void;
}

export const Step1_Upload: React.FC<Step1Props> = ({ onUploadFile, onConfigChange, session, loading, config, onDownloadTemplate }) => {
    const { Dragger } = Upload;

    return (
        <div className="space-y-4">
            <div className="h-40">
                <Dragger
                    name="file"
                    multiple={false}
                    accept=".xlsx, .xls"
                    customRequest={async ({ file, onSuccess, onError }) => {
                        try {
                            if (onUploadFile) {
                                await onUploadFile(file as File);
                            }
                            onSuccess?.("ok");
                        } catch (e) {
                            onError?.(e as any);
                        }
                    }}
                    showUploadList={false}
                    disabled={loading}
                >
                    <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                    <p className="ant-upload-text">Nhấp hoặc kéo thả file Excel vào đây</p>
                </Dragger>
            </div>

            <div className="flex justify-end">
                <Button icon={<DownloadOutlined />} onClick={onDownloadTemplate}>
                    Tải file mẫu
                </Button>
            </div>

            {session && (
                <Card size="small" title="Cấu hình đọc file" className="bg-gray-50">
                    <Form layout="inline">
                        <Form.Item label="Chọn Sheet dữ liệu">
                            <Select
                                style={{ width: 200 }}
                                value={config.sheetName}
                                onChange={v => onConfigChange(v, config.headerRow)}
                                options={session.sheets.map(s => ({ label: s, value: s }))}
                            />
                        </Form.Item>
                        <Form.Item label="Dòng tiêu đề (Header)">
                            <InputNumber
                                min={1}
                                value={config.headerRow + 1} // Display as 1-indexed
                                onChange={v => onConfigChange(config.sheetName, (v || 1) - 1)}
                            />
                        </Form.Item>
                    </Form>

                    {/* <Divider orientation="left">Xem trước dữ liệu gốc</Divider>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs border">
                            <thead>
                                <tr className="bg-gray-200">
                                    {session.preview.headers.map((h, i) => <th key={i} className="p-2 border">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {session.preview.sample.map((row, i) => (
                                    <tr key={i} className="border-b">
                                        {row.map((c, j) => <td key={j} className="p-1 border">{c}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-2 text-gray-500 text-center italic">
                            (Hiển thị 5 dòng đầu tiên / Tổng {session.preview.totalRows} dòng)
                        </div>
                    </div> */}
                </Card>
            )}
        </div>
    );
};
