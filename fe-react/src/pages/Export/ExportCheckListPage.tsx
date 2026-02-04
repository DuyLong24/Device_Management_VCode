import { useState, useEffect } from 'react';
import {
    Card, Button, Table, Tag, Typography, Alert, message, Modal, Space, Form, Input, Select, Divider, Spin, Progress, Popover
} from 'antd';
import {
    ReloadOutlined, PlusOutlined, SearchOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import { exportService } from '../../services/export.service';
import { exportSessionService } from '../../services/export-session.service';
import { getExportStatusTag } from '../../utils/export-status.util';
import type { DeviceExport } from '../../types/export.type';

const { Title, Text } = Typography;

export default function ExportCheckListPage() {
    const navigate = useNavigate();
    const [filterForm] = Form.useForm();
    const [createForm] = Form.useForm();

    // State for Modal Mode
    const [isCreating, setIsCreating] = useState(false);

    // Data State
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<DeviceExport[]>([]);
    const [filteredData, setFilteredData] = useState<DeviceExport[]>([]);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedExport, setSelectedExport] = useState<DeviceExport | null>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [sessionLoading, setSessionLoading] = useState(false);

    const [_, modalContextHolder] = Modal.useModal();
    const [messageApi, contextHolder] = message.useMessage();

    // 1. Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await exportService.getAll({ limit: 100 });
            const allExports = (res.data as any).results || (Array.isArray(res.data) ? res.data : []);

            const activeExports = allExports.filter((item: DeviceExport) =>
                item.status === 'APPROVED' || item.status === 'IN_PROGRESS'
            );

            setData(activeExports);
            setFilteredData(activeExports);
        } catch (error) {
            messageApi.error('Lỗi tải danh sách phiếu xuất');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenSelectModal = async (record: DeviceExport) => {
        setSelectedExport(record);
        setModalVisible(true);
        setSessionLoading(true);

        setIsCreating(record.status === 'APPROVED');

        if (record.status === 'APPROVED') {
            createForm.setFieldsValue({
                sessionName: `Xuất kho lần 1`,
                note: ''
            });
        }

        try {
            const id = record.id || record._id;
            if (!id) return;
            const res = await exportSessionService.getSessions(id);
            setSessions(res.data);

            if (record.status === 'IN_PROGRESS') {
                createForm.setFieldsValue({
                    sessionName: `Xuất kho lần ${res.data.length + 1}`,
                    note: ''
                });
            }
        } catch (error) {
            messageApi.error('Không thể tải danh sách phiên quét xuất kho');
        } finally {
            setSessionLoading(false);
        }
    };

    // 3. Create Session Logic
    const handleCreateSession = async () => {
        if (!selectedExport) return;
        try {
            const values = await createForm.validateFields();
            const exportId = selectedExport.id || selectedExport._id;

            if (!exportId) return;

            setLoading(true);

            const res = await exportSessionService.create({
                exportId: exportId,
                sessionName: values.sessionName,
                note: values.note
            });

            messageApi.success('Đã tạo phiên mới');
            setModalVisible(false);

            const newSessionId = res.data?.id || res.data?._id;
            navigate(`/export/${exportId}/check?sessionId=${newSessionId}`);
        } catch (error) {
            messageApi.error('Lỗi tạo phiên hoặc vui lòng kiểm tra thông tin nhập');
        } finally {
            setLoading(false);
        }
    };

    // 4. Resume Session
    const handleResumeSession = (sessionId: string) => {
        if (!selectedExport) return;
        setModalVisible(false);
        const exportId = selectedExport.id || selectedExport._id;
        if (!exportId) return;
        navigate(`/export/${exportId}/check?sessionId=${sessionId}`);
    };

    // Filter Logic
    const handleFilter = () => {
        const values = filterForm.getFieldsValue();
        let result = [...data];

        if (values.keyword) {
            const k = values.keyword.toLowerCase();
            result = result.filter(item =>
                item.code.toLowerCase().includes(k) ||
                (item.exportName && item.exportName.toLowerCase().includes(k))
            );
        }
        if (values.status) {
            result = result.filter(item => item.status === values.status);
        }
        setFilteredData(result);
    };



    const columns: TableColumnsType<DeviceExport> = [
        {
            title: 'Mã phiếu xuất',
            dataIndex: 'code',
            width: 150,
            render: (text, record) => (
                <a onClick={() => handleOpenSelectModal(record)} className="font-medium text-blue-600 whitespace-nowrap block truncate">
                    {text}
                </a>
            ),
        },
        {
            title: 'Tên phiếu',
            dataIndex: 'exportName',
            key: 'exportName',
            render: (text: string) => <div className="truncate whitespace-nowrap max-w-[200px]" title={text}>{text}</div>
        },
        {
            title: 'Tiến độ',
            key: 'progress',
            render: (_: any, record: DeviceExport) => {
                const percent = record.totalQuantity > 0
                    ? Math.round(((record.totalItems || 0) / record.totalQuantity) * 100)
                    : 0;
                return (
                    <div className="w-[150px]">
                        <Progress percent={percent} size="small" />
                        <div className="text-xs text-gray-500">
                            {record.totalItems || 0} / {record.totalQuantity}
                        </div>
                    </div>
                );
            }
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => <div className="whitespace-nowrap">{getExportStatusTag(status as any)}</div>,
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => <span className="whitespace-nowrap">{dayjs(date).format('DD/MM/YYYY')}</span>,
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_: any, record: DeviceExport) => {
                // const isCompleteEnabled = (record.totalItems || 0) >= record.totalQuantity && record.status !== 'COMPLETED';

                return (
                    <Space>
                        <Button
                            type="primary"
                            ghost
                            size="small"
                            onClick={() => handleOpenSelectModal(record)}
                        >
                            Quét xuất kho
                        </Button>


                    </Space>
                );
            },
        },
    ];

    return (
        <div className="p-3">
            {contextHolder}
            {modalContextHolder}
            <Space align="center" className="mb-4">
                <Title level={3} className="!mb-0 !mt-0">Xuất kho - Quét MAC</Title>
                <Popover
                    title="Hướng dẫn"
                    content={
                        <div className="max-w-[400px]">
                            <Text>Chọn phiếu xuất để tiến hành quét MAC (Xuất kho thực tế):</Text>
                            <ul className="mt-2 mb-0 pl-5">
                                <li>
                                    <Text type="success">Đã duyệt (APPROVED):</Text> Phiếu đã được Ban Giám đốc duyệt, sẵn sàng xuất.
                                </li>
                                <li>
                                    <Text type="warning">Đang xuất (IN_PROGRESS):</Text> Phiếu đang thực hiện dở dang.
                                </li>
                            </ul>
                        </div>
                    }
                >
                    <InfoCircleOutlined className="text-gray-400 cursor-pointer text-lg hover:text-blue-500 transition-colors" />
                </Popover>
            </Space>

            <Card size="small" className="mb-4">
                <Form form={filterForm} layout="inline" onValuesChange={handleFilter}>
                    <Form.Item name="keyword">
                        <Input prefix={<SearchOutlined />} placeholder="Tìm mã phiếu, tên..." />
                    </Form.Item>
                    <Form.Item name="status">
                        <Select className="w-[150px]" placeholder="Trạng thái" allowClear>
                            <Select.Option value="APPROVED">Đã duyệt</Select.Option>
                            <Select.Option value="IN_PROGRESS">Đang xuất</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item>
                        <Button icon={<ReloadOutlined />} onClick={() => { filterForm.resetFields(); setFilteredData(data); }} />
                    </Form.Item>
                </Form>
            </Card>

            <Card styles={{ body: { padding: 0 } }} variant="borderless">
                <Table
                    columns={columns}
                    dataSource={filteredData}
                    rowKey={r => r.id || r._id || 'unknown'}
                    loading={loading}
                    pagination={{
                        pageSize: 12,
                        showSizeChanger: true,
                        showTotal: (total) => `Tổng ${total} phiếu`,
                    }}
                    className="border-0"
                />
            </Card>

            {/* MODAL CHỌN PHIÊN */}
            <Modal
                title={
                    selectedExport?.status === 'IN_PROGRESS' && !isCreating
                        ? 'Chọn phiên xuất kho hoặc tạo phiên mới'
                        : 'Tạo phiên xuất kho'
                }
                open={modalVisible}
                onCancel={() => {
                    setModalVisible(false);
                    setIsCreating(false);
                }}
                footer={
                    (selectedExport?.status === 'APPROVED' || isCreating) ? (
                        <div className="flex justify-end gap-2">
                            {(selectedExport?.status === 'IN_PROGRESS' && isCreating) && (
                                <Button onClick={() => setIsCreating(false)}>Hủy</Button>
                            )}
                            <Button type="primary" onClick={handleCreateSession}>Tạo phiên</Button>
                        </div>
                    ) : null
                }
                width={700}
            >
                {selectedExport && (
                    <div className="flex flex-col gap-4">
                        {/* INFO ALERT */}
                        <Alert
                            message={
                                <Space>
                                    <Text strong>Phiếu xuất: {selectedExport.code}</Text>
                                    {selectedExport.status === 'IN_PROGRESS' && <Tag color="processing">Đang xuất kho</Tag>}
                                </Space>
                            }
                            description={
                                <div className="mt-2 text-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Text type="secondary">Tên phiếu: </Text>
                                            <Text strong>{selectedExport.exportName}</Text>
                                        </div>
                                        <div>
                                            <Text type="secondary">Đơn vị nhận: </Text>
                                            <Text strong>{selectedExport.receiver}</Text>
                                        </div>
                                        <div>
                                            <Text type="secondary">Tổng số lượng: </Text>
                                            <Text strong>{selectedExport.totalQuantity}</Text>
                                        </div>
                                        {selectedExport.status === 'IN_PROGRESS' && (
                                            <div>
                                                <Text type="secondary">Mac đã quét: </Text>
                                                <Text strong>{sessions.reduce((acc, s) => acc + (s.items?.length || 0), 0)}</Text>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            }
                            type="info"
                            showIcon
                        />

                        {/* CONTENT LOGIC */}
                        {/* CASE 1: SHOW LIST */}
                        {(selectedExport.status === 'IN_PROGRESS' && !isCreating) && (
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <Text strong>Các phiên xuất kho hiện có:</Text>
                                </div>

                                <Spin spinning={sessionLoading}>
                                    <div className="max-h-[300px] overflow-y-auto flex flex-col gap-3 p-1">
                                        {!sessionLoading && sessions.length === 0 && <Alert message="Chưa có phiên nào." type="warning" />}

                                        {sessions.map(session => (
                                            <Card
                                                key={session.id || session._id}
                                                size="small"
                                                hoverable
                                                className="cursor-pointer bg-gray-50 border-gray-200"
                                                onClick={() => handleResumeSession(session.id || session._id)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <Text strong className="text-blue-700">{session.sessionName}</Text>
                                                            <Tag color={session.status === 'COMPLETED' ? 'green' : 'blue'}>
                                                                {session.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang thực hiện'}
                                                            </Tag>
                                                        </div>
                                                        <Text type="secondary" className="text-xs">
                                                            Tạo: {dayjs(session.createdAt).format('HH:mm DD/MM/YYYY')} • SL: {session.items?.length || 0}
                                                        </Text>
                                                        {session.note && <Text type="secondary" className="text-xs italic">"{session.note}"</Text>}
                                                    </div>
                                                    <Button
                                                        type={session.status === 'COMPLETED' ? 'default' : 'primary'}
                                                        size="small"
                                                    >
                                                        {session.status === 'COMPLETED' ? 'Xem' : 'Tiếp tục'}
                                                    </Button>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </Spin>

                                <Divider className="my-2" />

                                <Button
                                    type="dashed"
                                    block
                                    size="large"
                                    icon={<PlusOutlined />}
                                    onClick={() => {
                                        setIsCreating(true);
                                        // Auto-fill form
                                        createForm.setFieldsValue({
                                            sessionName: `Xuất kho lần ${sessions.length + 1} (${dayjs().format('DD/MM')})`,
                                            note: ''
                                        });
                                    }}
                                >
                                    Tạo phiên xuất kho mới
                                </Button>
                            </div>
                        )}

                        {/* CASE 2: SHOW FORM */}
                        {(selectedExport.status === 'APPROVED' || isCreating) && (
                            <Form form={createForm} layout="vertical">
                                <Form.Item
                                    name="sessionName"
                                    label="Tên phiên xuất kho"
                                    rules={[{ required: true, message: 'Vui lòng nhập tên phiên!' }]}
                                >
                                    <Input placeholder="VD: Xuất kho đợt 1..." />
                                </Form.Item>
                                <Form.Item name="note" label="Ghi chú">
                                    <Input.TextArea rows={3} placeholder="Ghi chú bổ sung..." />
                                </Form.Item>
                            </Form>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
