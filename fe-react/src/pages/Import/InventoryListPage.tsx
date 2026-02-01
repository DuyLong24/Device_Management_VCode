import { useState, useEffect } from 'react';
import {
    Card, Button, Table, Tag, Typography, message, Modal, Space, List, Form, Input, Select,
    Divider, Popover
} from 'antd';
import {
    ReloadOutlined, PlusOutlined, SearchOutlined, QuestionCircleOutlined
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import { importService } from '../../services/import.service';
import { inventorySessionService } from '../../services/inventory-session.service';
import type { InventorySession } from '../../services/inventory-session.service';
import type { DeviceImport } from '../../types/import.type';

const { Title, Text } = Typography;

import { INVENTORY_LABELS } from '../../constants/inventory.constants';

// Config hiển thị trạng thái kiểm kê
const getInventoryStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; text: string }> = {
        pending: { color: 'default', text: INVENTORY_LABELS.STATUS_PROCESSING },
        'in-progress': { color: 'processing', text: INVENTORY_LABELS.STATUS_PROCESSING },
        completed: { color: 'success', text: INVENTORY_LABELS.STATUS_COMPLETED },
    };
    return configs[status] || configs.pending;
};

export default function InventoryListPage() {
    const navigate = useNavigate();
    const [form] = Form.useForm();

    // Data State
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<DeviceImport[]>([]);
    const [filteredData, setFilteredData] = useState<DeviceImport[]>([]);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedImport, setSelectedImport] = useState<DeviceImport | null>(null);
    const [sessions, setSessions] = useState<InventorySession[]>([]);
    const [sessionLoading, setSessionLoading] = useState(false);

    // 1. Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await importService.getImports({});
            if (res.data) {
                // Lọc phiếu chưa hoàn thành
                const activeImports = res.data.filter((item: DeviceImport) =>
                    item.inventoryStatus === 'pending' || item.inventoryStatus === 'in-progress'
                );
                setData(activeImports);
                setFilteredData(activeImports);
            }
        } catch (error) {
            message.error('Lỗi tải danh sách phiếu nhập');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 2. Handle Mở Modal
    const handleOpenSelectModal = async (record: DeviceImport) => {
        setSelectedImport(record);
        setModalVisible(true);
        setSessionLoading(true);
        try {
            const sessionList = await inventorySessionService.getByImportId(record.id);
            setSessions(sessionList);
        } catch (error) {
            message.error('Không thể tải danh sách phiên kiểm kê');
        } finally {
            setSessionLoading(false);
        }
    };

    // 3. Handle Tạo phiên mới
    const handleCreateSession = async () => {
        if (!selectedImport) return;
        try {
            const newSessionName = `Kiểm kê lần ${sessions.length + 1} (${dayjs().format('DD/MM HH:mm')})`;

            const newSession = await inventorySessionService.create({
                importId: selectedImport.id,
                name: newSessionName,
                note: 'Tạo từ danh sách phiếu nhập'
            });

            message.success('Đã tạo phiên mới');
            setModalVisible(false);
            // Điều hướng kèm sessionId
            navigate(`/import/inventory-check/${selectedImport.id}?sessionId=${newSession.id}`);
        } catch (error) {
            message.error('Lỗi tạo phiên');
        }
    };

    // 4. Handle Chọn phiên cũ
    const handleResumeSession = (sessionId: string) => {
        if (!selectedImport) return;
        setModalVisible(false);
        // Điều hướng kèm sessionId
        navigate(`/import/inventory-check/${selectedImport.id}?sessionId=${sessionId}`);
    };

    // Filter Logic
    const handleFilter = () => {
        const values = form.getFieldsValue();
        let result = [...data];

        if (values.keyword) {
            const k = values.keyword.toLowerCase();
            result = result.filter(item =>
                item.code.toLowerCase().includes(k) ||
                item.supplier.toLowerCase().includes(k)
            );
        }
        if (values.status) {
            result = result.filter(item => item.inventoryStatus === values.status);
        }
        setFilteredData(result);
    };

    const columns: TableColumnsType<DeviceImport> = [
        {
            title: INVENTORY_LABELS.IMPORT_TICKET,
            dataIndex: 'code',
            width: 150,
            render: (text, record) => (
                <a onClick={() => handleOpenSelectModal(record)} style={{ fontWeight: 500 }} className="whitespace-nowrap block truncate">
                    {text}
                </a>
            ),
        },
        { title: 'Loại hàng hóa', dataIndex: 'deviceType', width: 120, render: t => <Tag color="blue">{t}</Tag> },
        { title: 'Ngày nhập', dataIndex: 'importDate', width: 120, render: d => d ? dayjs(d).format('DD/MM/YYYY') : '---' },
        {
            title: 'Người nhập',
            dataIndex: 'importedBy',
            width: 150,
            render: (text, record) => <div className="whitespace-nowrap truncate">{text || record.createdBy?.name || '---'}</div>
        },
        {
            title: 'Nhà cung cấp',
            dataIndex: 'supplier',
            width: 200,
            render: (text) => <div className="whitespace-nowrap truncate" title={text}>{text}</div>
        },
        { title: 'Tổng SP', dataIndex: 'totalQuantity', width: 100, align: 'center' },
        {
            title: INVENTORY_LABELS.TOTAL_SCANNED,
            key: 'progress',
            align: 'center',
            render: (_, record) => {
                const current = record.serialImported || 0;
                const total = record.totalQuantity || 0;
                const color = current < total ? '#ff4d4f' : '#52c41a';
                return <span style={{ color, whiteSpace: 'nowrap' }}>{current}/{total}</span>;
            },
        },
        {
            title: INVENTORY_LABELS.STATUS,
            dataIndex: 'inventoryStatus',
            align: 'center',
            render: (status) => {
                const conf = getInventoryStatusConfig(status);
                return <Tag color={conf.color}>{conf.text}</Tag>;
            }
        },
        {
            title: 'Thao tác',
            key: 'action',
            align: 'center',
            width: 200,
            render: (_, record) => {
                // const canComplete = record.serialImported >= record.totalQuantity;
                return (
                    <Space size="small">
                        <Button
                            type="primary"
                            size="small"
                            onClick={() => handleOpenSelectModal(record)}
                        >
                            Chọn
                        </Button>
                        {/* <Button
                            size="small"
                            type={canComplete ? "primary" : "default"}
                            danger={canComplete}
                            disabled={!canComplete}
                            icon={<CheckCircleOutlined />}
                            onClick={() => handleCompleteImport(record)}
                        >
                            Hoàn tất
                        </Button> */}
                    </Space>
                );
            },
        }
    ];

    // const handleCompleteImport = async (record: DeviceImport) => {
    //     try {
    //         message.loading({ content: 'Đang xử lý hoàn tất...', key: 'complete_import' });
    //         await importService.completeImport(record.id);
    //         message.success({ content: 'Đã hoàn tất phiếu nhập kho!', key: 'complete_import' });
    //         // Refresh list
    //         fetchData();
    //     } catch (error: any) {
    //         const msg = error.response?.data?.message || 'Không thể hoàn tất phiếu nhập';
    //         message.error({ content: msg, key: 'complete_import' });
    //     }
    // };

    return (
        <div className="p-6">
            <Space align="center" className="mb-4">
                <Title level={3} className="!mb-0 !mt-0">{INVENTORY_LABELS.PAGE_TITLE_LIST}</Title>
                <Popover
                    title="Điều kiện kiểm kê"
                    content={
                        <div style={{ maxWidth: 450 }}>
                            <Text>Chỉ hiển thị các phiếu nhập đáp ứng điều kiện sau:</Text>
                            <ul className="mt-2 mb-0 pl-5">
                                <li>
                                    <Text strong type="secondary">Chưa kiểm kê:</Text> Phiếu mới nhập, chưa thực hiện kiểm kê
                                </li>
                                <li>
                                    <Text strong className="text-blue-500">Đang kiểm kê:</Text> Phiếu đang trong quá trình kiểm kê, có thể tiếp tục quét serial
                                </li>
                            </ul>
                            <Divider className="my-3" />
                            <Text type="secondary">Các phiếu bị ẩn (không hiển thị trong danh sách):</Text>
                            <ul className="mt-2 mb-0 pl-5">
                                <li>
                                    <Text type="success">Đã kiểm kê:</Text> Phiếu đã hoàn tất, không thể kiểm kê lại
                                </li>
                            </ul>
                        </div>
                    }
                >
                    <QuestionCircleOutlined className="text-gray-400 cursor-pointer text-lg hover:text-blue-500 transition-colors" />
                </Popover>
            </Space>

            <Card size="small" className="mb-4">
                <Form form={form} layout="inline" onValuesChange={handleFilter}>
                    <Form.Item name="keyword"><Input prefix={<SearchOutlined />} placeholder={INVENTORY_LABELS.SEARCH_PLACEHOLDER} /></Form.Item>
                    <Form.Item name="status">
                        <Select className="w-[150px]" placeholder="Trạng thái" allowClear>
                            <Select.Option value="pending">Chưa kiểm kê</Select.Option>
                            <Select.Option value="in-progress">Đang kiểm kê</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item><Button icon={<ReloadOutlined />} onClick={() => { form.resetFields(); setFilteredData(data); }} /></Form.Item>
                </Form>
            </Card>

            <Card styles={{ body: { padding: 0 } }} variant="borderless">
                <Table
                    columns={columns}
                    dataSource={filteredData}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `Tổng ${total} phiếu nhập`,
                    }}
                />
            </Card>

            {/* MODAL CHỌN PHIÊN */}
            <Modal
                title="Chọn phiên kiểm kê hoặc tạo phiên mới"
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={600}
            >
                {selectedImport && (
                    <Space direction="vertical" className="w-full" size="large">
                        <div className="bg-blue-50 border border-blue-300 p-4 rounded-md">
                            <div className="flex gap-2 items-center mb-2">
                                <div className="bg-blue-500 text-white rounded-full w-5 h-5 text-center text-xs leading-5">i</div>
                                <Text strong>Phiếu nhập: {selectedImport.code}</Text>
                            </div>
                            <div className="pl-7 text-sm text-gray-600">
                                <div>Nhà cung cấp: <b>{selectedImport.supplier}</b></div>
                                <div>Tổng số lượng: <b>{selectedImport.totalQuantity}</b></div>
                                <div className="mt-1">
                                    <Text className="text-blue-500">{getInventoryStatusConfig(selectedImport.inventoryStatus).text}</Text>
                                    <Text type="secondary"> - Serial đã quét: <b>{selectedImport.serialImported || 0}</b></Text>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Text strong>Các phiên kiểm kê hiện có:</Text>
                            <List
                                loading={sessionLoading}
                                dataSource={sessions}
                                renderItem={(item) => (
                                    <List.Item
                                        actions={[
                                            <Button type="primary" size="small" onClick={() => handleResumeSession(item.id)} disabled={item.status === 'completed'}>
                                                {item.status === 'completed' ? 'Đã xong' : 'Tiếp tục'}
                                            </Button>
                                        ]}
                                    >
                                        <List.Item.Meta
                                            title={
                                                <Space>
                                                    <Text strong>{item.name}</Text>
                                                    <Tag color={item.status === 'completed' ? 'green' : 'blue'}>
                                                        {item.status === 'completed' ? 'Hoàn thành' : 'Đang kiểm kê'}
                                                    </Tag>
                                                </Space>
                                            }
                                            description={`Tạo: ${dayjs(item.createdAt).format('HH:mm DD/MM')} - Đã quét: ${item.totalScanned}`}
                                        />
                                    </List.Item>
                                )}
                                locale={{ emptyText: <Text type="secondary" className="p-2.5 block">Chưa có phiên nào.</Text> }}
                                className="mt-2 border border-gray-200 rounded px-3"
                            />
                        </div>

                        <Button type="dashed" block icon={<PlusOutlined />} size="large" onClick={handleCreateSession}>
                            Tạo phiên kiểm kê mới
                        </Button>
                    </Space>
                )}
            </Modal>
        </div>
    );
}