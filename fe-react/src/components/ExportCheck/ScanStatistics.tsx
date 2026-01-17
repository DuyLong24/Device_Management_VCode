import { Card, Row, Col, Statistic } from 'antd';
import {
    CheckCircleOutlined,
    WarningOutlined,
    CloseCircleOutlined,
    ExclamationCircleOutlined,
} from '@ant-design/icons';

interface ScanStatisticsProps {
    scannedCount: number;
    missingCount: number;
    excessCount: number;
    alreadyExportedCount: number;
    totalRequired: number;
}

export const ScanStatistics = ({
    scannedCount,
    missingCount,
    excessCount,
    alreadyExportedCount,
    totalRequired,
}: ScanStatisticsProps) => {
    return (
        <Card className="mb-4">
            <Row gutter={16}>
                <Col xs={12} sm={12} md={6}>
                    <Statistic
                        title="Đã quét (khớp)"
                        value={scannedCount}
                        prefix={<CheckCircleOutlined />}
                        valueStyle={{ color: '#52c41a' }}
                        suffix={`/ ${totalRequired}`}
                    />
                </Col>
                <Col xs={12} sm={12} md={6}>
                    <Statistic
                        title="Còn thiếu"
                        value={missingCount}
                        prefix={<WarningOutlined />}
                        valueStyle={{ color: '#faad14' }}
                    />
                </Col>
                <Col xs={12} sm={12} md={6}>
                    <Statistic
                        title="Serial thừa"
                        value={excessCount}
                        prefix={<ExclamationCircleOutlined />}
                        valueStyle={{ color: '#ff7a45' }}
                    />
                </Col>
                <Col xs={12} sm={12} md={6}>
                    <Statistic
                        title="Đã xuất rồi"
                        value={alreadyExportedCount}
                        prefix={<CloseCircleOutlined />}
                        valueStyle={{ color: '#ff4d4f' }}
                    />
                </Col>
            </Row>
        </Card>
    );
};
