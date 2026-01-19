import { useState, useEffect } from 'react';
import { Form, message, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { logger } from '../utils/logger';
import { EXPORT_STATUS } from '../constants/export-status.constant';
import type { DeviceExport } from '../types/export.type';
import { exportService } from '../services/export.service';
import { axiosInstance } from '../configs/axios.config';

// Export types
export interface SerialValidationError {
    serial: string;
    reason: 'NOT_FOUND' | 'WRONG_MODEL' | 'WRONG_WAREHOUSE' | 'DUPLICATE';
    message: string;
    currentModel?: string;
    currentWarehouse?: string;
}

export interface SerialValidationResult {
    valid: boolean;
    validSerials: string[];
    invalidSerials: string[];
    errors: SerialValidationError[];
}

interface DeviceItem {
    key: string;
    deviceModel: string;
    name: string;
    quantity: number;
    inStock?: number;
    expectedSerials: string[];
}

interface DeviceOption {
    value: string;
    label: string;
    inStock: number;
}

interface CategoryOption {
    value: string;
    label: string;
}

export const useCreateExport = () => {
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [deviceList, setDeviceList] = useState<DeviceItem[]>([]);
    const [autoExportCode, setAutoExportCode] = useState('');
    const [deviceOptions, setDeviceOptions] = useState<DeviceOption[]>([]);
    const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
    const [loadingDevices, setLoadingDevices] = useState(false);
    const [loadingCategories, setLoadingCategories] = useState(false);

    // Serial modal states
    const [isSerialModalOpen, setIsSerialModalOpen] = useState(false);
    const [currentDeviceKey, setCurrentDeviceKey] = useState<string | null>(null);
    const [tempSerials, setTempSerials] = useState<string>('');
    const [activeTab, setActiveTab] = useState('manual');
    const [validatingSerials, setValidatingSerials] = useState(false);

    // Generate auto code
    useEffect(() => {
        const today = dayjs();
        const code = `PX-${today.format('YYYY-MM')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        setAutoExportCode(code);
    }, []);

    // Fetch device codes and categories
    useEffect(() => {
        fetchDeviceCodes();
        fetchCategories();
    }, []);

    const fetchDeviceCodes = async () => {
        setLoadingDevices(true);
        try {
            const warehousesRes = await axiosInstance.get('/warehouses');
            const readyWarehouse = warehousesRes.data?.find((w: any) => w.code === 'READY_TO_EXPORT');

            if (!readyWarehouse) {
                message.warning('Không tìm thấy kho sẵn sàng xuất');
                return;
            }

            const response = await axiosInstance.get('/devices', {
                params: {
                    warehouseId: readyWarehouse.id,
                    limit: 1000,
                    sortBy: 'deviceModel:asc'
                }
            });

            const devices = response.data?.results || response.data || [];

            if (Array.isArray(devices)) {
                const grouped = devices.reduce((acc: any, device: any) => {
                    const model = device.deviceModel;
                    if (!model) return acc;

                    if (!acc[model]) {
                        acc[model] = {
                            deviceModel: model,
                            name: device.name || '',
                            count: 0
                        };
                    }
                    acc[model].count++;
                    return acc;
                }, {});

                const options: DeviceOption[] = Object.values(grouped).map((item: any) => ({
                    value: item.deviceModel,
                    label: `${item.deviceModel}${item.name ? ' - ' + item.name : ''}`,
                    inStock: item.count
                }));

                setDeviceOptions(options);
                logger.info('Loaded device codes from READY_TO_EXPORT', { count: options.length });
            }
        } catch (error) {
            logger.error('Failed to fetch device codes', { error });
            message.warning('Không thể tải danh sách thiết bị');
        } finally {
            setLoadingDevices(false);
        }
    };

    const fetchCategories = async () => {
        setLoadingCategories(true);
        try {
            const response = await axiosInstance.get('/categories');
            if (response.data && Array.isArray(response.data)) {
                const options: CategoryOption[] = response.data.map((cat: any) => ({
                    value: cat.name,
                    label: cat.name
                }));
                setCategoryOptions(options);
            }
        } catch (error) {
            logger.error('Failed to fetch categories', { error });
        } finally {
            setLoadingCategories(false);
        }
    };

    const getDeviceStock = (deviceModel: string): number => {
        const device = deviceOptions.find((d) => d.value === deviceModel);
        return device?.inStock || 0;
    };

    const handleAddDevice = () => {
        const newDevice: DeviceItem = {
            key: `device-${Date.now()}`,
            deviceModel: '',
            name: '',
            quantity: 1,
            expectedSerials: [],
        };
        setDeviceList([...deviceList, newDevice]);
        setHasUnsavedChanges(true);
    };

    const handleDeleteDevice = (key: string) => {
        setDeviceList(deviceList.filter((item) => item.key !== key));
        setHasUnsavedChanges(true);
    };

    const handleDeviceChange = (key: string, field: string, value: any) => {
        setDeviceList(
            deviceList.map((item) => {
                if (item.key === key) {
                    if (field === 'deviceModel') {
                        const device = deviceOptions.find((d) => d.value === value);
                        return {
                            ...item,
                            deviceModel: value,
                            name: device?.label.split(' - ')[1] || '',
                            inStock: device?.inStock || 0,
                            expectedSerials: [],
                        };
                    }
                    return { ...item, [field]: value };
                }
                return item;
            })
        );
        setHasUnsavedChanges(true);
    };

    const openSerialModal = (record: DeviceItem) => {
        if (!record.deviceModel) {
            message.warning('Vui lòng chọn mã thiết bị trước');
            return;
        }
        setCurrentDeviceKey(record.key);
        setTempSerials(record.expectedSerials.join('\n'));
        setIsSerialModalOpen(true);
        setActiveTab('manual');
    };

    // Validate serials with backend API
    const validateSerials = async (
        serials: string[],
        deviceModel: string
    ): Promise<SerialValidationResult> => {
        try {
            setValidatingSerials(true);

            const response = await axiosInstance.post('/devices/validate-serials', {
                serials,
                deviceModel,
                warehouseCode: 'READY_TO_EXPORT',
                operation: 'EXPORT'
            });

            return response.data;
        } catch (error: any) {
            logger.error('Serial validation failed', { error });
            message.error('Không thể validate serial');
            return {
                valid: false,
                validSerials: [],
                invalidSerials: serials,
                errors: [{
                    serial: 'API_ERROR',
                    reason: 'NOT_FOUND',
                    message: 'Lỗi kết nối API validation'
                }]
            };
        } finally {
            setValidatingSerials(false);
        }
    };

    // Lưu serials
    const handleSaveSerials = async (
        onValidationError?: (result: SerialValidationResult, uniqueSerials: string[]) => void
    ) => {
        if (!currentDeviceKey) return;

        const currentDevice = deviceList.find(d => d.key === currentDeviceKey);
        if (!currentDevice || !currentDevice.deviceModel) {
            message.error('Vui lòng chọn mã thiết bị trước');
            return;
        }

        const rawSerials = tempSerials.split('\n').map(s => s.trim()).filter(s => s);
        const uniqueSerials = [...new Set(rawSerials)];

        if (rawSerials.length !== uniqueSerials.length) {
            message.warning(`Đã loại bỏ ${rawSerials.length - uniqueSerials.length} serial trùng lặp`);
        }

        if (uniqueSerials.length === 0) {
            message.warning('Vui lòng nhập ít nhất 1 serial');
            return;
        }

        // Validate = backend
        const validation = await validateSerials(uniqueSerials, currentDevice.deviceModel);

        if (!validation.valid) {
            if (onValidationError) {
                onValidationError(validation, uniqueSerials);
            }
            return;
        }

        saveValidSerials(validation.validSerials);
    };

    const saveValidSerials = (serials: string[]) => {
        setDeviceList(prev => prev.map(d =>
            d.key === currentDeviceKey
                ? { ...d, expectedSerials: serials }
                : d
        ));

        setIsSerialModalOpen(false);
        setTempSerials('');
        message.success(`Đã lưu ${serials.length} serial hợp lệ`);
    };

    const validateDeviceList = (): { valid: boolean; message?: string } => {
        if (deviceList.length === 0) {
            return { valid: false, message: 'Phiếu xuất phải có ít nhất 1 thiết bị' };
        }

        const deviceModels = deviceList.map((d) => d.deviceModel);
        const duplicates = deviceModels.filter((code, index) => code && deviceModels.indexOf(code) !== index);
        if (duplicates.length > 0) {
            return { valid: false, message: `Mã thiết bị ${duplicates[0]} đã tồn tại trong phiếu` };
        }

        for (const device of deviceList) {
            if (!device.deviceModel) {
                return { valid: false, message: 'Vui lòng chọn mã thiết bị cho tất cả các dòng' };
            }
            if (!device.quantity || device.quantity <= 0) {
                return { valid: false, message: 'Số lượng phải lớn hơn 0' };
            }

            const inStock = getDeviceStock(device.deviceModel);
            if (device.quantity > inStock) {
                return {
                    valid: false,
                    message: `Thiết bị ${device.deviceModel} chỉ còn ${inStock} chiếc trong kho`,
                };
            }

            if (device.expectedSerials && device.expectedSerials.length > 0) {
                if (device.expectedSerials.length !== device.quantity) {
                    return {
                        valid: false,
                        message: `Thiết bị ${device.deviceModel}: Số serial (${device.expectedSerials.length}) không khớp số lượng (${device.quantity})`
                    };
                }
            }
        }

        return { valid: true };
    };

    const handleSaveDraft = async () => {
        try {
            const formValues = await form.validateFields();
            const deviceValidation = validateDeviceList();

            if (!deviceValidation.valid) {
                message.error(deviceValidation.message);
                return;
            }

            setLoading(true);

            const payload = {
                ...formValues,
                code: autoExportCode,
                status: EXPORT_STATUS.DRAFT,
                requirements: deviceList.map((d) => ({
                    productCode: d.deviceModel,
                    productName: d.name,
                    quantity: d.quantity,
                    expectedSerials: d.expectedSerials || [],
                })),
                totalProductCodes: deviceList.length,
                totalQuantity: deviceList.reduce((sum, d) => sum + d.quantity, 0),
                items: [],
            };

            const res = await exportService.create(payload);
            if (res.data) {
                message.success('Lưu nháp phiếu xuất thành công');
                setHasUnsavedChanges(false);
                const exportData = res.data as DeviceExport;
                navigate(`/export/${exportData.id || exportData._id}`);
            }
        } catch (error: any) {
            logger.error('Failed to save draft', { error });
            if (error.errorFields && error.errorFields.length > 0) {
                const firstError = error.errorFields[0];
                message.error(firstError.errors[0]);
                form.scrollToField(firstError.name);
            } else {
                message.error('Không thể lưu nháp phiếu xuất');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAndSubmit = async () => {
        try {
            const formValues = await form.validateFields();
            const deviceValidation = validateDeviceList();

            if (!deviceValidation.valid) {
                message.error(deviceValidation.message);
                return;
            }

            setLoading(true);

            const payload = {
                ...formValues,
                code: autoExportCode,
                status: EXPORT_STATUS.PENDING_APPROVAL,
                requirements: deviceList.map((d) => ({
                    productCode: d.deviceModel,
                    productName: d.name,
                    quantity: d.quantity,
                    expectedSerials: d.expectedSerials || [],
                })),
                totalProductCodes: deviceList.length,
                totalQuantity: deviceList.reduce((sum, d) => sum + d.quantity, 0),
                items: [],
            };

            const res = await exportService.create(payload);
            if (res.data) {
                message.success('Tạo phiếu xuất và gửi duyệt thành công!');
                setHasUnsavedChanges(false);
                const exportData = res.data as DeviceExport;
                navigate(`/export/${exportData.id || exportData._id}`);
            }
        } catch (error: any) {
            logger.error('Failed to submit export', { error });
            if (error.errorFields && error.errorFields.length > 0) {
                const firstError = error.errorFields[0];
                message.error(firstError.errors[0]);
                form.scrollToField(firstError.name);
            } else {
                message.error('Không thể tạo phiếu xuất');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (hasUnsavedChanges) {
            Modal.confirm({
                title: 'Xác nhận thoát',
                content: 'Bạn có thay đổi chưa được lưu. Bạn có chắc muốn thoát?',
                okText: 'Thoát',
                cancelText: 'Ở lại',
                okButtonProps: { danger: true },
                onOk: () => navigate('/export/list'),
            });
        } else {
            navigate('/export/list');
        }
    };

    return {
        form,
        loading,
        hasUnsavedChanges,
        setHasUnsavedChanges: () => setHasUnsavedChanges(true),

        deviceList,
        autoExportCode,
        deviceOptions,
        categoryOptions,
        loadingDevices,
        loadingCategories,

        handleAddDevice,
        handleDeleteDevice,
        handleDeviceChange,
        getDeviceStock,

        // Serial functions
        openSerialModal,
        handleSaveSerials,
        saveValidSerials,

        handleSaveDraft,
        handleSaveAndSubmit,
        handleCancel,

        // Serial modal states
        isSerialModalOpen,
        setIsSerialModalOpen,
        tempSerials,
        setTempSerials,
        activeTab,
        setActiveTab,
        validatingSerials,
    };
};
