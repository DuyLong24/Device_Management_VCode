import { Button, Space, Popconfirm, Tooltip } from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    SendOutlined,
    PrinterOutlined,
} from '@ant-design/icons';
import { EXPORT_STATUS, type ExportStatusType } from '../../constants/export-status.constant';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSION_KEYS } from '../../constants/permissionKeys';

interface ApprovalActionsProps {
    status: ExportStatusType;
    exportId: string;
    onSubmit: () => Promise<void>;
    onApprove: () => Promise<void>;
    onReject: () => Promise<void>;
    onExport?: () => void;
    // onNavigateToScan: () => void;
    canApprove?: boolean;
}

export const ApprovalActions = ({
    status,
    onSubmit,
    onApprove,
    onReject,
    onExport,
    canApprove = false
}: ApprovalActionsProps) => {
    const { hasPermission } = useAuth();
    const canExport = hasPermission(PERMISSION_KEYS.EXPORT.LIST.EXPORT);

    const handleRejectClick = () => {
        onReject();
    };

    return (
        <Space>
            {status === EXPORT_STATUS.DRAFT && (
                <Button type="primary" icon={<SendOutlined />} onClick={onSubmit}>
                    Gửi duyệt
                </Button>
            )}

            {status === EXPORT_STATUS.PENDING_APPROVAL && canApprove && (
                <>
                    <Button danger icon={<CloseCircleOutlined />} onClick={handleRejectClick}>
                        Từ chối
                    </Button>
                    <Popconfirm
                        title="Duyệt phiếu xuất kho?"
                        description="Bạn xác nhận duyệt phiếu này để bắt đầu xuất kho."
                        onConfirm={onApprove}
                        okText="Duyệt"
                        cancelText="Hủy"
                        okButtonProps={{ className: 'bg-green-600' }}
                    >
                        <Button
                            type="primary"
                            className="bg-green-600"
                            icon={<CheckCircleOutlined />}
                        >
                            Duyệt
                        </Button>
                    </Popconfirm>
                </>
            )}

            {(status === EXPORT_STATUS.APPROVED ||
                status === EXPORT_STATUS.IN_PROGRESS ||
                status === EXPORT_STATUS.COMPLETED) && (
                    <Tooltip title={!canExport ? 'Bạn không có quyền xuất file' : 'Xuất phiếu xuất kho (PDF)'}>
                        <Button
                            icon={<PrinterOutlined />}
                            disabled={!canExport}
                            onClick={onExport}
                        >
                            Xuất PDF
                        </Button>
                    </Tooltip>
                )}
        </Space>
    );
};
