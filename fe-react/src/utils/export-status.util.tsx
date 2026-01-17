import { Tag } from 'antd';
import {
    EXPORT_STATUS,
    EXPORT_STATUS_LABELS,
    EXPORT_STATUS_COLORS,
    type ExportStatusType
} from '../constants/export-status.constant';
import {
    FileTextOutlined,
    SyncOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';

/**
 * Helper utility để render status tag với icon và color đúng
 * Tái sử dụng trong List và Detail pages
 */
export const getExportStatusTag = (status: ExportStatusType) => {
    const color = EXPORT_STATUS_COLORS[status] || 'default';
    const label = EXPORT_STATUS_LABELS[status] || status;

    let icon = <FileTextOutlined />;
    const spinningStatuses: ExportStatusType[] = [EXPORT_STATUS.PENDING_APPROVAL, EXPORT_STATUS.IN_PROGRESS];
    const completedStatuses: ExportStatusType[] = [EXPORT_STATUS.APPROVED, EXPORT_STATUS.COMPLETED];

    if (spinningStatuses.includes(status)) {
        icon = <SyncOutlined spin />;
    } else if (completedStatuses.includes(status)) {
        icon = <CheckCircleOutlined />;
    }

    return <Tag color={color} icon={icon}>{label}</Tag>;
};
