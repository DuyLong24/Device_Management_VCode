import { Typography, Button, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

import { useExportCheck } from '../../hooks/useExportCheck';
import { ExportSelectionTable } from '../../components/ExportCheck/ExportSelectionTable';
import { ScanStatistics } from '../../components/ExportCheck/ScanStatistics';
import { ScanInput } from '../../components/ExportCheck/ScanInput';
import { SerialCheckResultsTable } from '../../components/ExportCheck/SerialCheckResultsTable';

const { Title } = Typography;

export default function ExportCheckPage() {
    const {
        currentStep,
        selectedExport,
        serialData,
        exportRecords,
        loading,
        handleSelectExport,
        handleScan,
        handleBackToSelection,
        handleBackToList,
        handleCompleteExport,
        getStatistics,
    } = useExportCheck();

    const stats = currentStep === 'check' ? getStatistics() : null;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-4 flex justify-between items-center">
                <Space>
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => (currentStep === 'select' ? handleBackToList() : handleBackToSelection())}
                    >
                        {currentStep === 'select' ? 'Danh sách xuất' : 'Chọn phiếu khác'}
                    </Button>
                    <Title level={3} style={{ margin: 0 }}>
                        {currentStep === 'select' ? 'Quét Tuân Thủ - Chọn Phiếu Xuất' : `Quét Serial - ${selectedExport?.exportCode}`}
                    </Title>
                </Space>

                {currentStep === 'check' && stats && (
                    <Button
                        type="primary"
                        size="large"
                        disabled={stats.missingCount > 0}
                        onClick={handleCompleteExport}
                        loading={loading}
                    >
                        Hoàn tất xuất kho ({stats.scannedCount}/{stats.totalRequired})
                    </Button>
                )}
            </div>

            {/* Step 1: Chọn phiếu xuất */}
            {currentStep === 'select' && (
                <ExportSelectionTable exports={exportRecords} onSelectExport={handleSelectExport} loading={loading} />
            )}

            {/* Step 2: Quét serial */}
            {currentStep === 'check' && stats && (
                <>
                    <ScanStatistics
                        scannedCount={stats.scannedCount}
                        missingCount={stats.missingCount}
                        excessCount={stats.excessCount}
                        alreadyExportedCount={stats.alreadyExportedCount}
                        totalRequired={stats.totalRequired}
                    />

                    <ScanInput onScan={handleScan} />

                    <SerialCheckResultsTable serialData={serialData} />
                </>
            )}
        </div>
    );
}
