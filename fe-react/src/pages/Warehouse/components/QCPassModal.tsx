import { useState, useRef, useEffect } from 'react';
import {
    Modal,
    Space,
    Button,
    Card,
    Input,
    Table,
    Tag,
    Descriptions,
    Row,
    Col,
    Alert,
    message,
    Typography,
    Radio,
} from 'antd';
import {
    CheckCircleOutlined,
    PlusOutlined,
    ScanOutlined,
    DeleteOutlined,
    CloseCircleOutlined
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import type { QCPendingItem, ScannedIdentity, ValidationStatus } from '../../../types/qc.type';
import { extractValidScans } from '../../../utils/mac.util';
import { useScanMode } from '../../../hooks/useScanMode';
import { playScanSuccessSound } from '../../../utils/sound.util';
import { removeDuplicatesWithToast } from '../../../utils/array.util';

const { Text } = Typography;

interface QCPassModalProps {
    open: boolean;
    onCancel: () => void;
    onConfirm: (ids: string[]) => void;
    dataSource: QCPendingItem[];
}

export default function QCPassModal({ open, onCancel, onConfirm, dataSource }: QCPassModalProps) {
    const { mode: scanMode, setMode: setScanMode } = useScanMode();
    const [macInput, setMacInput] = useState('');
    const [scannedPassList, setScannedPassList] = useState<ScannedIdentity[]>([]);
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

    // Validate mac
    const validateMac = (mac: string, currentList: ScannedIdentity[]): { isValid: boolean; message?: string; item?: QCPendingItem } => {
        if (!mac.trim()) return { isValid: false, message: 'MAC không được để trống' };
        if (currentList.find(s => s.mac === mac)) return { isValid: false, message: 'MAC đã có trong danh sách' };

        const item = dataSource.find(d => d.mac === mac);
        if (!item) return { isValid: false, message: 'Mã Định Danh không tồn tại trong danh sách chờ QC' };

        return { isValid: true, item };
    };

    const handleAddPassMac = () => {
        const rawInput = macInput;
        let macsToProcess = extractValidScans(rawInput, scanMode);
        if (macsToProcess.length === 0) {
            const raw = rawInput.trim();
            if (raw) macsToProcess = [raw];
        }

        const cleanMacs = removeDuplicatesWithToast(macsToProcess, scanMode === 'mac' ? 'mã MAC' : 'số Serial');

        if (cleanMacs.length === 0) {
            message.warning(`Vui lòng nhập ${scanMode === 'mac' ? 'MAC' : 'Serial'}`);
            return;
        }

        let addedCount = 0;
        const currentList = [...scannedPassList];

        cleanMacs.forEach(mac => {
            const validation = validateMac(mac, currentList);

            if (validation.isValid) {
                const newItem: ScannedIdentity = {
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
            setScannedPassList(currentList);
            message.success(`Đã thêm ${addedCount} thiết bị`);
            playScanSuccessSound();
        }

        setMacInput('');
        setTimeout(() => macInputRef.current?.focus(), 100);
    };

    const scannedColumns: TableColumnsType<ScannedIdentity> = [
        { title: 'Mã Định Danh', dataIndex: 'iden', key: 'iden', width: 200 },
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
                    onClick={() => setScannedPassList(prev => prev.filter(s => s.iden !== record.iden))}
                />
            ),
        },
    ];

    const handleSubmit = () => {
        const validIds = scannedPassList
            .filter(s => s.validationStatus === 'valid')
            .map(s => s.id);

        if (validIds.length === 0) return;

        Modal.confirm({
            title: 'Xác nhận QC Đạt',
            content: `Bạn có chắc chắn xác nhận ${validIds.length} thiết bị đạt chất lượng?`,
            onOk: () => {
                onConfirm(validIds);
                setScannedPassList([]);
            }
        });
    };

    return (
        <Modal
            title={<Space><CheckCircleOutlined className="text-green-500" /><span>Tiếp nhận thiết bị đạt QC</span></Space>}
            open={open}
            onCancel={onCancel}
            width={1000}
            footer={[
                <Button key="cancel" onClick={onCancel}>Hủy</Button>,
                <Button
                    key="submit"
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={handleSubmit}
                    disabled={scannedPassList.filter(s => s.validationStatus === 'valid').length === 0}
                >
                    Xác nhận ({scannedPassList.filter(s => s.validationStatus === 'valid').length})
                </Button>,
            ]}
        >
            <Space direction="vertical" size={16} className="w-full">
                <Alert type="info" message={`Quét ${scanMode === 'mac' ? 'MAC' : 'Serial'} để thêm vào danh sách QC Đạt.`} showIcon />

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
                            placeholder={`Nhập ${scanMode === 'mac' ? 'MAC' : 'Serial'}`}
                            value={macInput}
                            onChange={(e) => setMacInput(e.target.value)}
                            onPressEnter={handleAddPassMac}
                            prefix={<ScanOutlined />}
                            autoFocus
                        />
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPassMac}>Thêm</Button>
                    </Space.Compact>
                </Card>

                <Table
                    columns={scannedColumns}
                    dataSource={scannedPassList}
                    pagination={false}
                    scroll={{ y: 300 }}
                    size="small"
                    rowKey="mac"
                />

                {scannedPassList.length > 0 && (
                    <Row gutter={16}>
                        <Col span={12}>
                            <Card size="small">
                                <Descriptions column={1} size="small">
                                    <Descriptions.Item label="Tổng số lượng">{scannedPassList.length}</Descriptions.Item>
                                    <Descriptions.Item label="Hợp lệ">
                                        <Text type="success">{scannedPassList.filter(s => s.validationStatus === 'valid').length}</Text>
                                    </Descriptions.Item>
                                </Descriptions>
                            </Card>
                        </Col>
                    </Row>
                )}
            </Space>
        </Modal>
    );
}
