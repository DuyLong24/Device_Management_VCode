import React, { useState, useEffect } from 'react';
import { Modal, Input, message, Typography, Space, Alert, Button } from 'antd';
import { deviceService } from '../../../services/device.service';
import { extractValidMacs } from '../../../utils/mac.util';

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

    const handleProcess = async () => {
        // Sử dụng utils để trích xuất MAC hợp lệ, bỏ qua rác
        const macs = extractValidMacs(payload);
        if (macs.length === 0) {
            message.warning('Vui lòng nhập ít nhất 1 mã MAC');
            return;
        }

        setLoading(true);
        setResults(null);
        const validIds: string[] = [];
        const validDevices: any[] = [];
        const failedMacs: string[] = [];
        const failedRaw: string[] = [];

        try {
            // Tìm kiếm song song
            const checkPromises = macs.map(async (mac) => {
                try {
                    // Tìm kiếm
                    const res = await deviceService.getAll({ search: mac, limit: 1 });
                    const device = res.results.find((d: any) => d.mac === mac);

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
            title="Quét/Nhập nhiều mã MAC"
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
            <Space direction="vertical" className="w-full">
                <Text type="secondary">Nhập danh sách mã MAC, mỗi mã một dòng.</Text>

                <TextArea
                    rows={8}
                    placeholder="MAC-001&#10;MAC-002&#10;MAC-003..."
                    value={payload}
                    onChange={(e) => setPayload(e.target.value)}
                    disabled={loading}
                />

                {results && results.failed.length > 0 && (
                    <Alert
                        message={`Kết quả: Chọn được ${results.success} mã. Có ${results.failed.length} mã lỗi:`}
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
            </Space>
        </Modal>
    );
};
