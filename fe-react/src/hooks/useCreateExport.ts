import { useState, useEffect } from 'react';
import { Form, App } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { logger } from '../utils/logger';
import { EXPORT_STATUS } from '../constants/export-status.constant';
import type { DeviceExport } from '../types/export.type';
import { exportService } from '../services/export.service';
import { axiosInstance } from '../configs/axios.config';
import { DEVICE_STATUS } from '../constants/dashboard.constants';

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
    expectedSerials?: string[];
}

interface DeviceOption {
    value: string;
    label: string;
    inStock: number;
    // id: string; // warehouseId not strictly needed here if we filter by READY_TO_EXPORT
}

interface CategoryOption {
    value: string;
    label: string;
}

export const useCreateExport = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;

    const [form] = Form.useForm();
    const { message, modal } = App.useApp();

    const [loading, setLoading] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [deviceList, setDeviceList] = useState<DeviceItem[]>([]);
    const [deviceOptions, setDeviceOptions] = useState<DeviceOption[]>([]);
    const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
    const [loadingDevices, setLoadingDevices] = useState(false);
    const [loadingCategories, setLoadingCategories] = useState(false);

    // Initial Load
    useEffect(() => {
        const initData = async () => {
            await Promise.all([fetchDeviceCodes(), fetchCategories()]);

            if (isEditMode && id) {
                await fetchExportDetail(id);
            } else {
                // Generate auto code only for create mode
                const today = dayjs();
                const code = `PX-${today.format('YYYY-MM')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
                form.setFieldValue('code', code);
            }
        };
        initData();
    }, [id, isEditMode]);

    const fetchExportDetail = async (exportId: string) => {
        try {
            setLoading(true);
            const res = await exportService.getDetail(exportId);
            const data = res.data;

            if (data.status !== EXPORT_STATUS.DRAFT) {
                message.warning('Chỉ có thể sửa phiếu xuất ở trạng thái NHÁP');
                navigate('/export/list');
                return;
            }

            // Map form fields
            form.setFieldsValue({
                ...data,
                // deliveryAddress, notes, etc. map automatically
            });

            // Map requirements to deviceList
            if (data.requirements) {
                const mappedDevices: DeviceItem[] = data.requirements.map((req: any, index: number) => ({
                    key: `prod-${index}-${Date.now()}`,
                    deviceModel: req.productCode,
                    name: req.productName || '',
                    quantity: req.quantity,
                    inStock: 0, // Will be updated by getDeviceStock logic handled by options
                    expectedSerials: req.expectedSerials || []
                }));
                // Update inStock after deviceOptions are loaded (they are loaded in parallel in useEffect)
                // Or we can just set them and let the UI get stock from getDeviceStock
                setDeviceList(mappedDevices);
            }

        } catch (error) {
            logger.error('Failed to fetch export detail', { error });
            message.error('Không thể tải chi tiết phiếu xuất');
            navigate('/export/list');
        } finally {
            setLoading(false);
        }
    };

    const fetchDeviceCodes = async () => {
        setLoadingDevices(true);
        try {
            const warehousesRes = await axiosInstance.get('/warehouses');
            const readyWarehouse = warehousesRes.data?.find((w: any) => w.code === DEVICE_STATUS.READY_TO_EXPORT);

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
                        };
                    }
                    return { ...item, [field]: value };
                }
                return item;
            })
        );
        setHasUnsavedChanges(true);
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

            // Validation tồn kho: chỉ check lúc tạo mới hoặc edit.
            const inStock = getDeviceStock(device.deviceModel);
            // Có thể cần logic phức tạp hơn cho edit (e.g. cộng lại sl cũ), nhưng tạm thời check đơn giản
            if (device.quantity > inStock) {
                // Warning instead of blocking? Or blocking logic
                // Tạm thời block để đảm bảo logic
                return {
                    valid: false,
                    message: `Thiết bị ${device.deviceModel} chỉ còn ${inStock} chiếc trong kho`,
                };
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
                status: EXPORT_STATUS.DRAFT,
                requirements: deviceList.map((d) => ({
                    productCode: d.deviceModel,
                    productName: d.name,
                    quantity: d.quantity,
                    expectedSerials: d.expectedSerials || [],
                })),
                totalProductCodes: deviceList.length,
                totalQuantity: deviceList.reduce((sum, d) => sum + d.quantity, 0),
                items: [], // Reset items logic not handled here
            };

            let finalId = id;
            if (isEditMode && id) {
                await exportService.update(id, payload);
                message.success('Cập nhật nháp phiếu xuất thành công');
            } else {
                const res = await exportService.create(payload);
                const exportData = res.data as DeviceExport;
                finalId = exportData.id || exportData._id;
                message.success('Tạo nháp phiếu xuất thành công');
            }

            setHasUnsavedChanges(false);

            // Logic điều hướng
            if (isEditMode) {
                // Đang edit thì ở lại
            } else {
                // Tạo mới thì chuyển sang edit
                if (finalId) navigate(`/export/edit/${finalId}`);
                else navigate('/export/list');
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
                status: EXPORT_STATUS.DRAFT,
                requirements: deviceList.map((d) => ({
                    productCode: d.deviceModel,
                    productName: d.name,
                    quantity: d.quantity,
                    expectedSerials: d.expectedSerials || [],
                })),
                totalProductCodes: deviceList.length,
                totalQuantity: deviceList.reduce((sum, d) => sum + d.quantity, 0),
            };

            let finalId = id;

            // 1. Save / Update Draft First
            if (isEditMode && id) {
                await exportService.update(id, payload);
                finalId = id;
            } else {
                const res = await exportService.create(payload);
                const exportData = res.data as DeviceExport;
                finalId = exportData.id || exportData._id;
            }

            // 2. Submit for Approval
            if (finalId) {
                await exportService.submitForApproval(finalId);
                message.success('Gửi duyệt phiếu xuất thành công!');
                setHasUnsavedChanges(false);
                navigate(`/export/${finalId}`);
            }

        } catch (error: any) {
            logger.error('Failed to submit export', { error });
            if (error.errorFields && error.errorFields.length > 0) {
                const firstError = error.errorFields[0];
                message.error(firstError.errors[0]);
                form.scrollToField(firstError.name);
            } else {
                message.error(error?.response?.data?.message || 'Không thể gửi duyệt phiếu xuất');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (hasUnsavedChanges) {
            modal.confirm({
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
        deviceOptions,
        categoryOptions,
        loadingDevices,
        loadingCategories,
        isEditMode, // Expose this

        handleAddDevice,
        handleDeleteDevice,
        handleDeviceChange,
        getDeviceStock,

        // Serial functions
        handleSaveDraft,
        handleSaveAndSubmit,
        handleCancel,
    };
};
