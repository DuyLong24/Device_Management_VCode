import { Button, Typography, Space, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

import { useExportDetail } from '../../hooks/useExportDetail';
import { ExportInfoCard } from '../../components/Export/ExportInfoCard';
// import { RequirementsTable } from '../../components/Export/RequirementsTable';
import { ActualItemsTable } from '../../components/Export/ActualItemsTable';
import { ApprovalActions } from '../../components/Export/ApprovalActions';

const { Title } = Typography;

export default function ExportDetailPage() {
    const {
        exportInfo,
        loading,
        id,
        handleSubmit,
        handleApprove,
        handleReject,
        handleNavigateToScan,
        handleBackToList,
    } = useExportDetail();

    if (loading || !exportInfo) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Spin size="large" tip="Đang tải dữ liệu..." />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-4 flex justify-between items-center">
                <Space>
                    <Button icon={<ArrowLeftOutlined />} onClick={handleBackToList}>
                        Danh sách
                    </Button>
                    <Title level={4} style={{ margin: 0 }}>
                        Chi tiết phiếu xuất: {exportInfo.code}
                    </Title>
                </Space>

                <ApprovalActions
                    status={exportInfo.status}
                    exportId={id || ''}
                    onSubmit={handleSubmit}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onNavigateToScan={handleNavigateToScan}
                />
            </div>

            {/* Thông tin phiếu xuất */}
            <ExportInfoCard exportInfo={exportInfo} />

            {/* Bảng yêu cầu */}
            {/* {exportInfo.requirements && exportInfo.requirements.length > 0 && (
                <RequirementsTable requirements={exportInfo.requirements} items={exportInfo.items || []} />
            )} */}

            {/* Bảng thiết bị */}
            <ActualItemsTable items={exportInfo.items || []} />
        </div>
    );
}
