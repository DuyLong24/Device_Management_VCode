import React, { useState, useEffect, useRef } from 'react';
import { Modal, Tabs, Input, Tooltip, Checkbox, message } from 'antd';
import { FileTextOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { isValidScan } from '../../../utils/mac.util';

const { TabPane } = Tabs;
const { TextArea } = Input;

interface DeviceSelectionModalProps {
    open: boolean;
    onCancel: () => void;
    onSave: (details: { mac: string; serial: string }[]) => void;
    initialDetails: { mac: string; serial: string }[];
    deviceKey: string | null;
    requiredQuantity?: number;
    deviceName?: string;
}

export const DeviceSelectionModal: React.FC<DeviceSelectionModalProps> = ({
    open,
    onCancel,
    onSave,
    initialDetails,
    requiredQuantity,
}) => {
    const [macText, setMacText] = useState<string>('');
    const [serialText, setSerialText] = useState<string>('');
    const [checkQuantityMatch, setCheckQuantityMatch] = useState<boolean>(false);

    const macRef = useRef<any>(null);
    const serialRef = useRef<any>(null);

    useEffect(() => {
        if (open) {
            setMacText(initialDetails.map(d => d.mac || '').join('\n'));
            setSerialText(initialDetails.map(d => d.serial || '').join('\n'));
            setCheckQuantityMatch(false); // Unchecked by default
        }
    }, [open, initialDetails]);

    const handleMacScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (serialRef.current && serialRef.current.resizableTextArea?.textArea) {
            serialRef.current.resizableTextArea.textArea.scrollTop = e.currentTarget.scrollTop;
        }
    };

    const handleSerialScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (macRef.current && macRef.current.resizableTextArea?.textArea) {
            macRef.current.resizableTextArea.textArea.scrollTop = e.currentTarget.scrollTop;
        }
    };

    const handleSave = () => {
        const rawMacs = macText.split('\n');
        const rawSerials = serialText.split('\n');

        const maxLen = Math.max(rawMacs.length, rawSerials.length);
        const details: { mac: string, serial: string }[] = [];

        let validMacCount = 0;
        let validSerialCount = 0;

        for (let i = 0; i < maxLen; i++) {
            const rawM = (rawMacs[i] || '').trim();
            const rawS = (rawSerials[i] || '').trim();

            let m = '';
            let s = '';

            if (rawM && isValidScan(rawM, 'mac')) {
                m = rawM;
                validMacCount++;
            }
            if (rawS && isValidScan(rawS, 'serial')) {
                s = rawS;
                validSerialCount++;
            }

            // Only add if at least one is valid, or keep empty rows to maintain index
            if (m || s) {
                details.push({ mac: m, serial: s });
            } else if (rawM || rawS) {
                // Garbage data, clear it but keep empty row
                details.push({ mac: '', serial: '' });
            } else {
                // Empty lines
                details.push({ mac: '', serial: '' });
            }
        }

        // Trim trailing empty rows so we don't return garbage array holes
        while (details.length > 0 && !details[details.length - 1].mac && !details[details.length - 1].serial) {
            details.pop();
        }

        if (checkQuantityMatch && validMacCount !== validSerialCount) {
            message.error(`Số lượng MAC (${validMacCount}) và Serial (${validSerialCount}) không khớp. Vui lòng kiểm tra lại dữ liệu copy!`);
            return;
        }

        onSave(details);
    };

    const validMacCount = macText.split('\n').filter(s => isValidScan(s.trim(), 'mac')).length;
    const validSerialCount = serialText.split('\n').filter(s => isValidScan(s.trim(), 'serial')).length;

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <span>Nhập danh sách mã</span>
                    <Tooltip title="Bạn có thể nhập thủ công (mỗi hàng tương ứng 1 thiết bị)">
                        <InfoCircleOutlined className="text-gray-400 cursor-pointer text-sm font-normal" />
                    </Tooltip>
                </div>
            }
            open={open}
            onOk={handleSave}
            onCancel={onCancel}
            width={800}
            okText="Cập nhật"
            cancelText="Hủy"
        >
            <Tabs defaultActiveKey="manual">
                <TabPane tab={<span><FileTextOutlined /> Nhập thủ công</span>} key="manual">

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-gray-700">Mã MAC</span>
                                <span className="text-xs text-gray-500">Hợp lệ: <span className="text-blue-600 font-bold">{validMacCount}</span></span>
                            </div>
                            <TextArea
                                ref={macRef}
                                onScroll={handleMacScroll}
                                rows={14}
                                placeholder="MAC-001&#10;MAC-002&#10;MAC-003..."
                                value={macText}
                                onChange={(e) => setMacText(e.target.value)}
                                className="font-mono text-sm tracking-wide"
                                style={{ whiteSpace: 'pre', overflowWrap: 'normal', overflowX: 'auto' }}
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-gray-700">Số Serial</span>
                                <span className="text-xs text-gray-500">Hợp lệ: <span className="text-blue-600 font-bold">{validSerialCount}</span></span>
                            </div>
                            <TextArea
                                ref={serialRef}
                                onScroll={handleSerialScroll}
                                rows={14}
                                placeholder="SN-001&#10;SN-002&#10;SN-003..."
                                value={serialText}
                                onChange={(e) => setSerialText(e.target.value)}
                                className="font-mono text-sm tracking-wide"
                                style={{ whiteSpace: 'pre', overflowWrap: 'normal', overflowX: 'auto' }}
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                        <Checkbox
                            checked={checkQuantityMatch}
                            onChange={(e) => setCheckQuantityMatch(e.target.checked)}
                        >
                            <span className="text-gray-600">Kiểm tra số lượng MAC và Serial bằng nhau</span>
                        </Checkbox>
                        {requiredQuantity !== undefined && (
                            <div className="text-gray-500 text-sm">
                                Yêu cầu: <span className="font-semibold text-black">{requiredQuantity}</span>
                            </div>
                        )}
                    </div>

                </TabPane>
            </Tabs>
        </Modal>
    );
};
