import { Alert } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

interface SessionPermissionAlertProps {
    // Loại session để hiển thị message phù hợp
    sessionType?: 'inventory' | 'export';
}

// Component Alert chung cho trường hợp thiếu quyền Session
export function SessionPermissionAlert({ sessionType = 'inventory' }: SessionPermissionAlertProps) {
    const messages = {
        inventory: 'Bạn không có quyền tạo phiên kiểm kê. Liên hệ quản trị viên để được cấp quyền.',
        export: 'Bạn không có quyền tạo phiên quét xuất kho. Liên hệ quản trị viên để được cấp quyền.',
    };

    return (
        <Alert
            message="Không có quyền"
            description={messages[sessionType]}
            type="error"
            showIcon
            icon={<InfoCircleOutlined />}
        />
    );
}
