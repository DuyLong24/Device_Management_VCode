import { useState, useEffect } from 'react';
import { Modal, Tabs, Input, Button, Upload, Alert, message, Typography } from 'antd';
import { FileTextOutlined, FileExcelOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import * as XLSX from 'xlsx';
import { processScannerInput } from '../../utils/mac.util';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface BulkInputModalProps {
    open: boolean;
    onCancel: () => void;
    onOk: (serials: string[]) => void;
    title?: string;
    loading?: boolean;
}

export const BulkInputModal = ({
    open,
    onCancel,
    onOk,
    title = "Nhập danh sách Serial",
    loading = false
}: BulkInputModalProps) => {
    const [activeTab, setActiveTab] = useState('manual');
    const [tempSerials, setTempSerials] = useState<string>('');

    useEffect(() => {
        if (open) {
            setTempSerials('');
            setActiveTab('manual');
        }
    }, [open]);

    const handleOk = () => {
        // 1. Xử lý text
        const rawList = tempSerials
            .split('\n')
            .map(s => s.trim())
            .filter(s => s !== '');

        if (rawList.length === 0) {
            message.warning('Danh sách trống');
            return;
        }

        // 2. Xóa trùng lặp
        const uniqueList = [...new Set(rawList)];

        if (uniqueList.length !== rawList.length) {
            message.info(`Đã lọc bỏ ${rawList.length - uniqueList.length} mã trùng lặp trong danh sách nhập.`);
        }

        onOk(uniqueList);
    };

    const handleExcelUpload: UploadProps['beforeUpload'] = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

                const extractedSerials: string[] = [];
                // Lấy dữ liệu từ cột đầu tiên, bỏ hàng đầu(ô tiêu đề)
                jsonData.slice(1).forEach(row => {
                    if (row[0]) extractedSerials.push(String(row[0]).trim());
                });

                if (extractedSerials.length === 0) {
                    message.warning('Không tìm thấy dữ liệu serial nào trong cột đầu tiên (từ dòng 2).');
                    return;
                }

                const current = tempSerials ? tempSerials.split('\n') : [];
                const merged = [...current, ...extractedSerials].filter(s => s.trim() !== '');
                setTempSerials(merged.join('\n'));

                message.success(`Đã đọc ${extractedSerials.length} serial từ file Excel.`);
                setActiveTab('manual');

            } catch (err) {
                console.error(err);
                message.error('Lỗi đọc file Excel. Vui lòng kiểm tra định dạng.');
            }
        };
        reader.readAsBinaryString(file);
        return false;
    };

    return (
        <Modal
            title={title}
            open={open}
            onOk={handleOk}
            onCancel={onCancel}
            confirmLoading={loading}
            width={700}
            okText="Xác nhận nhập"
            cancelText="Hủy bỏ"
            destroyOnClose
        >
            <Alert
                message="Hướng dẫn"
                description={(
                    <ul className="list-disc pl-4 mt-1 text-xs text-gray-600">
                        <li>Dán danh sách serial (mỗi mã 1 dòng) hoặc upload Excel.</li>
                        <li>Với Excel: Serial phải ở cột A, bắt đầu từ dòng 2 (có tiêu đề).</li>
                    </ul>
                )}
                type="info"
                showIcon
                className="mb-4"
            />

            <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
                {
                    key: 'manual',
                    label: <span><FileTextOutlined /> Nhập thủ công</span>,
                    children: (
                        <div>
                            <TextArea
                                rows={10}
                                placeholder="SN-001&#10;SN-002&#10;SN-003..."
                                value={tempSerials}
                                onChange={(e) => {
                                    const cleanVal = processScannerInput(e.target.value);
                                    setTempSerials(cleanVal);
                                }}
                                className="font-mono text-sm"
                            />
                            <div className="flex justify-between mt-2 text-gray-500 text-xs">
                                <span>Đã nhập: {tempSerials ? tempSerials.split('\n').filter(s => s.trim()).length : 0} dòng</span>
                            </div>
                        </div>
                    )
                },
                {
                    key: 'excel',
                    label: <span><FileExcelOutlined /> Upload Excel</span>,
                    children: (
                        <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                            <div className="mb-4">
                                <FileExcelOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                            </div>
                            <Title level={5}>Tải lên file Excel</Title>
                            <Text type="secondary" className="block mb-4">
                                Hỗ trợ .xlsx, .xls
                            </Text>

                            <Upload
                                beforeUpload={handleExcelUpload}
                                showUploadList={false}
                                accept=".xlsx, .xls"
                            >
                                <Button icon={<UploadOutlined />} size="large">Chọn file</Button>
                            </Upload>
                        </div>
                    )
                }
            ]} />
        </Modal>
    );
};
