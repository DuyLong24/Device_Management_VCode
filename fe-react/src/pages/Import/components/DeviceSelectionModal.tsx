import React, { useState, useEffect, useRef } from 'react';
import { Modal, Tabs, Input, Tooltip, message, Radio } from 'antd';
import { FileTextOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { isValidScan, processScannerInput } from '../../../utils/mac.util';
import { playScanSuccessSound } from '../../../utils/sound.util';
import { removeDuplicatesWithToast } from '../../../utils/array.util';

const { TabPane } = Tabs;
const { TextArea } = Input;

interface DeviceSelectionModalProps {
    open: boolean;
    onCancel: () => void;
    onSave: (details: { iden?: string; mac: string; serial: string }[]) => void;
    initialDetails: { iden?: string; mac: string; serial: string }[];
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
    const [inputText, setInputText] = useState<string>('');
    const [identityMode, setIdentityMode] = useState<'mac' | 'serial'>('mac');

    const inputRef = useRef<any>(null);

    useEffect(() => {
        if (open) {
            const initialIds = initialDetails.map(d => d.iden || d.mac || d.serial || '').filter(Boolean);
            setInputText(initialIds.join('\n'));
            // Try to infer identityMode if it's already serial-heavy
            if (initialDetails.length > 0 && initialDetails[0].serial && !initialDetails[0].mac) {
                setIdentityMode('serial');
            } else {
                setIdentityMode('mac');
            }
        }
    }, [open, initialDetails]);

    const handleSave = () => {
        const rawLines = inputText.split('\n');

        const details: { iden: string, mac: string, serial: string }[] = [];

        for (const raw of rawLines) {
            const clean = (raw || '').trim();
            if (clean && isValidScan(clean, identityMode)) {
                const isMac = identityMode === 'mac';
                details.push({
                    iden: clean,
                    mac: isMac ? clean : '',
                    serial: !isMac ? clean : ''
                });
            }
        }

        const idenList = details.map(d => d.iden);
        removeDuplicatesWithToast(idenList, 'mã Định Danh');

        const cleanDetails: typeof details = [];
        const usedIdens = new Set<string>();

        details.forEach(d => {
            if (!usedIdens.has(d.iden)) {
                usedIdens.add(d.iden);
                cleanDetails.push(d);
            }
        });

        if (cleanDetails.length === 0 && inputText.trim() !== '') {
            message.warning('Dữ liệu nhập vào chưa hợp lệ định dạng. Vui lòng kiểm tra lại!');
            return;
        }

        onSave(cleanDetails);
    };

    const validCount = inputText.split('\n').filter(s => isValidScan(s.trim(), identityMode)).length;

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
            width={600}
            okText="Cập nhật"
            cancelText="Hủy"
        >
            <div className="mb-4 bg-blue-50 p-3 rounded-md border border-blue-100 flex items-center justify-between">
                <div>
                    <span className="font-semibold text-blue-800">Định danh gốc của thiết bị:</span>
                </div>
                <Radio.Group
                    value={identityMode}
                    onChange={e => setIdentityMode(e.target.value)}
                    buttonStyle="solid"
                >
                    <Radio.Button value="mac">Dùng MAC</Radio.Button>
                    <Radio.Button value="serial">Dùng Serial</Radio.Button>
                </Radio.Group>
            </div>

            <Tabs defaultActiveKey="manual">
                <TabPane tab={<span><FileTextOutlined /> Nhập thủ công</span>} key="manual">
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-gray-700">Mã Định Danh ({identityMode.toUpperCase()})</span>
                                <span className="text-xs text-gray-500">Hợp lệ: <span className="text-blue-600 font-bold">{validCount}</span></span>
                            </div>
                            <TextArea
                                ref={inputRef}
                                rows={14}
                                placeholder={`Nhập danh sách mã ${identityMode.toUpperCase()}...\nMỗi mã một dòng`}
                                value={inputText}
                                onChange={(e) => {
                                    const cleanVal = processScannerInput(e.target.value, identityMode);
                                    const newValidCount = cleanVal.split('\n').filter(Boolean).length;
                                    const oldValidCount = inputText.split('\n').filter(Boolean).length;
                                    if (newValidCount > oldValidCount) {
                                        playScanSuccessSound();
                                    }
                                    setInputText(cleanVal);
                                }}
                                className="font-mono text-sm tracking-wide"
                                style={{ whiteSpace: 'pre', overflowWrap: 'normal', overflowX: 'auto' }}
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-end border-t border-gray-100 pt-3">
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
