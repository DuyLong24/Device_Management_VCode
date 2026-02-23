import { Card, Space, Row, Input, Button, Alert } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { processScannerInput } from '../../../utils/mac.util';

interface ExportScannerProps {
    status?: string;
    manualMacs: string;
    setManualMacs: (val: string) => void;
    onImport: () => void;
    loading: boolean;
}

export const ExportScanner = ({ status, manualMacs, setManualMacs, onImport, loading }: ExportScannerProps) => {
    if (status === 'COMPLETED') {
        return (
            <Alert
                message="Phiên xuất kho này đã hoàn thành"
                description="Bạn không thể thêm hoặc xóa MAC trong phiên đã hoàn thành."
                type="success"
                showIcon
                className="mb-4"
            />
        );
    }

    return (
        <Card title="Quét MAC xuất kho" className="mb-2">
            <Space direction="vertical" className="w-full" size="middle">
                <Row gutter={16}>
                    <Space direction="vertical" className="w-full">
                        <Input.TextArea
                            rows={5}
                            placeholder="MAC-001&#10;MAC-002..."
                            value={manualMacs}
                            onChange={e => {
                                const cleanVal = processScannerInput(e.target.value);
                                setManualMacs(cleanVal);
                            }}
                            disabled={loading}
                        />
                        <Button block onClick={onImport} icon={<CheckCircleOutlined />} loading={loading}>Nhập danh sách</Button>
                    </Space>
                </Row>
            </Space>
        </Card>
    );
};
