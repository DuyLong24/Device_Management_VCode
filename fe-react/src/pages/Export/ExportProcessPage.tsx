import { useState, useEffect, useRef } from 'react';
import { Card, Descriptions, Button, Table, Typography, Input, message, Tag, Space, Modal } from 'antd';
import {
    ArrowLeftOutlined,
    ScanOutlined,
    CheckCircleOutlined,
    DeleteOutlined,
    SaveOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { exportService } from '../../services/export.service';
import type { DeviceExport } from '../../types/export.type';
import { useScanSound } from '../../hooks/useScanSound';

const { Text } = Typography;
const { confirm } = Modal;

interface ScannedItem {
    serial: string;
    key: string;
    error?: boolean;
}

export default function ExportProcessPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { playSuccess, playError } = useScanSound();

    const [exportInfo, setExportInfo] = useState<DeviceExport | null>(null);
    const [loading, setLoading] = useState(false);
    const [scannedInput, setScannedInput] = useState('');
    const [pendingItems, setPendingItems] = useState<ScannedItem[]>([]);

    const inputRef = useRef<any>(null);

    const fetchDetail = async () => {
        if (!id) return;

        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        if (!isValidObjectId) {
            if (id === 'check' || id === 'create') {
                navigate('/export/list', { replace: true });
            } else {
                message.error('Mã phiếu không hợp lệ');
            }
            return;
        }

        setLoading(true);
        try {
            const res = await exportService.getDetail(id);
            setExportInfo(res.data);
        } catch (error) {
            message.error('Không tải được thông tin phiếu xuất');
            console.error('Fetch detail failed', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [id]);

    const handleScan = () => {
        const code = scannedInput.trim();
        if (!code) return;

        if (pendingItems.some(i => i.serial === code)) {
            playError();
            message.warning(`Serial ${code} đã ở trong danh sách chờ lưu`);
            setScannedInput('');
            return;
        }

        if (exportInfo?.items.some(i => i.serial === code)) {
            playError();
            message.warning(`Serial ${code} ĐÃ ĐƯỢC thêm vào phiếu trước đó`);
            setScannedInput('');
            return;
        }

        setPendingItems(prev => [{ serial: code, key: `${code}-${Date.now()}` }, ...prev]);
        playSuccess();
        setScannedInput('');
        message.success(`Đã quét: ${code}`);
    };

    const handleSaveItems = async () => {
        if (pendingItems.length === 0 || !id) return;

        try {
            await exportService.addItems(id, pendingItems.map(i => i.serial));
            message.success(`Đã thêm ${pendingItems.length} thiết bị vào phiếu`);
            setPendingItems([]);
            fetchDetail();
            playSuccess();
        } catch (error: any) {
            console.error(error);
            playError();

            const msg = error.response?.data?.message || 'Lỗi khi thêm thiết bị';
            message.error(msg);

            if (typeof msg === 'string') {
                const match = msg.match(/:\s*([\w\s,]+)$/);
                if (match && match[1]) {
                    const invalidSerials = match[1].split(',').map(s => s.trim());
                    setPendingItems(prev => prev.map(item => ({
                        ...item,
                        error: invalidSerials.includes(item.serial)
                    })));
                }
            }
        }
    };

    const handleRemovePending = (serial: string) => {
        setPendingItems(prev => prev.filter(i => i.serial !== serial));
    };

    const handleConfirmExport = () => {
        confirm({
            title: 'Xác nhận Xuất kho?',
            icon: <ExclamationCircleOutlined />,
            content: 'Thao tác này sẽ chuyển trạng thái các thiết bị sang ĐÃ XUẤT và không thể hoàn tác.',
            onOk: async () => {
                try {
                    if (!id) return;
                    await exportService.confirm(id);
                    message.success('Xuất kho thành công!');
                    fetchDetail();
                } catch (error) {
                    message.error('Lỗi khi xác nhận xuất kho');
                }
            }
        });
    };

    const columns = [
        { title: 'STT', key: 'index', render: (_: any, __: any, index: number) => index + 1 },
        {
            title: 'Serial',
            dataIndex: 'serial',
            key: 'serial',
            render: (t: string) => <Text strong className="text-blue-600 font-mono">{t}</Text>
        },
        { title: 'Model', dataIndex: 'deviceModel', key: 'deviceModel' },
        { title: 'Sản phẩm', dataIndex: 'productCode', key: 'productCode' },
    ];

    const pendingColumns = [
        {
            title: 'Serial đang chờ lưu',
            dataIndex: 'serial',
            key: 'serial',
            render: (t: string, r: ScannedItem) => (
                <Space>
                    <Text strong className={r.error ? "text-red-600 underline" : "text-orange-600 font-mono"}>{t}</Text>
                    {r.error && <Tag color="error">Lỗi</Tag>}
                </Space>
            )
        },
        {
            title: '',
            key: 'action',
            render: (_: any, r: ScannedItem) => (
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemovePending(r.serial)} />
            )
        }
    ];

    if (!exportInfo) return <div>Loading...</div>;

    const isDraft = exportInfo.status === 'DRAFT';

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-4">
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/export/list')}
                >
                    Danh sách Xuất kho
                </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* LEFT: Info & Scan */}
                <div className="w-full md:w-1/3">
                    <Card title="Thông tin phiếu" className="mb-4 shadow-sm" loading={loading}>
                        <Descriptions column={1} size="small" bordered>
                            <Descriptions.Item label="Mã phiếu">{exportInfo.code}</Descriptions.Item>
                            <Descriptions.Item label="Tên phiếu">{exportInfo.exportName}</Descriptions.Item>
                            <Descriptions.Item label="Loại">{exportInfo.type}</Descriptions.Item>
                            <Descriptions.Item label="Người nhận">{exportInfo.receiver}</Descriptions.Item>
                            <Descriptions.Item label="Khách hàng">{exportInfo.customer || '---'}</Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">
                                <Tag color={isDraft ? 'processing' : 'success'}>{exportInfo.status}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngày tạo">{dayjs(exportInfo.createdAt).format('DD/MM/YYYY')}</Descriptions.Item>
                        </Descriptions>

                        {isDraft && exportInfo.items.length > 0 && (
                            <div className="mt-4">
                                <Button
                                    type="primary"
                                    block
                                    size="large"
                                    className="bg-green-600 hover:bg-green-700"
                                    icon={<CheckCircleOutlined />}
                                    onClick={handleConfirmExport}
                                    disabled={pendingItems.length > 0}
                                >
                                    XÁC NHẬN XUẤT KHO
                                </Button>
                                {pendingItems.length > 0 && <div className="text-red-500 text-xs mt-1 text-center">Vui lòng lưu danh sách chờ trước khi xác nhận</div>}
                            </div>
                        )}
                    </Card>

                    {isDraft && (
                        <Card title="Quét thiết bị" className="shadow-sm border-blue-200 border">
                            <Space.Compact style={{ width: '100%' }} className="mb-4">
                                <Input
                                    ref={inputRef}
                                    placeholder="Quét serial tại đây..."
                                    value={scannedInput}
                                    onChange={e => setScannedInput(e.target.value)}
                                    onPressEnter={handleScan}
                                    autoFocus
                                    prefix={<ScanOutlined />}
                                />
                                <Button type="primary" onClick={handleScan}>Quét</Button>
                            </Space.Compact>

                            {pendingItems.length > 0 && (
                                <div className="bg-orange-50 p-2 rounded border border-orange-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <Text strong>Đang chờ lưu ({pendingItems.length})</Text>
                                        <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleSaveItems}>Lưu</Button>
                                    </div>
                                    <Table
                                        dataSource={pendingItems}
                                        columns={pendingColumns}
                                        size="small"
                                        pagination={{ pageSize: 5 }}
                                        showHeader={false}
                                        rowKey="key"
                                    />
                                </div>
                            )}
                        </Card>
                    )}
                </div>

                {/* RIGHT: Items List */}
                <div className="w-full md:w-2/3">
                    <Card
                        title={`Danh sách thiết bị (${exportInfo.items.length})`}
                        className="shadow-sm h-full"
                        extra={!isDraft && <Tag color="success">ĐÃ XUẤT KHO</Tag>}
                    >
                        <Table
                            dataSource={exportInfo.items}
                            columns={columns}
                            rowKey="serial"
                            size="small"
                        />
                    </Card>
                </div>
            </div>
        </div>
    );
}
