import { Card, Row, Col, Statistic, Divider, Progress } from 'antd';

interface ExportStatisticsProps {
    allScannedCount: number;
    originalTotalRequired: number;
    currentSessionMatchCount: number;
    totalRequiredForSession: number;
    missingCount: number;
}

export const ExportStatistics = ({
    allScannedCount,
    originalTotalRequired,
    currentSessionMatchCount,
    totalRequiredForSession,
    missingCount
}: ExportStatisticsProps) => {
    const isTotalComplete = allScannedCount >= originalTotalRequired;
    const isSessionComplete = currentSessionMatchCount >= totalRequiredForSession;

    return (
        <Card className="mb-2">
            <Row gutter={16}>
                <Col span={8}>
                    <Statistic
                        title="Tổng tiến độ"
                        value={`${allScannedCount}/${originalTotalRequired}`}
                        valueStyle={{ color: isTotalComplete ? '#52c41a' : '#1890ff' }}
                    />
                </Col>
                <Col span={8}>
                    <Statistic
                        title="Phiên này"
                        value={`${currentSessionMatchCount}/${totalRequiredForSession}`}
                        valueStyle={{ color: isSessionComplete ? '#52c41a' : '#faad14' }}
                    />
                </Col>
                <Col span={8}>
                    <Statistic
                        title="Còn thiếu"
                        value={missingCount}
                        valueStyle={{ color: missingCount === 0 ? '#52c41a' : '#ff4d4f' }}
                    />
                </Col>
            </Row>
            <Divider />
            <Progress
                percent={totalRequiredForSession > 0 ? Math.round((currentSessionMatchCount / totalRequiredForSession) * 100) : 0}
                status={isSessionComplete ? 'success' : 'active'}
            />
        </Card>
    );
};
