import React from 'react';
import { Card, Space, Typography, Tag, Button } from 'antd';
import { PlayCircleOutlined, FileExcelOutlined, InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

export interface InventorySession {
    id: string;
    sessionCode: string;
    status: 'pending' | 'processing' | 'in-progress' | 'completed' | 'cancelled';
    createdAt: string;
    createdBy: string;
    totalScanned: number;
    totalRequired: number;
    productCode?: string;
}

interface InventorySessionListProps {
    sessions: InventorySession[];
    importStatus: string;
    onContinue: (sessionId: string) => void;
    onExport: (sessionId: string) => void;
    onViewInfo: (sessionId: string) => void;
    onCreateNew: () => void;
}

export const InventorySessionList: React.FC<InventorySessionListProps> = ({
    sessions,
    importStatus,
    onContinue,
    onExport,
    onViewInfo,
    onCreateNew
}) => {
    const getStatusTag = (status: string) => {
        switch (status) {
            case 'completed': return <Tag color="success">Đã hoàn thành</Tag>;
            case 'processing':
            case 'in-progress': return <Tag color="processing">Đang kiểm kê</Tag>;
            case 'cancelled': return <Tag color="error">Đã hủy</Tag>;
            default: return <Tag color="default">Chưa bắt đầu</Tag>;
        }
    };

    return (
        <Card title="Thao tác kiểm kê" className="mb-4 shadow-sm">
            <Space direction="vertical" className="w-full" size="middle">
                {sessions.length > 0 ? (
                    <div>
                        <Text strong className="block mb-2">
                            Phiên kiểm kê hiện có:
                        </Text>
                        <Space direction="vertical" className="w-full" size="small">
                            {sessions.map((session) => (
                                <Card
                                    key={session.id}
                                    size="small"
                                    className="bg-gray-50"
                                >
                                    <Space direction="vertical" className="w-full" size={4}>
                                        <div className="flex justify-between items-center">
                                            <Space>
                                                <Text strong>{session.sessionCode}</Text>
                                                {getStatusTag(session.status)}
                                            </Space>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>
                                                {session.productCode ? `Mã SP: ${session.productCode} • ` : ''}
                                                {session.totalScanned}/{session.totalRequired} serial
                                            </span>
                                            <span>
                                                {dayjs(session.createdAt).format('DD/MM/YYYY HH:mm')} • {session.createdBy}
                                            </span>
                                        </div>

                                        <div className="mt-2">
                                            <Space size="small" wrap>
                                                {session.status !== 'completed' && (
                                                    <Button
                                                        size="small"
                                                        type="primary"
                                                        icon={<PlayCircleOutlined />}
                                                        onClick={() => onContinue(session.id)}
                                                    >
                                                        Tiếp tục
                                                    </Button>
                                                )}
                                                <Button
                                                    size="small"
                                                    icon={<FileExcelOutlined />}
                                                    onClick={() => onExport(session.id)}
                                                >
                                                    Xuất DS
                                                </Button>
                                                <Button
                                                    size="small"
                                                    icon={<InfoCircleOutlined />}
                                                    onClick={() => onViewInfo(session.id)}
                                                >
                                                    Thông tin
                                                </Button>
                                            </Space>
                                        </div>
                                    </Space>
                                </Card>
                            ))}
                        </Space>
                    </div>
                ) : (
                    <div className="text-center py-4 text-gray-500">
                        Chưa có phiên kiểm kê nào.
                    </div>
                )}

                {/* Button Tạo phiên mới - Chỉ hiển thị khi chưa hoàn thành kiểm kê tổng thể */}
                {importStatus !== 'completed' && (
                    <Button
                        block
                        icon={<PlusOutlined />}
                        onClick={onCreateNew}
                        className="mt-2"
                    >
                        Tạo phiên kiểm kê mới
                    </Button>
                )}
            </Space>
        </Card>
    );
};
