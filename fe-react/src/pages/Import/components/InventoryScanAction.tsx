import { Card, Space, Select, Row, Divider, Input, Button, Typography } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { processScannerInput } from '../../../utils/mac.util';

const { Text } = Typography;

interface InventoryScanActionProps {
    sessionStatus: 'in-progress' | 'init' | 'completed';
    selectedDeviceCode: string | null;
    setSelectedDeviceCode: (val: string) => void;
    deviceModelOptions: any[];
    manualMacs: string;
    setManualMacs: (val: string) => void;
    handleManualImport: () => void;
    isSaving: boolean;
}

export const InventoryScanAction = ({
    sessionStatus,
    selectedDeviceCode,
    setSelectedDeviceCode,
    deviceModelOptions,
    manualMacs,
    setManualMacs,
    handleManualImport,
    isSaving
}: InventoryScanActionProps) => {
    if (sessionStatus !== 'in-progress') return null;

    return (
        <Card title="Quét mac kiểm kê" className="mb-6 shadow-sm">
            <Space direction="vertical" className="w-full" size="middle">
                <div className="bg-blue-50 p-4 rounded border border-blue-100">
                    <Text strong className="block mb-2 text-blue-800">1. Chọn thiết bị đang kiểm kê <span className="text-red-500">*</span></Text>
                    <Select
                        className="w-full"
                        size="large"
                        placeholder="-- Chọn mã thiết bị --"
                        options={deviceModelOptions}
                        value={selectedDeviceCode}
                        onChange={setSelectedDeviceCode}
                    />
                </div>

                <Row gutter={16}>
                    <Space direction="vertical" className="w-full" size="small">
                        <Divider>Quét mã mac</Divider>
                        <Input.TextArea
                            placeholder={selectedDeviceCode ? "Nhập từng mã mac trên một dòng" : "Vui lòng chọn thiết bị trước"}
                            disabled={!selectedDeviceCode || isSaving}
                            rows={5}
                            value={manualMacs}
                            onChange={(e) => {
                                const cleanVal = processScannerInput(e.target.value);
                                setManualMacs(cleanVal);
                            }}
                        />
                        <Button block icon={<CheckCircleOutlined />} onClick={handleManualImport}>
                            Nhập
                        </Button>
                    </Space>
                </Row>
            </Space>
        </Card>
    );
};
