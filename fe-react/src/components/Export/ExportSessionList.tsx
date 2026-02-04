import { Table, Tag, Button, Space, Typography } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

interface ExportSessionListProps {
    sessions: any[];
    onCreateSession: () => void;
    onContinueSession: (sessionId: string) => void;
    canCreate: boolean;
}

export const ExportSessionList = ({ sessions, onCreateSession, onContinueSession, canCreate }: ExportSessionListProps) => {
    const columns = [
        {
            title: 'Mã phiên',
            dataIndex: 'sessionCode',
            key: 'sessionCode',
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: 'Tên phiên',
            dataIndex: 'sessionName',
            key: 'sessionName',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                let color = 'default';
                let label = status;

                switch (status) {
                    case 'IN_PROGRESS': color = 'processing'; label = 'Đang thực hiện'; break;
                    case 'COMPLETED': color = 'success'; label = 'Hoàn thành'; break;
                    case 'CANCELLED': color = 'error'; label = 'Đã hủy'; break;
                }

                return <Tag color={color}>{label}</Tag>;
            }
        },
        {
            title: 'Đã quét',
            dataIndex: 'serialChecked',
            key: 'serialChecked',
            align: 'center' as const,
            render: (value: number) => <Text strong>{value}</Text>
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm')
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_: any, record: any) => (
                <Space>
                    {record.status === 'IN_PROGRESS' && (
                        <Button type="primary" size="small" onClick={() => onContinueSession(record._id || record.id)}>
                            Tiếp tục
                        </Button>
                    )}
                </Space>
            )
        }
    ];

    return (
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 mt-3">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Danh sách phiên xuất kho</h3>
                {canCreate && (
                    <Button type="primary" onClick={onCreateSession}>
                        + Tạo phiên mới
                    </Button>
                )}
            </div>
            <Table
                columns={columns}
                dataSource={sessions}
                rowKey={(r) => r.id || r._id}
                pagination={false}
                locale={{ emptyText: 'Chưa có phiên xuất kho nào' }}
            />
        </div>
    );
};
