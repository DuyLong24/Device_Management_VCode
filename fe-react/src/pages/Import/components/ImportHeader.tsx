import React from 'react';
import { Button, Space, Typography, Tag } from 'antd';
import {
    PrinterOutlined,
    EditOutlined,
    DeleteOutlined,
    ArrowLeftOutlined
} from '@ant-design/icons';
import { IMPORT_STATUS_CONFIG } from '../../../constants/import.constants';

const { Title, Text } = Typography;

interface ImportHeaderProps {
    code: string;
    inventoryStatus: string;
    status?: string; // [NEW]
    onBack: () => void;
    onPrint: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export const ImportHeader: React.FC<ImportHeaderProps> = ({
    code,
    inventoryStatus,
    status,
    onBack,
    onPrint,
    onEdit,
    onDelete
}) => {
    const statusConfig = IMPORT_STATUS_CONFIG[inventoryStatus as keyof typeof IMPORT_STATUS_CONFIG]
        || { color: 'default', text: inventoryStatus };

    return (
        <div className="mb-6">
            <Space className="mb-4">
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={onBack}
                >
                    Quay lại danh sách
                </Button>
            </Space>
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Title level={3} className="!m-0">
                            Chi tiết phiếu nhập kho
                        </Title>
                    </div>

                    <Space>
                        <Text strong className="text-base">
                            {code}
                        </Text>
                        {status === 'DRAFT' ? (
                            <Tag color="default" className="text-base px-3 py-0.5">NHÁP (DRAFT)</Tag>
                        ) : (
                            <Tag color={statusConfig.color}>
                                {statusConfig.text}
                            </Tag>
                        )}
                    </Space>
                </div>

                <Space>
                    <Button icon={<PrinterOutlined />} onClick={onPrint}>In phiếu</Button>
                    <Button icon={<EditOutlined />} onClick={onEdit}>Sửa</Button>
                    <Button danger icon={<DeleteOutlined />} onClick={onDelete}>Xóa</Button>
                </Space>
            </div>
        </div>
    );
};
