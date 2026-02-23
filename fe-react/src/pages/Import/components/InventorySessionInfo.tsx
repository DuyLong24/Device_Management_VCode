import { Card, Descriptions, Tag } from 'antd';
import { INVENTORY_LABELS } from '../../../constants/inventory.constants';

interface InventorySessionInfoProps {
    sessionInfo: {
        importCode: string;
        sessionCode: string;
        importDate: string;
        importedBy: string;
        deviceType: string;
        supplier: string;
        createdBy: string;
        createdAt: string;
    };
    sessionStatus: 'init' | 'in-progress' | 'completed';
}

export const InventorySessionInfo = ({ sessionInfo, sessionStatus }: InventorySessionInfoProps) => {
    return (
        <Card title={INVENTORY_LABELS.SESSION_INFO} className="h-full shadow-sm">
            <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label={INVENTORY_LABELS.IMPORT_TICKET}>{sessionInfo.importCode}</Descriptions.Item>
                <Descriptions.Item label={INVENTORY_LABELS.SESSION_CODE}>{sessionInfo.sessionCode}</Descriptions.Item>
                <Descriptions.Item label="Ngày nhập">{sessionInfo.importDate}</Descriptions.Item>
                <Descriptions.Item label="Người nhập kho">{sessionInfo.importedBy}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                    <Tag color={sessionStatus === 'in-progress' ? 'processing' : sessionStatus === 'init' ? 'default' : 'success'}>
                        {sessionStatus === 'init' ? 'Chưa bắt đầu' : sessionStatus === 'in-progress' ? 'Đang kiểm kê' : 'Đã hoàn tất'}
                    </Tag>
                </Descriptions.Item>
            </Descriptions>
        </Card>
    );
};
