import { useState, useEffect, useMemo } from 'react';
import {
    Button, message, Space, Modal, Card, Row, Col, Alert, Table, Popconfirm, Typography, Tag
} from 'antd';
import {
    CheckCircleOutlined,
    DeleteOutlined,
    ArrowLeftOutlined
} from '@ant-design/icons';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';

import { exportService } from '../../services/export.service';
import { exportSessionService } from '../../services/export-session.service';
import type { DeviceExport } from '../../types/export.type';

// Sub-components
import { ExportSessionInfo } from './components/ExportSessionInfo';
import { ExportRequirements } from './components/ExportRequirements';
import { ExportStatistics } from './components/ExportStatistics';
import { ExportScanner } from './components/ExportScanner';

const { Text } = Typography;

export default function ExportProcessPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('sessionId');
    const [messageApi, contextHolder] = message.useMessage();
    const [modal, modalContextHolder] = Modal.useModal();

    // Data State
    const [exportInfo, setExportInfo] = useState<DeviceExport | null>(null);
    const [sessionData, setSessionData] = useState<any>(null);
    const [sessionItems, setSessionItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form/Input State
    const [manualMacs, setManualMacs] = useState('');

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
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [id, sessionId]);

    const handleRemoveMac = async (mac: string) => {
        if (!sessionId) return;
        try {
            await exportSessionService.removeMac(sessionId, mac);
            messageApi.success(`Đã xóa MAC ${mac}`);

            // Remove 
            setSessionItems(prev => prev.filter(item => item.mac !== mac));

            // Update count
            const newCount = Math.max(0, (sessionData?.totalScanned || 0) - 1);
            setSessionData((prev: any) => ({ ...prev, totalScanned: newCount }));

        } catch (error: any) {
            messageApi.error(error.response?.data?.message || 'Lỗi khi xóa MAC');
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

    const processBulkScan = async (codes: string[]) => {
        setLoading(true);
        try {
            const res = await exportSessionService.scanBulk(sessionId!, codes);
            messageApi.success(`Đã xử lý ${codes.length} mã.`);

            if (res.data?.errors?.length) {
                const errorList = res.data.errors;
                Modal.warning({
                    title: 'Kết quả quét có lỗi',
                    content: (
                        <div>
                            <p>Các mã sau không được chấp nhận:</p>
                            <ul className="list-disc pl-4 text-red-500">
                                {errorList.map((e: any, idx: number) => (
                                    <li key={idx}><b>{e.mac}</b>: {e.error}</li>
                                ))}
                            </ul>
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

    // Calculation Logic
    const {
        allScannedItems,
        currentSessionMatchCount,
        totalRequiredForSession,
        missingCount,
        originalTotalRequired,
        perModelStats,
        excessModels,
        hasExcess
    } = useMemo(() => {
        if (!exportInfo) return {
            allScannedItems: [], currentSessionMatchCount: 0, totalRequiredForSession: 0, missingCount: 0, originalTotalRequired: 0,
            perModelStats: [], excessModels: [], hasExcess: false
        };

        const allItems = exportInfo.items || [];
        const currentItems = sessionItems;

        const otherSessionsItems = allItems.filter(
            item => !currentItems.some(currentItem => currentItem.mac === item.mac)
        );

        const origTotal = exportInfo.totalQuantity || 0;
        const scannedOther = otherSessionsItems.length;
        const totalReq = Math.max(0, origTotal - scannedOther);
        const match = currentItems.length;
        const missing = Math.max(0, totalReq - match);

        const stats = (exportInfo.requirements || []).map((req: any) => {
            const totalScanned = allItems.filter(item => item.deviceCode === req.deviceCode).length;
            const required = req.quantity || 0;
            const excess = Math.max(0, totalScanned - required);
            const missing = Math.max(0, required - totalScanned);
            return {
                deviceCode: req.deviceCode,
                deviceName: req.deviceName,
                totalScanned,
                required,
                excess,
                missing,
                isComplete: totalScanned >= required,
                isExcess: totalScanned > required
            };
        });

        const excess = stats.filter((m: any) => m.isExcess);

        return {
            allScannedItems: allItems,
            currentSessionMatchCount: match,
            totalRequiredForSession: totalReq,
            missingCount: missing,
            originalTotalRequired: origTotal,
            perModelStats: stats,
            excessModels: excess,
            hasExcess: excess.length > 0
        };

    }, [exportInfo, sessionItems]);


    const handleCompleteExport = () => {
        modal.confirm({
            title: 'Xác nhận hoàn tất Phiên Xuất kho?',
            icon: null,
            width: 600,
            content: (
                <div>
                    {currentSessionMatchCount >= totalRequiredForSession && (
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
                                    <li>Tổng yêu cầu: <b>{totalRequiredForSession}</b></li>
                                    <li>Đã quét: <b>{currentSessionMatchCount}</b></li>
                                    <li>Còn thiếu: <b className="text-red-500">{missingCount}</b></li>
                                </ul>
                            }
                            type="warning"
                            showIcon
                            className="mb-3"
                        />
                    ) : currentSessionMatchCount > totalRequiredForSession ? (
                        <Alert
                            message="Lỗi quy trình: Quét thừa thiết bị"
                            description={`Bạn đã quét ${currentSessionMatchCount}/${totalRequiredForSession}. Vui lòng xóa bớt.`}
                            type="error"
                            showIcon
                            className="mb-3"
                        />
                    ) : (
                        <Alert
                            message="Xác nhận hoàn tất xuất kho"
                            description={
                                <ul className="mb-0 list-disc pl-5">
                                    <li>Tổng yêu cầu: <b>{totalRequiredForSession}</b></li>
                                    <li>Đã quét: <b className="text-green-600">{currentSessionMatchCount}</b></li>
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
                    navigate('/export/check');
                } catch (error: any) {
                    messageApi.error(error.response?.data?.message || 'Lỗi khi hoàn tất phiên');
                }
            }
        });
    };

    // Columns for MAC List
    const macColumns = [
        { title: 'Thiết bị', dataIndex: 'deviceCode', key: 'deviceCode', width: 'auto' },
        { title: 'MAC Address', dataIndex: 'mac', key: 'mac', width: 'auto', render: (t: string) => <b>{t}</b> },
        { title: 'Thời gian quét', dataIndex: 'scannedAt', key: 'scannedAt', render: (t: string) => t ? dayjs(t).format('HH:mm:ss DD/MM') : '' },
        { title: 'Trạng thái', key: 'status', render: () => <Tag color="blue">Mới quét</Tag> },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_: any, record: any) => (
                <Popconfirm
                    title="Xóa MAC này?"
                    description="Bạn có chắc chắn muốn xóa MAC này khỏi phiên?"
                    onConfirm={() => handleRemoveMac(record.mac)}
                    okText="Xóa"
                    cancelText="Hủy"
                >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            )
        }
    ];

    if (!exportInfo) return <div>Loading...</div>;

    return (
        <div className="p-2 pt-0 max-w-7xl mx-auto">
            {contextHolder}
            {modalContextHolder}
            <Space className="mb-4">
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/export/check')}>
                    Quay lại
                </Button>
            </Space>

            <Row gutter={16} className="mb-2">
                <Col span={8}>
                    <ExportSessionInfo
                        sessionCode={sessionData?.sessionCode}
                        exportInfo={exportInfo}
                        createdBy={sessionData?.createdBy}
                    />
                </Col>
                <Col span={16}>
                    <ExportRequirements perModelStats={perModelStats} />
                </Col>
            </Row>

            <ExportStatistics
                allScannedCount={allScannedItems.length}
                originalTotalRequired={originalTotalRequired}
                currentSessionMatchCount={currentSessionMatchCount}
                totalRequiredForSession={totalRequiredForSession}
                missingCount={missingCount}
            />

            <ExportScanner
                status={sessionData?.status}
                manualMacs={manualMacs}
                setManualMacs={setManualMacs}
                onImport={handleManualImport}
                loading={loading}
            />

            <Card title="Danh sách MAC" className="mb-2">
                <Table
                    columns={macColumns.filter(col => {
                        if (col.key === 'action' && sessionData?.status === 'COMPLETED') return false;
                        return true;
                    })}
                    dataSource={sessionItems}
                    rowKey="mac"
                    size="small"
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            {sessionData?.status !== 'COMPLETED' && (
                <Card>
                    {hasExcess && (
                        <Alert
                            message="Lỗi: Có model quét vượt quá yêu cầu"
                            description={
                                <ul className="mb-0 pl-4">
                                    {(excessModels as any[]).map(m => (
                                        <li key={m.deviceCode}>
                                            <b>{m.deviceCode}</b>: Đã quét {m.totalScanned}/{m.required} (+{m.excess} thừa)
                                        </li>
                                    ))}
                                </ul>
                            }
                            type="error"
                            showIcon
                            className="mb-4"
                        />
                    )}

                    <div className="flex justify-between items-center">
                        <div>
                            <Text strong className="text-lg">Hoàn thành phiên xuất kho</Text>
                            <div className="text-gray-500">
                                {hasExcess
                                    ? 'Vui lòng xóa bớt thiết bị thừa trước khi hoàn tất.'
                                    : 'Lưu các MAC đã quét vào hệ thống.'
                                }
                            </div>
                        </div>
                        <Button
                            type="primary"
                            size="large"
                            icon={<CheckCircleOutlined />}
                            onClick={handleCompleteExport}
                            disabled={hasExcess || currentSessionMatchCount === 0}
                            danger={hasExcess}
                            title={hasExcess ? 'Vui lòng xóa thiết bị thừa' : currentSessionMatchCount === 0 ? 'Chưa quét thiết bị nào' : 'Hoàn tất phiên'}
                        >
                            Hoàn thành phiên xuất kho
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
}


