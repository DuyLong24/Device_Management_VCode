import React from 'react';
import { Card, Space, Typography, Tag, Button } from 'antd';
import { PlayCircleOutlined, InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSessionPermission } from '../../../hooks/useSessionPermission';
import { SessionPermissionAlert } from '../../../components/permissions/SessionPermissionAlert';
import { IMPORT_INVENTORY_CHECK } from '../../../constants/permissionKeys';


const { Text } = Typography;

export interface InventorySession {
    id: string;
    sessionCode: string;
    status: 'pending' | 'processing' | 'in-progress' | 'completed' | 'cancelled';
    createdAt: string;
    createdBy: string;
    totalScanned: number;
    totalRequired: number;
    deviceCode?: string;
}

interface InventorySessionListProps {
    sessions: InventorySession[];
    importStatus: string;
    ticketStatus: string;
    onContinue: (sessionId: string) => void;
    onExport: (sessionId: string) => void;
    onViewInfo: (sessionId: string) => void;
    onCreateNew: () => void;
}

export const InventorySessionList: React.FC<InventorySessionListProps> = ({
    sessions,
    importStatus,
    ticketStatus,
    onContinue,
    onCreateNew
}) => {
    const { canAccess: canManageSession } = useSessionPermission(IMPORT_INVENTORY_CHECK);

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
                {/* ... existing sessions list ... */}
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
                                                {session.deviceCode ? `Mã Model: ${session.deviceCode} • ` : ''}
                                                {session.totalScanned}/{session.totalRequired} MAC
                                            </span>
                                            <span>
                                                {dayjs(session.createdAt).format('DD/MM/YYYY HH:mm')} • {session.createdBy}
                                            </span>
                                        </div>

                                        <div className="mt-2">
                                            <Space size="small" wrap>
                                                {session.status !== 'completed' && canManageSession && (
                                                    <Button
                                                        size="small"
                                                        type="primary"
                                                        icon={<PlayCircleOutlined />}
                                                        onClick={() => onContinue(session.id)}
                                                    >
                                                        Tiếp tục
                                                    </Button>
                                                )}
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

                {/* Hiện thị nút tạo phiên khi: phiếu chưa hoàn thành, trạng thái PUBLIC, và có quyền */}
                {importStatus !== 'completed' && ticketStatus === 'PUBLIC' && canManageSession && (
                    <Button
                        block
                        icon={<PlusOutlined />}
                        onClick={onCreateNew}
                        className="mt-2"
                    >
                        Tạo phiên kiểm kê mới
                    </Button>
                )}
                {/* Thông báo khi phiếu ở trạng thái NHaacute;P */}
                {ticketStatus === 'DRAFT' && (
                    <div className="text-center text-amber-600 mt-2 bg-amber-50 p-2 rounded border border-amber-200">
                        <InfoCircleOutlined className="mr-2" />
                        Phiếu đang ở trạng thái NHÁP. Không thể tạo phiên kiểm kê.
                    </div>
                )}

                {/* Hiện thị lỗi khi thiếu quyền */}
                {!canManageSession && importStatus !== 'completed' && ticketStatus === 'PUBLIC' && (
                    <SessionPermissionAlert sessionType="inventory" />
                )}
            </Space>
        </Card>
    );
};
