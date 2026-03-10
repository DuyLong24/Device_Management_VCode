import React, { useState, useEffect } from 'react';
import { Modal, Input, message, Typography, Alert, Button } from 'antd';
import { deviceService } from '../../../services/device.service';
import { processScannerInput } from '../../../utils/mac.util';
import { useScanMode } from '../../../hooks/useScanMode';
import { playScanSuccessSound } from '../../../utils/sound.util';
import { removeDuplicatesWithToast } from '../../../utils/array.util';
import { Radio } from 'antd';

const { Text } = Typography;
const { TextArea } = Input;

interface ScanSelectionModalProps {
    visible: boolean;
    onCancel: () => void;
    onSelect: (ids: string[], devices?: any[]) => void;
    currentWarehouseId?: string;
}

export const ScanSelectionModal: React.FC<ScanSelectionModalProps> = ({
    visible,
    onCancel,
    onSelect,
    currentWarehouseId
}) => {
    const { mode: scanMode, setMode: setScanMode } = useScanMode();
    const [payload, setPayload] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{ success: number; failed: string[]; failedRaw: string[] } | null>(null);

    // Load lại khi mở modal
    useEffect(() => {
        if (visible) {
            setPayload('');
            setResults(null);
        }
    }, [visible]);

    // Dọn rác khi đổi scanMode
    useEffect(() => {
        if (payload) {
            const cleaned = processScannerInput(payload, scanMode);
            setPayload(cleaned);
        }
    }, [scanMode]);

    const handleProcess = async () => {
        let macs = payload.split('\n').map(m => m.trim()).filter(Boolean);
        if (macs.length === 0) {
            message.warning(`Vui lòng nhập ${scanMode === 'mac' ? 'mã MAC' : 'số Serial'} `);
            return;
        }

        const cleanMacs = removeDuplicatesWithToast(macs, scanMode === 'mac' ? 'mã MAC' : 'số Serial');

        setLoading(true);
        setResults(null);
        const validIds: string[] = [];
        const validDevices: any[] = [];
        const failedMacs: string[] = [];
        const failedRaw: string[] = [];

        try {
            // Tìm kiếm song song
            const checkPromises = cleanMacs.map(async (mac) => {
                try {
                    // Tìm kiếm, pass scanMode xuống 
                    const res = await deviceService.getAll({ search: mac, limit: 1, scanMode });
                    const device = res.results.find((d: any) =>
                        scanMode === 'mac' ? d.mac === mac : d.serial === mac
                    );

                    if (!device) {
                        return { mac, error: 'Không tìm thấy' };
                    }

                    // Kiểm tra kho
                    const devWhId = typeof device.warehouseId === 'object' ? device.warehouseId?._id || device.warehouseId?.id : device.warehouseId;
                    const curWhId = currentWarehouseId;

                    if (String(devWhId) !== String(curWhId)) {
                        return { mac, error: 'Khác kho' };
                    }

                    return { mac, id: device.id, device, success: true };
                } catch (e) {
                    return { mac, error: 'Lỗi tìm kiếm' };
                }
            });

            const results = await Promise.all(checkPromises);

            results.forEach(r => {
                if (r.success && r.id) {
                    validIds.push(r.id);
                    validDevices.push(r.device);
                } else {
                    failedMacs.push(`${r.mac} (${r.error})`);
                    failedRaw.push(r.mac);
                }
            });

            if (validIds.length > 0) {
                onSelect(validIds, validDevices);
                message.success(`Đã chọn ${validIds.length} thiết bị.`);
            }

            if (failedMacs.length > 0) {
                setResults({ success: validIds.length, failed: failedMacs, failedRaw });
            } else {
                onCancel();
            }

        } catch (e) {
            message.error('Có lỗi xảy ra khi xử lý danh sách');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveInvalid = () => {
        if (!results || !results.failedRaw || results.failedRaw.length === 0) return;

        const currentMacs = payload.split('\n');
        const invalidSet = new Set(results.failedRaw);

        // Lọc bỏ các mã lỗi
        const validMacs = currentMacs.filter(line => {
            const trimmed = line.trim()
            if (!trimmed) return false;
            return !invalidSet.has(trimmed);
        });

        setPayload(validMacs.join('\n'));
        setResults(null);
        message.success('Đã xóa các mã lỗi khỏi danh sách.');
    };

    return (
        <Modal
            title={`Quét / Nhập nhiều mã ${scanMode === 'mac' ? 'MAC' : 'Serial'} `}
            open={visible}
            onCancel={onCancel}
            onOk={handleProcess}
            confirmLoading={loading}
            destroyOnClose
            footer={[
                <Button key="close" onClick={onCancel}>
                    Đóng
                </Button>,
                results && results.failed.length > 0 && (
                    <Button key="remove-invalid" danger onClick={handleRemoveInvalid}>
                        Xóa mã lỗi ({results.failed.length})
                    </Button>
                ),
                <Button key="submit" type="primary" loading={loading} onClick={handleProcess}>
                    Xử lý & Chọn
                </Button>
            ]}
        >
            <div className="w-full mt-2">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                    <Text type="secondary">Nhập danh sách mã {scanMode === 'mac' ? 'MAC' : 'Serial'}, mỗi mã 1 dòng.</Text>
                    <Radio.Group value={scanMode} onChange={e => setScanMode(e.target.value)} optionType="button" buttonStyle="solid">
                        <Radio.Button value="mac">Mã MAC</Radio.Button>
                        <Radio.Button value="serial">Số Serial</Radio.Button>
                    </Radio.Group>
                </div>

                <TextArea
                    className="w-full"
                    rows={8}
                    placeholder={scanMode === 'mac' ? "MAC-001\nMAC-002\nMAC-003..." : "SN-001\nSN-002\nSN-003..."}
                    value={payload}
                    onChange={(e) => {
                        const cleanVal = processScannerInput(e.target.value, scanMode);
                        const cleanTokens = cleanVal.split('\n').filter(Boolean);
                        const newValidCount = cleanTokens.length;
                        const oldTokens = payload.split('\n').filter(Boolean);
                        const oldValidCount = oldTokens.length;
                        if (newValidCount > oldValidCount) {
                            playScanSuccessSound();
                        }
                        setPayload(cleanVal);
                    }}
                    disabled={loading}
                />

                {results && results.failed.length > 0 && (
                    <Alert
                        message={`Kết quả: Chọn được ${results.success} mã.Có ${results.failed.length} mã lỗi: `}
                        description={
                            <div className="max-h-32 overflow-y-auto mt-2">
                                <ul className="list-disc pl-4">
                                    {results.failed.map((f, i) => <li key={i}>{f}</li>)}
                                </ul>
                            </div>
                        }
                        type="warning"
                        showIcon
                    />
                )}
            </div>
        </Modal>
    );
};
