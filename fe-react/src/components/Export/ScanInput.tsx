import { useState, useRef } from 'react';
import { Card, Input, Button, Space, Typography } from 'antd';
import { ScanOutlined, ImportOutlined } from '@ant-design/icons';
import { BulkInputModal } from '../../components/common/BulkInputModal';
import { isValidScan } from '../../utils/mac.util';
import { useScanMode } from '../../hooks/useScanMode';

const { Text } = Typography;

interface ScanInputProps {
    onScan: (code: string) => void;
    onBulkScan: (codes: string[]) => void;
    loading?: boolean;
    disabled?: boolean;
}

export const ScanInput = ({ onScan, onBulkScan, loading = false, disabled = false }: ScanInputProps) => {
    const { mode: scanMode } = useScanMode();
    const [inputValue, setInputValue] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const inputRef = useRef<any>(null);

    const handleKeyScan = () => {
        const val = inputValue.trim();
        if (val) {
            // Validate MAC
            if (!isValidScan(val, scanMode)) {
                setInputValue('');
                setTimeout(() => inputRef.current?.focus(), 100);
                return;
            }

            onScan(val);
            setInputValue('');
            // Keep focus
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleBulkOk = (macs: string[]) => {
        onBulkScan(macs);
        setIsModalOpen(false);
    };

    return (
        <Card
            title={<span className="text-blue-600"><ScanOutlined /> Quét {scanMode === 'mac' ? 'MAC' : 'Serial'}</span>}
            className="shadow-md border-t-4 border-t-blue-500 mb-4"
            extra={
                <Button
                    type="link"
                    icon={<ImportOutlined />}
                    onClick={() => setIsModalOpen(true)}
                    disabled={disabled}
                >
                    Nhập nhiều / Excel
                </Button>
            }
        >
            <Space.Compact className="w-full mb-2">
                <Input
                    ref={inputRef}
                    placeholder={`Quét ${scanMode === 'mac' ? 'MAC' : 'Serial'}`}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onPressEnter={handleKeyScan}
                    autoFocus
                    prefix={<ScanOutlined className="text-gray-400" />}
                    size="large"
                    className="font-mono text-lg"
                    autoComplete="off"
                    disabled={disabled || loading}
                />
                <Button
                    type="primary"
                    size="large"
                    onClick={handleKeyScan}
                    loading={loading}
                    disabled={disabled}
                >
                    Quét
                </Button>
            </Space.Compact>

            <Text type="secondary" className="text-xs">
                * Hỗ trợ máy quét barcode hoặc nhập thủ công.
            </Text>

            <BulkInputModal
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={handleBulkOk}
            />
        </Card>
    );
};
