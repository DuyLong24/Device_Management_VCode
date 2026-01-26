import React from 'react';
import { Modal, Alert, Tabs, Typography, Input, Button, Upload, message } from 'antd';
import { FileTextOutlined, FileExcelOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

interface DeviceSelectionModalProps {
    open: boolean;
    onCancel: () => void;
    onSave: (macs: string[]) => void;
    initialMacs: string[];
    deviceKey: string | null;
    requiredQuantity?: number;
}

export const DeviceSelectionModal: React.FC<DeviceSelectionModalProps> = ({
    open,
    onCancel,
    onSave,
    initialMacs,
    // deviceKey, // Not strictly used in render logic but passed for context
    requiredQuantity
}) => {
    const [tempMacs, setTempMacs] = React.useState<string>('');
    const [activeTab, setActiveTab] = React.useState('manual');

    React.useEffect(() => {
        if (open) {
            setTempMacs(initialMacs.join('\n'));
            setActiveTab('manual');
        }
    }, [open, initialMacs]);

    const handleSave = () => {
        const rawList = tempMacs.split('\n').map(s => s.trim()).filter(s => s !== '');
        onSave(rawList);
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
                jsonData.slice(1).forEach(row => {
                    if (row[0]) extractedSerials.push(String(row[0]).trim());
                });

                const current = tempMacs ? tempMacs.split('\n') : [];
                const merged = [...current, ...extractedSerials].filter(s => s.trim() !== '');
                setTempMacs(merged.join('\n'));

                message.success(`Đã đọc được ${extractedSerials.length} MAC từ file Excel`);
                setActiveTab('manual');
            } catch (err) {
                message.error('Lỗi đọc file Excel. Vui lòng kiểm tra định dạng.');
            }
        };
        reader.readAsBinaryString(file);
        return false;
    };

    return (
        <Modal
            title="Nhập danh sách MAC"
            open={open}
            onOk={handleSave}
            onCancel={onCancel}
            width={700}
            okText="Cập nhật"
            cancelText="Hủy"
        >
            <Alert
                message="Hướng dẫn"
                description="Bạn có thể nhập thủ công (mỗi MAC 1 dòng) hoặc tải lên file Excel (cột A chứa MAC)."
                type="info"
                showIcon
                className="mb-4"
            />

            <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <TabPane tab={<span><FileTextOutlined /> Nhập thủ công</span>} key="manual">
                    <TextArea
                        rows={10}
                        placeholder="MAC-001&#10;MAC-002&#10;MAC-003..."
                        value={tempMacs}
                        onChange={(e) => setTempMacs(e.target.value)}
                        className="font-mono text-sm"
                    />
                    <div className="flex justify-between mt-2 text-gray-500">
                        <span>Đã nhập: {tempMacs.split('\n').filter(s => s.trim()).length} dòng</span>
                        {requiredQuantity !== undefined && (
                            <span>Yêu cầu: {requiredQuantity}</span>
                        )}
                    </div>
                </TabPane>

                <TabPane tab={<span><FileExcelOutlined /> Upload Excel</span>} key="excel">
                    <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="mb-4">
                            <FileExcelOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                        </div>
                        <Title level={5}>Tải lên file danh sách MAC</Title>
                        <Text type="secondary" className="block mb-4">
                            File Excel cần có cột đầu tiên (A) chứa mã MAC. Dòng 1 là tiêu đề (bỏ qua).
                        </Text>
                        <Upload beforeUpload={handleExcelUpload} showUploadList={false} accept=".xlsx, .xls">
                            <Button icon={<UploadOutlined />} size="large">Chọn file Excel</Button>
                        </Upload>
                    </div>
                </TabPane>
            </Tabs>
        </Modal>
    );
};
