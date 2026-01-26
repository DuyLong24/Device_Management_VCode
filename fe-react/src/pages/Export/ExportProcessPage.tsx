import { useState, useEffect } from 'react';
import {
    Button, Typography, message, Tag, Space, Modal, Card, Descriptions, Row, Col, Statistic, Divider, Progress, Alert, Input, Upload, Table, Popconfirm
} from 'antd';
import {
    ArrowLeftOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    FileExcelOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';

import { exportService } from '../../services/export.service';
import { exportSessionService } from '../../services/export-session.service';
import { getExportStatusTag } from '../../utils/export-status.util';
import type { DeviceExport } from '../../types/export.type';
import { useScanSound } from '../../hooks/useScanSound';

const { Text, Title } = Typography;
// const { Dragger } = Upload;

export default function ExportProcessPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('sessionId');
    const { playSuccess, playError } = useScanSound();
    const [messageApi, contextHolder] = message.useMessage();
    const [modal, modalContextHolder] = Modal.useModal();

    // Data State
    const [exportInfo, setExportInfo] = useState<DeviceExport | null>(null);
    const [sessionData, setSessionData] = useState<any>(null);
    const [sessionItems, setSessionItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form/Input State
    const [scannedInput, setScannedInput] = useState('');
    const [manualMacs, setManualMacs] = useState('');
    const [fileList, setFileList] = useState<UploadFile[]>([]);

    // Logic: Fetch Data
    const fetchDetail = async () => {
        let currentExportId = id;

        if (!currentExportId && !sessionId) {
            messageApi.warning('Vui lòng chọn phiếu xuất để quét');
            navigate('/export/list');
            return;
        }

        try {
            if (sessionId) {
                const sessionRes = await exportSessionService.getDetail(sessionId);
                if (sessionRes.data) {
                    setSessionData(sessionRes.data);
                    setSessionItems(sessionRes.data.items || []);
                    if (!currentExportId) {
                        currentExportId = sessionRes.data.exportId;
                    }
                }
            }

            // 2. Get Export Detail
            if (currentExportId) {
                const res = await exportService.getDetail(currentExportId);
                setExportInfo(res.data);
            }
        } catch (error) {
            messageApi.error('Lỗi tải dữ liệu');
            // navigate('/export/list');
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [id, sessionId]);

    // Handle Scan
    const handleScanMac = async () => {
        if (!scannedInput.trim() || !sessionId) return;
        const code = scannedInput.trim();

        // Local Duplicate Check
        if (sessionItems.some((i: any) => i.serial === code)) {
            playError();
            messageApi.warning(`MAC ${code} đã được quét trong phiên này`);
            setScannedInput('');
            return;
        }

        setLoading(true);
        try {
            const res = await exportSessionService.scanSerial(sessionId, code);
            playSuccess();
            messageApi.success(`Đã quét: ${code}`);
            setScannedInput('');

            // Refresh items
            setSessionItems(prev => [...prev, {
                serial: code,
                deviceCode: res.data?.items?.find((i: any) => i.serial === code)?.deviceCode || 'N/A',
                scannedAt: new Date().toISOString()
            }]);

            const newCount = (sessionData?.serialChecked || 0) + 1;
            setSessionData({ ...sessionData, serialChecked: newCount });

        } catch (error: any) {
            playError();
            messageApi.error(error.response?.data?.message || 'Lỗi khi quét');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveSerial = async (serial: string) => {
        if (!sessionId) return;
        try {
            await exportSessionService.removeSerial(sessionId, serial);
            messageApi.success(`Đã xóa serial ${serial}`);

            // Remove 
            setSessionItems(prev => prev.filter(item => item.serial !== serial));

            // Update count
            const newCount = Math.max(0, (sessionData?.serialChecked || 0) - 1);
            setSessionData({ ...sessionData, serialChecked: newCount });

        } catch (error: any) {
            messageApi.error(error.response?.data?.message || 'Lỗi khi xóa serial');
        }
    };

    // Import (Text Area)
    const handleManualImport = async () => {
        if (!manualMacs.trim() || !sessionId) return;
        const codes = manualMacs.split('\n').map(s => s.trim()).filter(Boolean);
        if (codes.length === 0) return;

        await processBulkScan(codes);
        setManualMacs('');
    };

    // const handleFileImport = (file: File) => {
    //     setFileList([file as unknown as UploadFile]);
    //     messageApi.info('Tính năng import Excel đang được cập nhật');
    //     return false;
    // };

    const processBulkScan = async (codes: string[]) => {
        setLoading(true);
        try {
            const res = await exportSessionService.scanBulk(sessionId!, codes);
            messageApi.success(`Đã xử lý ${codes.length} mã.`);
            if (res.data?.errors?.length) {
                // messageApi.warning(`Có ${res.data.errors.length} mã lỗi`);
                const errorList = res.data.errors.map((e: any) =>
                    `<li><b>${e.serial}</b>: ${e.error}</li>`
                ).join('');

                Modal.warning({
                    title: 'Kết quả quét có lỗi',
                    content: (
                        <div>
                            <p>Các mã sau không được chấp nhận:</p>
                            <ul dangerouslySetInnerHTML={{ __html: errorList }} className="list-disc pl-4 text-red-500" />
                        </div>
                    ),
                    width: 500
                });
            }

            fetchDetail();
        } catch (error) {
            messageApi.error('Lỗi import danh sách');
        } finally {
            setLoading(false);
        }
    }

    const handleCompleteExport = () => {
        modal.confirm({
            title: 'Xác nhận hoàn tất Phiên Xuất kho?',
            icon: null, // Custom content handles icons
            width: 600,
            content: (
                <div>
                    {matchCount >= totalRequired && (
                        <Alert
                            message="Lưu ý quan trọng"
                            description="Bạn đã quét đủ số lượng. Sau khi hoàn tất phiên này, Phiếu xuất kho sẽ tự động chuyển sang trạng thái ĐÃ HOÀN TẤT và không thể quét thêm."
                            type="warning"
                            showIcon
                            className="mb-4"
                        />
                    )}

                    {missingCount > 0 ? (
                        <Alert
                            message="Cảnh báo: Chưa đủ số lượng"
                            description={
                                <ul className="mb-0 list-disc pl-5">
                                    <li>Tổng yêu cầu: <b>{totalRequired}</b></li>
                                    <li>Đã quét: <b>{matchCount}</b></li>
                                    <li>Còn thiếu: <b className="text-red-500">{missingCount}</b></li>
                                </ul>
                            }
                            type="warning"
                            showIcon
                            className="mb-3"
                        />
                    ) : matchCount > totalRequired ? (
                        <Alert
                            message="Lỗi quy trình: Quét thừa thiết bị"
                            description={`Bạn đã quét ${matchCount}/${totalRequired}. Vui lòng xóa bớt.`}
                            type="error"
                            showIcon
                            className="mb-3"
                        />
                    ) : (
                        <Alert
                            message="Xác nhận hoàn tất xuất kho"
                            description={
                                <ul className="mb-0 list-disc pl-5">
                                    <li>Tổng yêu cầu: <b>{totalRequired}</b></li>
                                    <li>Đã quét: <b className="text-green-600">{matchCount}</b></li>
                                    <li>Hệ thống sẽ cập nhật trạng thái phiếu xuất và trừ tồn kho.</li>
                                </ul>
                            }
                            type="success"
                            showIcon
                            className="mb-3"
                        />
                    )}
                    <p>Các MAC đã quét sẽ được lưu lại. Bạn có chắc chắn muốn hoàn thành phiên này?</p>
                </div>
            ),
            okText: 'Hoàn thành phiên',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    if (!sessionId) return;
                    await exportSessionService.complete(sessionId);
                    messageApi.success('Hoàn tất phiên thành công!');
                    navigate('/export/list');
                } catch (error: any) {
                    messageApi.error(error.response?.data?.message || 'Lỗi khi hoàn tất phiên');
                }
            }
        });
    };

    if (!exportInfo) return <div>Loading...</div>;

    // TÍnh dữ liệu
    const totalRequired = exportInfo.totalQuantity || 0;
    const matchCount = sessionItems.length;
    const missingCount = Math.max(0, totalRequired - matchCount);

    // Cột MAC List
    const macColumns = [
        { title: 'Thiết bị', dataIndex: 'deviceCode', key: 'deviceCode', width: 150 },
        { title: 'MAC Address', dataIndex: 'serial', key: 'serial', width: 200, render: (t: string) => <b>{t}</b> },
        { title: 'Thời gian quét', dataIndex: 'scannedAt', key: 'scannedAt', render: (t: string) => t ? dayjs(t).format('HH:mm:ss DD/MM') : '' },
        { title: 'Trạng thái', key: 'status', render: () => <Tag color="blue">Mới quét</Tag> },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_: any, record: any) => (
                <Popconfirm
                    title="Xóa MAC này?"
                    description="Bạn có chắc chắn muốn xóa MAC này khỏi phiên?"
                    onConfirm={() => handleRemoveSerial(record.serial)}
                    okText="Xóa"
                    cancelText="Hủy"
                >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            )
        }
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {contextHolder}
            {modalContextHolder}
            {/* Header */}
            <div className="mb-6">
                <Space className="mb-4">
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/export/check')}>
                        Quay lại
                    </Button>
                </Space>

                <div className="mb-4">
                    <Title level={3} className="!mb-2">
                        {sessionData?.sessionName || 'Phiên xuất kho'}
                    </Title>
                    <Space>
                        <Tag color="blue">{sessionData?.code || 'SESSION-ID'}</Tag>
                        <Tag>{exportInfo.code}</Tag>
                        {getExportStatusTag(exportInfo.status)}
                    </Space>
                </div>
            </div>

            {/* Session Info */}
            <Card title="Thông tin phiên xuất kho" className="mb-4">
                <Descriptions column={2} size="small" bordered>
                    <Descriptions.Item label="Mã phiên">{sessionData?.code}</Descriptions.Item>
                    <Descriptions.Item label="Mã phiếu xuất">{exportInfo.code}</Descriptions.Item>
                    <Descriptions.Item label="Ngày xuất">{dayjs(exportInfo.exportDate).format('DD/MM/YYYY')}</Descriptions.Item>
                    <Descriptions.Item label="Người tạo">{sessionData?.createdBy || 'N/A'}</Descriptions.Item>
                </Descriptions>
            </Card>

            {/* Statistics */}
            <Card className="mb-4">
                <Row gutter={16}>
                    <Col span={6}><Statistic title="Tổng cần xuất" value={totalRequired} /></Col>
                    <Col span={6}><Statistic title="Đã quét" value={matchCount} suffix={`/ ${totalRequired}`} valueStyle={{ color: '#1890ff' }} /></Col>
                    <Col span={6}><Statistic title="Còn thiếu" value={missingCount} valueStyle={{ color: '#ff4d4f' }} /></Col>
                </Row>
                <Divider />
                <Progress percent={Math.round((matchCount / totalRequired) * 100)} status="active" />
            </Card>

            {/* Scan Section */}
            {sessionData?.status !== 'COMPLETED' ? (
                <Card title="Quét MAC xuất kho" className="mb-4">
                    <Space direction="vertical" className="w-full" size="middle">
                        <Alert
                            message="Hướng dẫn quét mã MAC"
                            description={
                                <ul className="mb-0 list-disc pl-5 space-y-1">
                                    <li>
                                        <Text strong>MAC KHỚP:</Text>{' '}
                                        MAC thuộc phiếu xuất và ở trạng thái &quot;Đã nhập kho&quot; (VD:
                                        AA:BB:CC:DD:EE:FF)
                                    </li>

                                    <li>
                                        <Text strong type="warning">
                                            MAC THỪA:
                                        </Text>{' '}
                                        MAC KHÔNG thuộc phiếu xuất này
                                    </li>

                                    <li>
                                        <Text strong type="danger">
                                            MAC ĐÃ XUẤT:
                                        </Text>{' '}
                                        MAC đã được xuất kho trước đó, KHÔNG thể xuất lại
                                    </li>

                                    <li>
                                        <Text strong type="danger">
                                            Thiếu MAC:
                                        </Text>{' '}
                                        Cảnh báo nếu chưa đủ số lượng khi hoàn tất
                                    </li>
                                </ul>
                            }
                            type="info"
                            showIcon
                        />

                        <Row gutter={16}>
                            <Space direction="vertical" className="w-full">
                                <Text strong>Nhập thủ công (Nhiều dòng)</Text>
                                <Input.TextArea
                                    rows={5}
                                    placeholder="MAC-001&#10;MAC-002..."
                                    value={manualMacs}
                                    onChange={e => setManualMacs(e.target.value)}
                                    disabled={loading}
                                />
                                <Button block onClick={handleManualImport} icon={<CheckCircleOutlined />} loading={loading}>Nhập danh sách</Button>
                            </Space>
                        </Row>
                    </Space>
                </Card>
            ) : (
                <Alert
                    message="Phiên xuất kho này đã hoàn thành"
                    description="Bạn không thể thêm hoặc xóa serial trong phiên đã hoàn thành."
                    type="success"
                    showIcon
                    className="mb-4"
                />
            )}

            {/* List */}
            <Card
                title="Danh sách MAC"
                extra={<Button icon={<FileExcelOutlined />}>Xuất Excel</Button>}
                className="mb-4"
            >
                <Table
                    columns={macColumns.filter(col => {
                        if (col.key === 'action' && sessionData?.status === 'COMPLETED') return false;
                        return true;
                    })}
                    dataSource={sessionItems}
                    rowKey="serial"
                    size="small"
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            {/* Complete */}
            {sessionData?.status !== 'COMPLETED' && (
                <Card>
                    {matchCount > totalRequired && (
                        <Alert
                            message="Cảnh báo: Số lượng quét vượt quá yêu cầu"
                            description={`Bạn đã quét ${matchCount}/${totalRequired} thiết bị. Vui lòng xóa bớt thiết bị thừa trước khi hoàn tất.`}
                            type="error"
                            showIcon
                            className="mb-4"
                        />
                    )}

                    <div className="flex justify-between items-center">
                        <div>
                            <Text strong className="text-lg">Hoàn thành phiên xuất kho</Text>
                            <div className="text-gray-500">
                                Lưu các MAC đã quét vào hệ thống.
                            </div>
                        </div>
                        <Button
                            type="primary"
                            size="large"
                            icon={<CheckCircleOutlined />}
                            onClick={handleCompleteExport}
                            disabled={matchCount > totalRequired}
                            danger={matchCount > totalRequired}
                            title={matchCount > totalRequired ? 'Vui lòng bỏ bớt thiết bị thừa' : 'Hoàn tất phiên'}
                        >
                            Hoàn thành phiên xuất kho
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
}

