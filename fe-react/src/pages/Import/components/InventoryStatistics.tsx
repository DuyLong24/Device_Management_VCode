import { Card, Row, Col, Statistic, Divider, Progress } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { INVENTORY_LABELS } from '../../../constants/inventory.constants';

interface InventoryStatisticsProps {
    stats: {
        totalRequired: number;
        scannedCount: number;
        matchCount: number;
        missingCount: number;
        excessCount: number;
        duplicateCount: number;
    };
}

export const InventoryStatistics = ({ stats }: InventoryStatisticsProps) => {
    return (
        <Card className="h-full shadow-sm">
            <Row gutter={[16, 16]}>
                <Col xs={12} sm={8} md={6}>
                    <Statistic title="Tổng cần kiểm" value={stats.totalRequired} />
                </Col>
                <Col xs={12} sm={8} md={6}>
                    <Statistic
                        title={INVENTORY_LABELS.TOTAL_SCANNED}
                        value={stats.scannedCount}
                        valueStyle={{ color: '#1890ff' }}
                    />
                </Col>
                <Col xs={12} sm={8} md={6}>
                    <Statistic title="Khớp" value={stats.matchCount} valueStyle={{ color: '#52c41a' }} suffix={`/ ${stats.totalRequired}`} />
                </Col>
                <Col xs={12} sm={8} md={6}>
                    <Statistic title="Còn thiếu" value={stats.missingCount} valueStyle={{ color: '#ff4d4f' }} />
                </Col>
                {stats.excessCount > 0 && (
                    <Col xs={12} sm={8} md={6}>
                        <Statistic title="Thừa" value={stats.excessCount} valueStyle={{ color: '#faad14' }} />
                    </Col>
                )}
                {stats.duplicateCount > 0 && (
                    <Col xs={12} sm={8} md={6}>
                        <Statistic title="Lỗi Trùng" value={stats.duplicateCount} valueStyle={{ color: '#cf1322' }} prefix={<WarningOutlined />} />
                    </Col>
                )}
            </Row>
            <Divider className="my-4" />
            <Progress
                percent={stats.totalRequired > 0 ? Math.round((stats.matchCount / stats.totalRequired) * 100) : 0}
                status={stats.matchCount === stats.totalRequired ? 'success' : 'active'}
                strokeLinecap="square"
            />
        </Card>
    );
};
