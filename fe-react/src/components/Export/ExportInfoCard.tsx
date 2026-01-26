import { Card, Descriptions, Progress, Typography, Statistic, Row, Col, Tag } from 'antd';
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
        <>
            {/* Card 1: Thông tin phiếu xuất kho */}
            <Card title="Thông tin phiếu xuất kho" className="shadow-sm mb-6" variant="borderless">
                <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="Mã phiếu xuất">
                        <Text strong>{exportInfo.code}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Loại hàng hóa">
                        <Tag color="blue">{exportInfo.type}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Lý do xuất kho">
                        <Tag color="blue">{exportInfo.exportReason}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày xuất">
                        {exportInfo.createdAt ? dayjs(exportInfo.createdAt).format('DD/MM/YYYY') : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Người tạo phiếu">{exportInfo.createdBy || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Đơn vị nhận">{exportInfo.receiver || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Người nhận">
                        {exportInfo.receiverPerson || <Text type="secondary">-</Text>}
                    </Descriptions.Item>
                    <Descriptions.Item label="Trạng thái duyệt">
                        {getExportStatusTag(exportInfo.status)}
                    </Descriptions.Item>
                    {exportInfo.approvedBy && (
                        <>
                            <Descriptions.Item label="Người duyệt">{exportInfo.approvedBy}</Descriptions.Item>
                            <Descriptions.Item label="Ngày duyệt">
                                {exportInfo.approvedDate ? dayjs(exportInfo.approvedDate).format('DD/MM/YYYY HH:mm') : '-'}
                            </Descriptions.Item>
                        </>
                    )}
                    <Descriptions.Item label="Dự án" span={2}>
                        {exportInfo.project || <Text type="secondary">-</Text>}
                    </Descriptions.Item>
                    <Descriptions.Item label="Khách hàng" span={2}>
                        {exportInfo.customer || <Text type="secondary">-</Text>}
                    </Descriptions.Item>
                    <Descriptions.Item label="Địa chỉ giao hàng" span={2}>
                        {exportInfo.deliveryAddress || <Text type="secondary">-</Text>}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ghi chú" span={2}>
                        {exportInfo.notes || <Text type="secondary">Không có ghi chú</Text>}
                    </Descriptions.Item>
                </Descriptions>
            </Card>

            {/* Card 2: Tổng quan */}
            <Card title="Tổng quan" className="shadow-sm mb-6" variant="borderless">
                <Row gutter={16}>
                    <Col xs={12} sm={8}>
                        <Statistic title="Tổng mã thiết bị" value={exportInfo.totalDeviceCodes || 0} />
                    </Col>
                    <Col xs={12} sm={8}>
                        <Statistic title="Tổng số lượng" value={exportInfo.totalQuantity || 0} />
                    </Col>
                    <Col xs={24} sm={8}>
                        <Statistic
                            title="Serial đã chọn"
                            value={serialExported}
                            suffix={`/ ${serialExpected}`}
                            valueStyle={{
                                color: serialExported === serialExpected ? '#52c41a' : '#ff4d4f',
                            }}
                        />
                    </Col>
                </Row>
                <div className="my-4 h-px bg-gray-100" />
                <Progress
                    percent={progress}
                    status={serialExported < serialExpected ? 'active' : 'success'}
                    strokeColor={serialExported < serialExpected ? undefined : '#52c41a'}
                />
            </Card>
        </>
    );
};
