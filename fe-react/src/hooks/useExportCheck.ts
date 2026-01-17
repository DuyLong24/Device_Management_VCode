import { useState } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';

const mockExportRecords = [
    {
        key: '1',
        exportCode: 'PX-2026-001',
        productType: 'Camera',
        exportDate: '2026-01-05',
        exportedBy: 'Hoàng Văn E',
        receiver: 'Công ty ABC',
        project: 'Dự án Camera An ninh',
        customer: 'Công ty CP ABC',
        totalQuantity: 3,
        totalSerials: 0,
        exportStatus: 'approved' as const,
    },
    {
        key: '2',
        exportCode: 'PX-2026-002',
        productType: 'Camera',
        exportDate: '2026-01-06',
        exportedBy: 'Hoàng Văn E',
        receiver: 'Khách hàng ABC',
        totalQuantity: 120,
        totalSerials: 0,
        exportStatus: 'approved' as const,
    },
];

const mockSerialData = [
    {
        key: '1',
        productCode: 'CAM-IN-001',
        productName: 'Camera Indoor 2MP',
        serial: 'CAM-IN-001-000001',
        systemStatus: 'Đã nhập kho',
    },
    {
        key: '2',
        productCode: 'CAM-IN-001',
        productName: 'Camera Indoor 2MP',
        serial: 'CAM-IN-001-000002',
        systemStatus: 'Đã nhập kho',
    },
    {
        key: '3',
        productCode: 'CAM-IN-001',
        productName: 'Camera Indoor 2MP',
        serial: 'CAM-IN-001-000003',
        systemStatus: 'Đã xuất kho',
    },
];

type CheckResult = 'match' | 'missing' | 'excess' | 'already_exported' | 'not_in_stock';

interface SerialItem {
    key: string;
    productCode: string;
    productName: string;
    serial: string;
    systemStatus: string;
    checkResult?: CheckResult;
    note?: string;
}

export const useExportCheck = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState<'select' | 'check'>('select');
    const [selectedExport, setSelectedExport] = useState<any>(null);
    const [serialData, setSerialData] = useState<SerialItem[]>([]);

    const handleSelectExport = (record: any) => {
        setSelectedExport(record);
        setSerialData(mockSerialData);
        setCurrentStep('check');
        message.success(`Đã chọn phiếu ${record.exportCode}. Bắt đầu quét serial...`);
    };

    const validateSerial = (serial: string): { valid: boolean; result: CheckResult; message: string } => {
        const expectedSerial = serialData.find((s) => s.serial === serial && !s.checkResult);

        if (!expectedSerial) {
            const alreadyScanned = serialData.find((s) => s.serial === serial && s.checkResult === 'match');
            if (alreadyScanned) {
                return {
                    valid: false,
                    result: 'excess',
                    message: `Serial ${serial} đã được quét rồi!`,
                };
            }
            return {
                valid: false,
                result: 'excess',
                message: `Serial ${serial} KHÔNG thuộc phiếu xuất này!`,
            };
        }

        if (expectedSerial.systemStatus === 'Đã xuất kho') {
            return {
                valid: false,
                result: 'already_exported',
                message: `Serial ${serial} ĐÃ XUẤT KHO RỒI!`,
            };
        }

        if (expectedSerial.systemStatus !== 'Đã nhập kho') {
            return {
                valid: false,
                result: 'not_in_stock',
                message: `Serial ${serial} KHÔNG trong kho!`,
            };
        }

        return {
            valid: true,
            result: 'match',
            message: `Serial ${serial} hợp lệ`,
        };
    };

    const handleScan = (serial: string) => {
        const validation = validateSerial(serial);

        setSerialData((prev) =>
            prev.map((item) => {
                if (item.serial === serial && !item.checkResult) {
                    return {
                        ...item,
                        checkResult: validation.result,
                        note: validation.message,
                    };
                }
                return item;
            })
        );

        if (validation.valid) {
            message.success(validation.message);
        } else {
            message.error(validation.message);
        }
    };

    // Handle back to selection
    const handleBackToSelection = () => {
        setCurrentStep('select');
        setSelectedExport(null);
        setSerialData([]);
    };

    const getStatistics = () => {
        const scannedCount = serialData.filter((s) => s.checkResult === 'match').length;
        const excessCount = serialData.filter((s) => s.checkResult === 'excess').length;
        const alreadyExportedCount = serialData.filter((s) => s.checkResult === 'already_exported').length;
        const notInStockCount = serialData.filter((s) => s.checkResult === 'not_in_stock').length;
        const totalRequired = selectedExport?.totalQuantity || 0;
        const missingCount = totalRequired - scannedCount;

        return {
            scannedCount,
            missingCount,
            excessCount,
            alreadyExportedCount,
            notInStockCount,
            totalRequired,
        };
    };

    const handleBackToList = () => {
        navigate('/export/list');
    };

    const handleCompleteExport = () => {
        message.info('Chức năng hoàn tất xuất kho đang được phát triển...');
    };

    return {
        currentStep,
        selectedExport,
        serialData,
        mockExportRecords,

        // Actions
        handleSelectExport,
        handleScan,
        handleBackToSelection,
        handleBackToList,
        handleCompleteExport,
        getStatistics,

        // Navigation
        navigate,
    };
};
