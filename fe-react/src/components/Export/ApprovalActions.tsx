import { Button, Space, Popconfirm } from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    SendOutlined,
    ScanOutlined,
    PrinterOutlined,
} from '@ant-design/icons';
import { EXPORT_STATUS, type ExportStatusType } from '../../constants/export-status.constant';

interface ApprovalActionsProps {
    status: ExportStatusType;
    exportId: string;
    onSubmit: () => Promise<void>;
    onApprove: () => Promise<void>;
    onReject: () => Promise<void>;
    onNavigateToScan: () => void;
}

export const ApprovalActions = ({
    status,
    onSubmit,
    onApprove,
    onReject,
    onNavigateToScan,
}: ApprovalActionsProps) => {
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

            {status === EXPORT_STATUS.PENDING_APPROVAL && (
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

            {(status === EXPORT_STATUS.APPROVED || status === EXPORT_STATUS.IN_PROGRESS) && (
                <Button type="primary" icon={<ScanOutlined />} onClick={onNavigateToScan}>
                    Quét Tuân Thủ (Scan)
                </Button>
            )}

            {status === EXPORT_STATUS.COMPLETED && (
                <Button icon={<PrinterOutlined />}>In phiếu</Button>
            )}
        </Space>
    );
};
