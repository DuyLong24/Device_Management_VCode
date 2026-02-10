import { useState, useRef } from 'react';
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
} from 'antd';
import {
    CheckCircleOutlined,
    PlusOutlined,
    ScanOutlined,
    DeleteOutlined,
    CloseCircleOutlined
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import type { QCPendingItem, ScannedMac, ValidationStatus } from '../../../types/qc.type';
import { extractValidMacs } from '../../../utils/mac.util';

const { Text } = Typography;

interface QCPassModalProps {
    open: boolean;
    onCancel: () => void;
    onConfirm: (ids: string[]) => void;
    dataSource: QCPendingItem[];
}

export default function QCPassModal({ open, onCancel, onConfirm, dataSource }: QCPassModalProps) {
    const [macInput, setMacInput] = useState('');
    const [scannedPassList, setScannedPassList] = useState<ScannedMac[]>([]);
    const macInputRef = useRef<any>(null);

    // Validate mac
    const validateMac = (mac: string, currentList: ScannedMac[]): { isValid: boolean; message?: string; item?: QCPendingItem } => {
        if (!mac.trim()) return { isValid: false, message: 'MAC không được để trống' };
        if (currentList.find(s => s.mac === mac)) return { isValid: false, message: 'MAC đã có trong danh sách' };

        const item = dataSource.find(d => d.mac === mac);
        if (!item) return { isValid: false, message: 'MAC không tồn tại trong danh sách chờ QC' };

        return { isValid: true, item };
    };

    const handleAddPassMac = () => {
        const rawInput = macInput;
        let macsToProcess = extractValidMacs(rawInput);
        if (macsToProcess.length === 0) {
            const raw = rawInput.trim();
            if (raw) macsToProcess = [raw];
        }

        if (macsToProcess.length === 0) {
            message.warning('Vui lòng nhập MAC');
            return;
        }

        let addedCount = 0;
        const currentList = [...scannedPassList];

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
            setScannedPassList(currentList);
            message.success(`Đã thêm ${addedCount} thiết bị`);
        }

        setMacInput('');
        setTimeout(() => macInputRef.current?.focus(), 100);
    };

    const scannedColumns: TableColumnsType<ScannedMac> = [
        { title: 'MAC', dataIndex: 'mac', key: 'mac', width: 200 },
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
                    onClick={() => setScannedPassList(prev => prev.filter(s => s.mac !== record.mac))}
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
                <Alert type="info" message="Quét MAC để thêm vào danh sách QC Đạt." showIcon />

                <Card size="small" title="Nhập/Quét MAC">
                    <Space.Compact className="w-full">
                        <Input
                            ref={macInputRef}
                            placeholder="Nhập MAC"
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
