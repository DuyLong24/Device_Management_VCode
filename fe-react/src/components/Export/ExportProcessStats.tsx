import { Card, Statistic, Progress } from 'antd';

interface ExportProcessStatsProps {
    totalQty: number;
    totalScanned: number;
    missingQty: number;
}

export const ExportProcessStats = ({ totalQty, totalScanned, missingQty }: ExportProcessStatsProps) => {
    const progressPercent = totalQty > 0 ? Math.round((totalScanned / totalQty) * 100) : 0;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card bordered={false} className="shadow-sm text-center">
                <Statistic title="Tổng cần xuất" value={totalQty} valueStyle={{ color: '#1677ff' }} />
            </Card>
            <Card bordered={false} className="shadow-sm text-center">
                <Statistic title="Đã quét (Tổng)" value={totalScanned} valueStyle={{ color: '#52c41a' }} suffix={`/ ${totalQty}`} />
            </Card>
            <Card bordered={false} className="shadow-sm text-center">
                <Statistic title="Còn thiếu" value={missingQty} valueStyle={{ color: '#faad14' }} />
            </Card>
            <Card bordered={false} className="shadow-sm flex items-center justify-center p-2">
                <div className="w-full text-center">
                    {/* <Text type="secondary" className="block mb-1 text-xs">Tiến độ</Text> */}
                    <Progress type="circle" percent={progressPercent} width={50} />
                </div>
            </Card>
        </div>
    );
};
