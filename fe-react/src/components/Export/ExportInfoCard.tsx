import { Card, Descriptions, Progress, Typography, Statistic, Row, Col, Tag, Table } from 'antd';
import dayjs from 'dayjs';
import { getExportStatusTag } from '../../utils/export-status.util';
import type { DeviceExport } from '../../types/export.type';

const { Text } = Typography;

interface ExportInfoCardProps {
    exportInfo: DeviceExport;
    projectName?: string;
}

export const ExportInfoCard = ({ exportInfo, projectName }: ExportInfoCardProps) => {
    const totalExported = exportInfo.items?.length || 0;
    const totalExpected = exportInfo.totalQuantity || 0;
    const progress = totalExpected > 0 ? Math.round((totalExported / totalExpected) * 100) : 0;

    return (
        <>
            {/* Card 1: Thông tin phiếu xuất kho */}
            <Card title="Thông tin phiếu xuất kho" className="shadow-sm mb-6" variant="borderless">
                <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="Mã phiếu xuất">
                        <Text strong>{exportInfo.code}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Tên phiếu xuất">
                        <Text strong>{exportInfo.exportName}</Text>
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
                    <Descriptions.Item label="Người tạo phiếu">
                        {exportInfo.createdBy?.username || exportInfo.createdBy?.name || exportInfo.createdBy || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Đơn vị nhận">{exportInfo.receiver || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Người nhận">
                        {exportInfo.receiverPerson || <Text type="secondary">-</Text>}
                    </Descriptions.Item>
                    <Descriptions.Item label="Trạng thái duyệt">
                        {getExportStatusTag(exportInfo.status)}
                    </Descriptions.Item>
                    {exportInfo.approvedBy && (
                        <>
                            <Descriptions.Item label="Người duyệt">
                                {exportInfo.approvedBy?.username || exportInfo.approvedBy?.name || exportInfo.approvedBy}
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngày duyệt">
                                {exportInfo.approvedDate ? dayjs(exportInfo.approvedDate).format('DD/MM/YYYY HH:mm') : '-'}
                            </Descriptions.Item>
                        </>
                    )}
                    <Descriptions.Item label="Dự án">
                        {projectName || exportInfo.project || <Text type="secondary">-</Text>}
                    </Descriptions.Item>
                    <Descriptions.Item label="Khách hàng">
                        {exportInfo.customer || <Text type="secondary">-</Text>}
                    </Descriptions.Item>
                    <Descriptions.Item label="Địa chỉ giao hàng">
                        {exportInfo.deliveryAddress || <Text type="secondary">-</Text>}
                    </Descriptions.Item>
                    <Descriptions.Item
                        label={<Text strong>Yêu cầu thiết bị</Text>}
                        span={2}
                        className="requirements-row"
                    >
                        <div className="requirements-wrapper">
                            <div className="flex justify-end mb-2">
                                <Text type="secondary">
                                    Tổng SL:{' '}
                                    {exportInfo.requirements?.reduce(
                                        (s: number, r: any) => s + r.quantity,
                                        0
                                    ) || 0}
                                </Text>
                            </div>

                            <Table
                                dataSource={exportInfo.requirements?.map((req: any) => ({
                                    key: req.deviceCode || req._id,
                                    deviceCode: req.deviceCode,
                                    deviceName: req.deviceName,
                                    quantity: req.quantity
                                })) || []}
                                columns={[
                                    {
                                        title: 'Model',
                                        dataIndex: 'deviceCode',
                                        render: (t: string) => (
                                            <Text strong className="font-mono text-blue-600">
                                                {t}
                                            </Text>
                                        )
                                    },
                                    {
                                        title: 'Thiết bị',
                                        dataIndex: 'deviceName'
                                    },
                                    {
                                        title: 'SL',
                                        dataIndex: 'quantity',
                                        align: 'center',
                                        width: 80,
                                        render: (q: number) => <Text strong>{q}</Text>
                                    }
                                ]}
                                pagination={false}
                                bordered={false}
                                size="small"
                                locale={{ emptyText: 'Chưa có yêu cầu thiết bị' }}
                            />
                        </div>
                    </Descriptions.Item>



                    <Descriptions.Item label="Ghi chú">
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
                            title="Mac đã chọn"
                            value={totalExported}
                            suffix={`/ ${totalExpected}`}
                            valueStyle={{
                                color: totalExported === totalExpected ? '#52c41a' : '#ff4d4f',
                            }}
                        />
                    </Col>
                </Row>
                <div className="my-4 h-px bg-gray-100" />
                <Progress
                    percent={progress}
                    status={totalExported < totalExpected ? 'active' : 'success'}
                    strokeColor={totalExported < totalExpected ? undefined : '#52c41a'}
                />
            </Card>
        </>
    );
};
