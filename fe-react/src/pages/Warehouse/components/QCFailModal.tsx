import { useState, useRef } from 'react';
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
} from 'antd';
import {
    CloseCircleOutlined,
    PlusOutlined,
    ScanOutlined,
    DeleteOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import type { QCPendingItem, ScannedSerial, ValidationStatus } from '../../../types/qc.type';

const { Text } = Typography;

interface QCFailModalProps {
    open: boolean;
    onCancel: () => void;
    onConfirm: (ids: string[], note: string) => void;
    dataSource: QCPendingItem[];
}

export default function QCFailModal({ open, onCancel, onConfirm, dataSource }: QCFailModalProps) {
    const [serialInput, setSerialInput] = useState('');
    const [scannedFailList, setScannedFailList] = useState<ScannedSerial[]>([]);
    const [failNote, setFailNote] = useState('');
    const serialInputRef = useRef<any>(null);

    const validateSerial = (serial: string, currentList: ScannedSerial[]): { isValid: boolean; message?: string; item?: QCPendingItem } => {
        if (!serial.trim()) return { isValid: false, message: 'Serial không được để trống' };
        if (currentList.find(s => s.serial === serial)) return { isValid: false, message: 'Serial đã có trong danh sách' };

        const item = dataSource.find(d => d.serial === serial);
        if (!item) return { isValid: false, message: 'Serial không tồn tại trong danh sách chờ QC' };

        return { isValid: true, item };
    };

    const handleAddFailSerial = () => {
        const serial = serialInput.trim();
        if (!serial) {
            message.warning('Vui lòng nhập serial');
            return;
        }

        const validation = validateSerial(serial, scannedFailList);

        if (!validation.isValid) {
            message.error(validation.message);
            setSerialInput('');
            setTimeout(() => serialInputRef.current?.focus(), 100);
            return;
        }

        setScannedFailList([
            ...scannedFailList,
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
                    onClick={() => setScannedFailList(prev => prev.filter(s => s.serial !== record.serial))}
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
            title={<Space><CloseCircleOutlined style={{ color: '#ff4d4f' }} /><span>Tiếp nhận sản phẩm Không đạt</span></Space>}
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
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Alert type="warning" message="Sản phẩm sẽ chuyển sang Kho Lỗi (Defect)." showIcon />

                <Card size="small" title="Nhập/Quét Serial">
                    <Space.Compact style={{ width: '100%' }}>
                        <Input
                            ref={serialInputRef}
                            placeholder="Nhập serial..."
                            value={serialInput}
                            onChange={(e) => setSerialInput(e.target.value)}
                            onPressEnter={handleAddFailSerial}
                            prefix={<ScanOutlined />}
                            autoFocus
                        />
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddFailSerial}>Thêm</Button>
                    </Space.Compact>
                </Card>

                <Table
                    columns={scannedColumns}
                    dataSource={scannedFailList}
                    pagination={false}
                    scroll={{ y: 300 }}
                    size="small"
                    rowKey="serial"
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
