import { useState, useEffect } from 'react';
import { message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { exportService } from '../services/export.service';
import { logger } from '../utils/logger';
import type { DeviceExport } from '../types/export.type';

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
    const { id: routeExportId } = useParams<{ id?: string }>();

    const [currentStep, setCurrentStep] = useState<'select' | 'check'>('select');
    const [selectedExport, setSelectedExport] = useState<any>(null);
    const [serialData, setSerialData] = useState<SerialItem[]>([]);
    const [exportRecords, setExportRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Load exports nếu ở step select
    useEffect(() => {
        if (currentStep === 'select') {
            fetchEligibleExports();
        }
    }, [currentStep]);

    // Nếu có ID trong route, tự động chọn export đó
    useEffect(() => {
        if (routeExportId) {
            loadExportById(routeExportId);
        }
    }, [routeExportId]);

    const fetchEligibleExports = async () => {
        setLoading(true);
        try {
            const res = await exportService.getAll({});
            if (res.success && res.data) {
                // Lọc các phiếu đã duyệt hoặc đang xuất
                const eligible = res.data.filter(
                    (exp: DeviceExport) => exp.status === 'APPROVED' || exp.status === 'IN_PROGRESS'
                );

                // Map sang format cần thiết
                const mapped = eligible.map((exp: DeviceExport) => ({
                    key: exp.id || exp._id,
                    exportCode: exp.code,
                    productType: exp.type || 'N/A',
                    exportDate: exp.createdAt,
                    exportedBy: exp.createdBy || 'Admin',
                    receiver: exp.receiver,
                    project: exp.project,
                    customer: exp.customer,
                    totalQuantity: exp.totalQuantity || 0,
                    totalSerials: exp.items?.length || 0,
                    exportStatus: exp.status?.toLowerCase() as 'approved' | 'in-progress',
                }));

                setExportRecords(mapped);
            }
        } catch (error) {
            logger.error('Không thể tải danh sách phiếu xuất', {
                error,
                module: 'useExportCheck',
                action: 'fetchEligibleExports',
            });
            message.error('Không thể tải danh sách phiếu xuất');
        } finally {
            setLoading(false);
        }
    };

    // Load export by ID
    const loadExportById = async (exportId: string) => {
        setLoading(true);
        try {
            const res = await exportService.getDetail(exportId);
            if (res.data) {
                const exp = res.data;
                const exportData = {
                    key: exp.id || exp._id,
                    exportCode: exp.code,
                    productType: exp.type || 'N/A',
                    exportDate: exp.createdAt,
                    exportedBy: exp.createdBy || 'Admin',
                    receiver: exp.receiver,
                    totalQuantity: exp.totalQuantity || 0,
                    totalSerials: exp.items?.length || 0,
                    exportStatus: exp.status?.toLowerCase() as 'approved' | 'in-progress',
                };

                const serials: SerialItem[] = [];
                if (exp.requirements && exp.requirements.length > 0) {
                    exp.requirements.forEach((req: any, index: number) => {
                        // Tạo expected serials từ requirements
                        for (let i = 0; i < req.quantity; i++) {
                            serials.push({
                                key: `${req.productCode}-${index}-${i}`,
                                productCode: req.productCode,
                                productName: req.productName || req.productCode,
                                serial: '', // Sẽ được fill khi quét
                                systemStatus: 'Chưa quét',
                                checkResult: undefined,
                                note: undefined,
                            });
                        }
                    });
                }

                handleSelectExport(exportData);
                setSerialData(serials);
            }
        } catch (error) {
            logger.error('Không thể tải thông tin phiếu xuất', {
                error,
                module: 'useExportCheck',
                action: 'loadExportById',
                exportId,
            });
            message.error('Không thể tải thông tin phiếu xuất');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectExport = (record: any) => {
        setSelectedExport(record);
        setCurrentStep('check');
        message.success(`Đã chọn phiếu ${record.exportCode}. Bắt đầu quét serial...`);
    };

    // Validate serial
    const validateSerial = (serial: string): { valid: boolean; result: CheckResult; message: string } => {
        // Tìm serial chưa quét trong danh sách
        const expectedSerial = serialData.find((s) => !s.checkResult);

        if (!expectedSerial) {
            return {
                valid: false,
                result: 'excess',
                message: `Serial ${serial} THỪA - Đã đủ số lượng yêu cầu!`,
            };
        }

        // Kiểm tra duplicate
        const alreadyScanned = serialData.find((s) => s.serial === serial && s.checkResult === 'match');
        if (alreadyScanned) {
            return {
                valid: false,
                result: 'excess',
                message: `Serial ${serial} đã được quét rồi!`,
            };
        }

        return {
            valid: true,
            result: 'match',
            message: `Serial ${serial} hợp lệ`,
        };
    };

    const handleScan = (serial: string) => {
        if (!serial || !serial.trim()) {
            message.warning('Vui lòng nhập serial');
            return;
        }

        const validation = validateSerial(serial);

        // Cập nhật serial data
        setSerialData((prev) => {
            const updated = [...prev];
            // Tìm item chưa quét đầu tiên
            const indexToUpdate = updated.findIndex((item) => !item.checkResult);

            if (indexToUpdate >= 0) {
                updated[indexToUpdate] = {
                    ...updated[indexToUpdate],
                    serial: serial,
                    checkResult: validation.result,
                    note: validation.message,
                    systemStatus: validation.valid ? 'Đã quét' : 'Lỗi',
                };
            }

            return updated;
        });

        if (validation.valid) {
            message.success(validation.message);
        } else {
            message.error(validation.message);
        }
    };

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

    const handleCompleteExport = async () => {
        if (!selectedExport || !selectedExport.key) return;

        const stats = getStatistics();
        if (stats.missingCount > 0) {
            message.warning('Chưa quét đủ serial yêu cầu!');
            return;
        }

        try {
            // Lấy danh sách serial đã quét thành công
            const scannedSerials = serialData
                .filter((s) => s.checkResult === 'match')
                .map((s) => s.serial);

            if (scannedSerials.length === 0) {
                message.warning('Chưa có serial nào được quét');
                return;
            }

            await exportService.addItems(selectedExport.key, scannedSerials);

            await exportService.confirm(selectedExport.key);

            message.success('Hoàn tất xuất kho thành công!');
            navigate('/export/list');
        } catch (error) {
            logger.error('Lỗi khi hoàn tất xuất kho', {
                error,
                module: 'useExportCheck',
                action: 'handleCompleteExport',
                exportId: selectedExport.key,
            });
            message.error('Không thể hoàn tất xuất kho');
        }
    };

    return {
        // State
        currentStep,
        selectedExport,
        serialData,
        exportRecords,
        loading,

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
