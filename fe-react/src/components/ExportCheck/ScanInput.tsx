import { Card, Input, Space, Button, message } from 'antd';
import { ScanOutlined, PlusOutlined, ImportOutlined } from '@ant-design/icons';
import { useState } from 'react';

interface ScanInputProps {
    onScan: (serial: string) => void;
    disabled?: boolean;
}

export const ScanInput = ({ onScan, disabled = false }: ScanInputProps) => {
    const [scannedInput, setScannedInput] = useState('');

    const handleScan = () => {
        if (!scannedInput.trim()) {
            message.warning('Vui lòng nhập serial');
            return;
        }
        onScan(scannedInput.trim().toUpperCase());
        setScannedInput('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleScan();
        }
    };

    return (
        <Card title="Quét Serial" className="mb-4">
            <Space.Compact style={{ width: '100%' }}>
                <Input
                    size="large"
                    placeholder="Quét hoặc nhập serial..."
                    value={scannedInput}
                    onChange={(e) => setScannedInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    prefix={<ScanOutlined />}
                    autoFocus
                    disabled={disabled}
                />
                <Button type="primary" size="large" onClick={handleScan} disabled={disabled}>
                    Quét
                </Button>
            </Space.Compact>

            <Space style={{ marginTop: 16 }}>
                <Button icon={<PlusOutlined />} disabled={disabled}>
                    Nhập thủ công
                </Button>
                <Button icon={<ImportOutlined />} disabled={disabled}>
                    Import Excel
                </Button>
            </Space>
        </Card>
    );
};
