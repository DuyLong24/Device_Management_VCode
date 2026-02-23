import { Card, Descriptions } from 'antd';
import dayjs from 'dayjs';
import { getExportStatusTag } from '../../../utils/export-status.util';
import type { DeviceExport } from '../../../types/export.type';

interface ExportSessionInfoProps {
    sessionCode?: string;
    exportInfo: DeviceExport;
    createdBy?: {
        username?: string;
        name?: string;
    };
}

export const ExportSessionInfo = ({ sessionCode, exportInfo, createdBy }: ExportSessionInfoProps) => {
    return (
        <Card title="Thông tin phiên xuất kho" className="h-full">
            <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Mã phiên">{sessionCode}</Descriptions.Item>
                <Descriptions.Item label="Mã phiếu xuất">{exportInfo.code}</Descriptions.Item>
                <Descriptions.Item label="Ngày xuất">{dayjs(exportInfo.exportDate).format('DD/MM/YYYY')}</Descriptions.Item>
                <Descriptions.Item label="Người tạo">{createdBy?.username || createdBy?.name || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái">{getExportStatusTag(exportInfo.status)}</Descriptions.Item>
            </Descriptions>
        </Card>
    );
};
