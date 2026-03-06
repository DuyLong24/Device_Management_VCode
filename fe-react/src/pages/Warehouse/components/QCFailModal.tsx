import { useState, useRef, useEffect } from 'react';
import {
    Modal,
    Space,
    Button,
    Card,
    Input,
    Table,
    Tag,
    Alert,
    message,
    Typography,
    Radio,
} from 'antd';
import {
    CloseCircleOutlined,
    PlusOutlined,
    ScanOutlined,
    DeleteOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import type { QCPendingItem, ScannedMac, ValidationStatus } from '../../../types/qc.type';
import { extractValidScans } from '../../../utils/mac.util';
import { useScanMode } from '../../../hooks/useScanMode';

const { Text } = Typography;

interface QCFailModalProps {
    open: boolean;
    onCancel: () => void;
    onConfirm: (ids: string[], note: string) => void;
    dataSource: QCPendingItem[];
}

export default function QCFailModal({ open, onCancel, onConfirm, dataSource }: QCFailModalProps) {
    const { mode: scanMode, setMode: setScanMode } = useScanMode();
    const [macInput, setMacInput] = useState('');
    const [scannedFailList, setScannedFailList] = useState<ScannedMac[]>([]);
    const [failNote, setFailNote] = useState('');
    const macInputRef = useRef<any>(null);

    // Dọn rác khi đổi scanMode
    useEffect(() => {
        if (macInput) {
            import('../../../utils/mac.util').then(({ isValidScan }) => {
                if (!isValidScan(macInput, scanMode)) {
                    setMacInput('');
                }
            });
        }
    }, [scanMode]);

    const validateMac = (mac: string, currentList: ScannedMac[]): { isValid: boolean; message?: string; item?: QCPendingItem } => {
        if (!mac.trim()) return { isValid: false, message: 'MAC không được để trống' };
        if (currentList.find(s => s.mac === mac)) return { isValid: false, message: 'MAC đã có trong danh sách' };

        const item = dataSource.find(d => d.mac === mac);
        if (!item) return { isValid: false, message: 'MAC không tồn tại trong danh sách chờ QC' };

        return { isValid: true, item };
    };

    const handleAddFailMac = () => {
        const rawInput = macInput;
        let macsToProcess = extractValidScans(rawInput, scanMode);

        if (macsToProcess.length === 0) {
            const raw = rawInput.trim();
            if (raw) macsToProcess = [raw];
        }

        if (macsToProcess.length === 0) {
            message.warning('Vui lòng nhập MAC');
            return;
        }

        let addedCount = 0;
        const currentList = [...scannedFailList];

        macsToProcess.forEach(mac => {
            const validation = validateMac(mac, currentList);

            if (validation.isValid) {
                const newItem: ScannedMac = {
                    ...validation.item!,
                    validationStatus: 'valid',
                };
                currentList.push(newItem);
                addedCount++;
            } else {
                if (macsToProcess.length === 1) {
                    message.error(validation.message);
                }
            }
        });

        if (addedCount > 0) {
            setScannedFailList(currentList);
            message.success(`Đã thêm ${addedCount} thiết bị lỗi`);
        }

        setMacInput('');
        setTimeout(() => macInputRef.current?.focus(), 100);
    };

    const scannedColumns: TableColumnsType<ScannedMac> = [
        { title: 'Mã quét', dataIndex: 'mac', key: 'mac', width: 200 },
        { title: 'Mã thiết bị', dataIndex: 'deviceCode', key: 'deviceCode', width: 130 },
        {
            title: 'Trạng thái',
            dataIndex: 'validationStatus',
            key: 'validationStatus',
            align: 'center',
            render: (status: ValidationStatus) => (
                status === 'valid'
                    ? <Tag color="success" icon={<CheckCircleOutlined />}>Hợp lệ</Tag>
                    : <Tag color="error" icon={<CloseCircleOutlined />}>Không hợp lệ</Tag>
            ),
        },
        {
            title: '',
            key: 'action',
            width: 60,
            render: (_, record) => (
                <Button
                    type="link" danger size="small" icon={<DeleteOutlined />}
                    onClick={() => setScannedFailList(prev => prev.filter(s => s.mac !== record.mac))}
                />
            ),
        },
    ];

    const handleSubmit = () => {
        const validIds = scannedFailList
            .filter(s => s.validationStatus === 'valid')
            .map(s => s.id);

        if (validIds.length === 0) return;
        if (!failNote.trim()) {
            message.error('Vui lòng nhập nội dung lỗi');
            return;
        }

        Modal.confirm({
            title: 'Xác nhận Báo Lỗi',
            content: `Bạn có chắc chắn xác nhận ${validIds.length} thiết bị lỗi?`,
            okButtonProps: { danger: true },
            onOk: () => {
                onConfirm(validIds, failNote);
                setScannedFailList([]);
                setFailNote('');
            }
        });
    };

    return (
        <Modal
            title={<Space><CloseCircleOutlined className="text-red-500" /><span>Tiếp nhận thiết bị Không đạt</span></Space>}
            open={open}
            onCancel={onCancel}
            width={1000}
            footer={[
                <Button key="cancel" onClick={onCancel}>Hủy</Button>,
                <Button
                    key="submit"
                    type="primary"
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={handleSubmit}
                    disabled={scannedFailList.filter(s => s.validationStatus === 'valid').length === 0 || !failNote.trim()}
                >
                    Xác nhận Lỗi ({scannedFailList.filter(s => s.validationStatus === 'valid').length})
                </Button>,
            ]}
        >
            <Space direction="vertical" size={16} className="w-full">
                <Alert type="warning" message="thiết bị sẽ chuyển sang Kho Lỗi (Defect)." showIcon />

                <Card size="small"
                    title={
                        <div className="flex justify-between items-center w-full">
                            <span>Nhập/Quét {scanMode === 'mac' ? 'MAC' : 'Serial'}</span>
                            <Radio.Group value={scanMode} onChange={e => setScanMode(e.target.value)} size="small">
                                <Radio.Button value="mac">Mã MAC</Radio.Button>
                                <Radio.Button value="serial">Số Serial</Radio.Button>
                            </Radio.Group>
                        </div>
                    }
                >
                    <Space.Compact className="w-full">
                        <Input
                            ref={macInputRef}
                            placeholder={`Nhập ${scanMode === 'mac' ? 'MAC' : 'Serial'}...`}
                            value={macInput}
                            onChange={(e) => setMacInput(e.target.value)}
                            onPressEnter={handleAddFailMac}
                            prefix={<ScanOutlined />}
                            autoFocus
                        />
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddFailMac}>Thêm</Button>
                    </Space.Compact>
                </Card>

                <Table
                    columns={scannedColumns}
                    dataSource={scannedFailList}
                    pagination={false}
                    scroll={{ y: 300 }}
                    size="small"
                    rowKey="mac"
                />

                <Card size="small" title={<Text type="danger">Nội dung lỗi (Bắt buộc) *</Text>}>
                    <Input.TextArea
                        rows={4}
                        placeholder="Mô tả lỗi..."
                        value={failNote}
                        onChange={(e) => setFailNote(e.target.value)}
                    />
                </Card>
            </Space>
        </Modal>
    );
}
