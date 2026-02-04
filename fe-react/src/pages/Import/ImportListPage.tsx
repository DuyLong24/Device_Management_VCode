import { useState, useEffect } from 'react';
import { Card, Button, Space, Table, Tag, Form, Tooltip, Empty, Spin, Typography } from 'antd';
import { PlusOutlined, EyeOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import { importService } from '../../services/import.service';
import type { DeviceImport } from '../../types/import.type';
import { IMPORT_LABELS, IMPORT_TABLE_COLUMNS, IMPORT_STATUS_CONFIG, IMPORT_ORIGIN_CONFIG } from '../../constants/import.constants';
import { StatisticsCards, PageHeader, FilterBar } from '../../components/ui';
import { FileTextOutlined, ClockCircleOutlined, SyncOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { exportImportPDF } from '../../utils/export-import-pdf';
import { message } from 'antd';

const { Text } = Typography;

interface DeviceItem {
    key: string;
    deviceCode: string;
    deviceName: string;
    quantity: number;
    packaging: string;
    boxCount?: number;
    itemsPerBox?: number;
    serialImported: number;
    serialExpected: number;
    serialStatus: 'complete' | 'missing' | 'excess';
}

interface ImportRecord {
    key: string;
    importCode: string;
    deviceType: string;
    importDate: string;
    importedBy: string;
    supplier: string;
    handoverPerson: string;
    totalDeviceCodes: number;
    totalQuantity: number;
    serialImported: number;
    serialExpected: number;
    inventoryStatus: 'pending' | 'in-progress' | 'completed';
    status: 'DRAFT' | 'PUBLIC';
    origin?: string;
    notes?: string;
    devices: DeviceItem[];
}

export default function ImportListPage() {
    const navigate = useNavigate();
    const [form] = Form.useForm();

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ImportRecord[]>([]);
    const [filteredData, setFilteredData] = useState<ImportRecord[]>([]);

    const mapApiToUi = (apiData: DeviceImport[]): ImportRecord[] => {
        if (!Array.isArray(apiData)) return [];
        return apiData.map((item) => {
            const devices: DeviceItem[] = item.devices.map((dev: any, index) => {
                const serialImported = dev.serialImported || 0;
                const serialExpected = dev.quantity || 0;

                let serialStatus: 'complete' | 'missing' | 'excess' = 'complete';
                if (serialImported < serialExpected) serialStatus = 'missing';
                if (serialImported > serialExpected) serialStatus = 'excess';

                return {
                    key: dev._id || `${item.id}-${index}`,
                    deviceCode: dev.deviceCode,
                    deviceName: dev.deviceName || dev.deviceCode,
                    quantity: dev.quantity,
                    packaging: `${dev.boxCount || 0} hộp × ${dev.itemsPerBox || 0} sp/hộp`,
                    boxCount: dev.boxCount,
                    itemsPerBox: dev.itemsPerBox,
                    serialImported,
                    serialExpected,
                    serialStatus,
                };
            });

            let inferredStatus = item.status;
            if (!inferredStatus) {
                if (item.inventoryStatus && item.inventoryStatus !== 'pending') {
                    inferredStatus = 'PUBLIC';
                } else {
                    inferredStatus = 'DRAFT';
                }
            }

            return {
                key: item.id,
                importCode: item.code,
                deviceType: item.deviceType || 'Khác',
                importDate: item.importDate,
                importedBy: item.createdBy?.name || item.createdBy?.username || item.importedBy || '---',
                supplier: item.supplier,
                handoverPerson: item.handoverPerson || '---',
                totalDeviceCodes: item.totalItem,
                totalQuantity: item.totalQuantity,
                serialImported: item.serialImported,
                serialExpected: item.totalQuantity,
                inventoryStatus: (item.inventoryStatus || 'pending') as any,
                status: inferredStatus as any,
                origin: (item as any).origin || 'IMPORT',
                notes: item.notes,
                devices,
            };
        });
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await importService.getImports({ limit: 1000 });
            if (res && res.data) {
                const uiData = mapApiToUi(res.data);
                setData(uiData);
                setFilteredData(uiData);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRealtimeFilter = () => {
        const values = form.getFieldsValue();
        let filtered = [...data];

        if (values.keyword) {
            const keyword = values.keyword.toLowerCase();
            filtered = filtered.filter((item) => {
                const matchBasic =
                    item.importCode.toLowerCase().includes(keyword) ||
                    item.supplier.toLowerCase().includes(keyword) ||
                    item.importedBy.toLowerCase().includes(keyword) ||
                    item.handoverPerson.toLowerCase().includes(keyword);
                const matchDevice = item.devices.some((p) => p.deviceCode.toLowerCase().includes(keyword));
                return matchBasic || matchDevice;
            });
        }

        if (values.dateRange && values.dateRange.length === 2) {
            filtered = filtered.filter((item) => {
                const itemDate = dayjs(item.importDate);
                return itemDate.isAfter(values.dateRange[0].startOf('day')) && itemDate.isBefore(values.dateRange[1].endOf('day'));
            });
        }

        if (values.status) {
            filtered = filtered.filter((item) => item.inventoryStatus === values.status);
        }

        setFilteredData(filtered);
    };

    const handleReset = () => {
        form.resetFields();
        setFilteredData(data);
    };

    const handleViewDetail = (importCode: string) => {
        navigate(`/import/${importCode}`);
    };

    const handleExportPdf = async (record: ImportRecord) => {
        try {
            message.loading({ content: 'Đang tạo file PDF...', key: 'pdf_export' });

            const deviceImportData: any = {
                id: record.key,
                code: record.importCode,
                status: 'COMPLETED',
                inventoryStatus: record.inventoryStatus,
                deviceType: record.deviceType,
                origin: record.origin || 'IMPORT',
                importDate: record.importDate,
                importedBy: record.importedBy,
                supplier: record.supplier,
                handoverPerson: record.handoverPerson,
                notes: record.notes,
                totalItem: record.totalDeviceCodes,
                totalQuantity: record.totalQuantity,
                serialImported: record.serialImported,
                devices: record.devices.map(p => ({
                    deviceCode: p.deviceCode,
                    quantity: p.quantity,
                    boxCount: p.boxCount || 0,
                    itemsPerBox: p.itemsPerBox || 0,
                    serialImported: p.serialImported,
                }))
            };

            await exportImportPDF(deviceImportData);
            message.success({ content: 'Đã xuất file PDF thành công!', key: 'pdf_export' });
        } catch (error) {
            console.error(error);
            message.error({ content: 'Lỗi khi tạo PDF', key: 'pdf_export' });
        }
    };

    const statisticsCards = [
        {
            title: 'Tổng phiếu nhập',
            value: data.length,
            prefix: <FileTextOutlined />,
            color: '#1890ff',
        },
        {
            title: 'Chờ kiểm kê',
            value: data.filter((item) => item.inventoryStatus === 'pending').length,
            prefix: <ClockCircleOutlined />,
            color: '#8c8c8c',
        },
        {
            title: 'Đang kiểm kê',
            value: data.filter((item) => item.inventoryStatus === 'in-progress').length,
            prefix: <SyncOutlined spin />,
            color: '#1890ff',
        },
        {
            title: 'Đã kiểm kê',
            value: data.filter((item) => item.inventoryStatus === 'completed').length,
            prefix: <CheckCircleOutlined />,
            color: '#52c41a',
        },
    ];

    const statusOptions = [
        { value: 'pending', label: 'Chưa kiểm kê' },
        { value: 'in-progress', label: 'Đang kiểm kê' },
        { value: 'completed', label: 'Đã kiểm kê' },
    ];



    const columns: TableColumnsType<ImportRecord> = [
        {
            title: IMPORT_TABLE_COLUMNS.CODE,
            dataIndex: 'importCode',
            key: 'importCode',
            width: 150,
            fixed: 'left',
            render: (text, record) => (
                <Button
                    type="link"
                    onClick={() => handleViewDetail(record.key)}
                    className="p-0 whitespace-nowrap">
                    {text}
                </Button>
            ),
        },
        {
            title: IMPORT_TABLE_COLUMNS.TYPE,
            dataIndex: 'deviceType',
            key: 'deviceType',
            width: 130,
            render: (text) => <Tag color="blue" className="whitespace-nowrap">{text}</Tag>,
        },
        {
            title: IMPORT_TABLE_COLUMNS.ORIGIN,
            dataIndex: 'origin',
            key: 'origin',
            width: 130,
            render: (origin) => {
                const config = IMPORT_ORIGIN_CONFIG[origin || ''] || IMPORT_ORIGIN_CONFIG.DEFAULT;
                return <Tag color={config.color} className="whitespace-nowrap">{config.text}</Tag>;
            },
        },
        {
            title: IMPORT_TABLE_COLUMNS.DATE,
            dataIndex: 'importDate',
            key: 'importDate',
            width: 120,
            sorter: (a, b) => dayjs(a.importDate).unix() - dayjs(b.importDate).unix(),
            render: (text) => <span className="whitespace-nowrap">{dayjs(text).format('DD/MM/YYYY')}</span>,
        },
        {
            title: IMPORT_TABLE_COLUMNS.IMPORTER,
            dataIndex: 'importedBy',
            key: 'importedBy',
            width: 150,
            render: (text) => <div className="whitespace-nowrap truncate" title={text}>{text}</div>
        },
        {
            title: IMPORT_TABLE_COLUMNS.SUPPLIER,
            dataIndex: 'supplier',
            key: 'supplier',
            width: 200,
            render: (text) => <div className="whitespace-nowrap truncate" title={text}>{text}</div>
        },
        {
            title: IMPORT_TABLE_COLUMNS.TOTAL_QTY,
            dataIndex: 'totalQuantity',
            key: 'totalQuantity',
            width: 100,
            align: 'center',
            render: (value) => <Tag color="blue" className="text-sm font-medium">{value}</Tag>,
        },
        {
            title: IMPORT_TABLE_COLUMNS.STATUS,
            dataIndex: 'inventoryStatus',
            key: 'inventoryStatus',
            width: 150,
            align: 'center',
            render: (_, record) => {
                if (record.status === 'DRAFT') {
                    return <Tag color="default">Nháp (Draft)</Tag>;
                }
                const config = IMPORT_STATUS_CONFIG[record.inventoryStatus as keyof typeof IMPORT_STATUS_CONFIG] || IMPORT_STATUS_CONFIG.pending;
                return <Tag color={config.color}>{config.text}</Tag>;
            },
        },
        {
            title: IMPORT_TABLE_COLUMNS.NOTE,
            dataIndex: 'notes',
            key: 'notes',
            width: 80,
            align: 'center',
            render: (notes) =>
                notes ? (
                    <Tooltip title={notes}>
                        <InfoCircleOutlined className="text-base text-blue-500 cursor-pointer" />
                    </Tooltip>
                ) : (
                    <Text type="secondary">—</Text>
                ),
        },
        {
            title: IMPORT_TABLE_COLUMNS.ACTION,
            key: 'action',
            width: 250,
            fixed: 'right',
            align: 'center',
            render: (_, record) => (
                <Space size="small">
                    <Button type="primary" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record.key)}>
                        {IMPORT_LABELS.BTN_DETAIL}
                    </Button>
                    <Button size="small" icon={<FileTextOutlined />} onClick={() => handleExportPdf(record)}>
                        Xuất PDF
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div className="min-h-full p-3 ">
            <PageHeader
                title={IMPORT_LABELS.PAGE_TITLE}
                extra={
                    <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => navigate('/import/create')}>
                        {IMPORT_LABELS.BTN_CREATE}
                    </Button>
                }
            />

            <div className="mt-3">
                <StatisticsCards cards={statisticsCards} />
            </div>


            <FilterBar
                form={form}
                onValuesChange={handleRealtimeFilter}
                onReset={handleReset}
                searchPlaceholder={IMPORT_LABELS.SEARCH_PLACEHOLDER}
                showDateRange={true}
                statusOptions={statusOptions}
                statusPlaceholder="Trạng thái kiểm kê"
                showReload={true}
                onReload={() => {
                    fetchData();
                    handleReset();
                }}
            />

            <Card variant="borderless" styles={{ body: { padding: 0 } }}>
                {loading && data.length === 0 ? (
                    <div className="text-center py-12">
                        <Spin size="large" fullscreen={false} />
                    </div>
                ) : filteredData.length === 0 ? (
                    <Empty description={IMPORT_LABELS.NOT_FOUND} image={Empty.PRESENTED_IMAGE_SIMPLE} className="p-10">
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/import/create')}>
                            {IMPORT_LABELS.CREATE_NOW}
                        </Button>
                    </Empty>
                ) : (
                    <Table
                        columns={columns}
                        dataSource={filteredData}
                        scroll={{ x: 1300 }}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `Tổng ${total} phiếu nhập`,
                            pageSizeOptions: ['10', '20', '50'],
                        }}
                        size="middle"
                    />
                )}
            </Card>
        </div>
    );
}