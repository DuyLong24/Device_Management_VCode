import { Card, Descriptions, Progress, Typography } from 'antd';
import dayjs from 'dayjs';
import { getExportStatusTag } from '../../utils/export-status.util';
import type { DeviceExport } from '../../types/export.type';

const { Text } = Typography;

interface ExportInfoCardProps {
    exportInfo: DeviceExport;
}

export const ExportInfoCard = ({ exportInfo }: ExportInfoCardProps) => {
    const serialExported = exportInfo.items?.length || 0;
    const serialExpected = exportInfo.totalQuantity || 0;
    const progress = serialExpected > 0 ? Math.round((serialExported / serialExpected) * 100) : 0;

    return (
        <Card title="Thông tin phiếu xuất" className="shadow-sm mb-6" bordered={false}>
            <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Mã phiếu">{exportInfo.code}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                    {getExportStatusTag(exportInfo.status)}
                </Descriptions.Item>
                <Descriptions.Item label="Tên phiếu" span={2}>
                    {exportInfo.exportName}
                </Descriptions.Item>
                <Descriptions.Item label="Loại">{exportInfo.type}</Descriptions.Item>
                <Descriptions.Item label="Lý do xuất">{exportInfo.exportReason}</Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">
                    {exportInfo.createdAt ? dayjs(exportInfo.createdAt).format('DD/MM/YYYY HH:mm') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Người tạo">{exportInfo.createdBy || '-'}</Descriptions.Item>

                {/* NEW FIELDS from Figma */}
                <Descriptions.Item label="Dự án" span={2}>
                    {exportInfo.project || <Text type="secondary">-</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Khách hàng">
                    {exportInfo.customer || <Text type="secondary">-</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Đơn vị nhận">{exportInfo.receiver || '-'}</Descriptions.Item>
                <Descriptions.Item label="Người nhận">
                    {exportInfo.receiverPerson || <Text type="secondary">-</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Địa chỉ giao hàng" span={2}>
                    {exportInfo.deliveryAddress || <Text type="secondary">-</Text>}
                </Descriptions.Item>

                {/* Progress tracking */}
                <Descriptions.Item label="Tiến độ xuất kho" span={2}>
                    <div>
                        <Progress
                            percent={progress}
                            status={serialExported === serialExpected && serialExpected > 0 ? 'success' : 'active'}
                        />
                        <Text>
                            Đã xuất: <Text strong>{serialExported}</Text> / {serialExpected} serial
                        </Text>
                    </div>
                </Descriptions.Item>

                {exportInfo.notes && (
                    <Descriptions.Item label="Ghi chú" span={2}>
                        {exportInfo.notes}
                    </Descriptions.Item>
                )}
            </Descriptions>
        </Card>
    );
};
