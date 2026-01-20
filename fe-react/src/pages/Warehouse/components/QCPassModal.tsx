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
import type { QCPendingItem, ScannedSerial, ValidationStatus } from '../../../types/qc.type';

const { Text } = Typography;

interface QCPassModalProps {
    open: boolean;
    onCancel: () => void;
    onConfirm: (ids: string[]) => void;
    dataSource: QCPendingItem[];
}

export default function QCPassModal({ open, onCancel, onConfirm, dataSource }: QCPassModalProps) {
    const [serialInput, setSerialInput] = useState('');
    const [scannedPassList, setScannedPassList] = useState<ScannedSerial[]>([]);
    const serialInputRef = useRef<any>(null);

    // Validate serial
    const validateSerial = (serial: string, currentList: ScannedSerial[]): { isValid: boolean; message?: string; item?: QCPendingItem } => {
        if (!serial.trim()) return { isValid: false, message: 'Serial không được để trống' };
        if (currentList.find(s => s.serial === serial)) return { isValid: false, message: 'Serial đã có trong danh sách' };

        const item = dataSource.find(d => d.serial === serial);
        if (!item) return { isValid: false, message: 'Serial không tồn tại trong danh sách chờ QC' };

        return { isValid: true, item };
    };

    const handleAddPassSerial = () => {
        const serial = serialInput.trim();
        if (!serial) {
            message.warning('Vui lòng nhập serial');
            return;
        }

        const validation = validateSerial(serial, scannedPassList);

        if (!validation.isValid) {
            message.error(validation.message);
            setSerialInput('');
            setTimeout(() => serialInputRef.current?.focus(), 100);
            return;
        }

        setScannedPassList([
            ...scannedPassList,
            {
                ...validation.item!,
                validationStatus: 'valid',
            } as ScannedSerial,
        ]);

        setSerialInput('');
        message.success(`Thêm serial ${serial} thành công`);
        setTimeout(() => serialInputRef.current?.focus(), 100);
    };

    const scannedColumns: TableColumnsType<ScannedSerial> = [
        { title: 'Serial', dataIndex: 'serial', key: 'serial', width: 200 },
        { title: 'Mã SP', dataIndex: 'productCode', key: 'productCode', width: 130 },
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
                    onClick={() => setScannedPassList(prev => prev.filter(s => s.serial !== record.serial))}
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
            title={<Space><CheckCircleOutlined style={{ color: '#52c41a' }} /><span>Tiếp nhận sản phẩm đạt QC</span></Space>}
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
                <Alert type="info" message="Quét serial để thêm vào danh sách QC Đạt." showIcon />

                <Card size="small" title="Nhập/Quét Serial">
                    <Space.Compact className="w-full">
                        <Input
                            ref={serialInputRef}
                            placeholder="Nhập serial..."
                            value={serialInput}
                            onChange={(e) => setSerialInput(e.target.value)}
                            onPressEnter={handleAddPassSerial}
                            prefix={<ScanOutlined />}
                            autoFocus
                        />
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPassSerial}>Thêm</Button>
                    </Space.Compact>
                </Card>

                <Table
                    columns={scannedColumns}
                    dataSource={scannedPassList}
                    pagination={false}
                    scroll={{ y: 300 }}
                    size="small"
                    rowKey="serial"
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
