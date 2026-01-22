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
import { sharedDataService } from '../services/shared-data.service';

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
    const [projectOptions, setProjectOptions] = useState<any[]>([]);

    // [NEW] Project Creation State
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [pendingProjectName, setPendingProjectName] = useState('');
    const [projectSearchValue, setProjectSearchValue] = useState('');

    const [loadingDevices, setLoadingDevices] = useState(false);
    const [loadingCategories, setLoadingCategories] = useState(false);

    // Initial Load
    useEffect(() => {
        const initData = async () => {
            try {
                await Promise.all([fetchDeviceCodes(), fetchCategories(), fetchProjects()]);

                if (isEditMode && id) {
                    await fetchExportDetail(id);
                } else {
                    // Generate auto code only for create mode
                    const today = dayjs();
                    const code = `PX-${today.format('YYYY-MM')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
                    form.setFieldValue('code', code);
                }
            } catch (error) {
                console.error('Failed to initialize export page data', error);
                // Avoid using logger with full error object if it has circular refs
            }
        };
        initData();
    }, [id, isEditMode]);

    const fetchProjects = async () => {
        try {
            const projects = await sharedDataService.getDataByGroupCode('PROJECT');
            if (projects && projects.length > 0) {
                setProjectOptions(projects.map(p => ({
                    label: p.name,
                    value: p.code
                })));
            }
        } catch (error) {
            console.error('Failed to fetch projects', error);
        }
    };

    // [NEW] Handle Project Selection/Creation
    const onProjectSearch = (value: string) => {
        setProjectSearchValue(value);
    };

    const handleProjectBlur = () => {
        // Delay slightly to ensure search value is current (optional, but good for safety)
        setTimeout(() => {
            const searchText = projectSearchValue.trim();
            const currentVal = form.getFieldValue('project');

            // Only trigger if no valid project selected AND we have a search text
            if (!currentVal && searchText) {
                // Check if it matches an existing label exactly
                const exists = projectOptions.some(p => p.label.toLowerCase() === searchText.toLowerCase());
                if (!exists) {
                    setPendingProjectName(searchText);
                    setIsProjectModalOpen(true);
                }
            }
        }, 100);
    };

    const handleProjectKeyDown = (e: any) => {
        if (e.key === 'Enter') {
            // Let Blur handle it, or force trigger
            e.preventDefault(); // Prevent form submission
            handleProjectBlur();
        }
    };

    const handleCreateProject = async (code: string, name: string) => {
        try {
            // 1. Get Project Group ID 
            const groups = await sharedDataService.getGroups();
            const projectGroup = groups.find(g => g.code === 'PROJECT');

            if (!projectGroup) {
                message.error('Không tìm thấy nhóm dữ liệu Dự án');
                return;
            }

            const newData = await sharedDataService.createData({
                code: code,
                name: name,
                description: 'Auto-created via Export Form',
                groupId: projectGroup._id,
                order: 99
            });

            message.success('Đã tạo dự án mới');

            // 2. Update Options
            const newOption = { label: newData.name, value: newData.code };
            setProjectOptions([...projectOptions, newOption]);

            // 3. Select it
            form.setFieldValue('project', newData.code);

            setIsProjectModalOpen(false);
            setProjectSearchValue(''); // Reset search

        } catch (error) {
            logger.error('Failed to create project', { error });
            message.error('Không thể tạo dự án mới');
        }
    };

    const handleCancelProjectCreation = () => {
        setIsProjectModalOpen(false);
        setPendingProjectName('');
        setProjectSearchValue('');
        form.setFieldValue('project', undefined); // Clear selection if cancelled
    };

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
                    sortBy: 'deviceModel:asc',
                    page: 1
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
        const newItem: DeviceItem = {
            key: `new-${Date.now()}`,
            deviceModel: '',
            name: '',
            quantity: 1,
            inStock: 0
        };
        setDeviceList([...deviceList, newItem]);
        setHasUnsavedChanges(true);
    };

    const handleDeleteDevice = (key: string) => {
        setDeviceList(deviceList.filter((item) => item.key !== key));
        setHasUnsavedChanges(true);
    };

    const handleDeviceChange = (key: string, field: keyof DeviceItem, value: any) => {
        const newList = deviceList.map((item) => {
            if (item.key === key) {
                const updated = { ...item, [field]: value };
                if (field === 'deviceModel') {
                    // Update name and stock when model changes
                    const option = deviceOptions.find(o => o.value === value);
                    if (option) {
                        // Extract name from label "Model - Name"
                        const namePart = option.label.includes(' - ') ? option.label.split(' - ')[1] : '';
                        updated.name = namePart;
                        updated.inStock = option.inStock;
                    }
                }
                return updated;
            }
            return item;
        });
        setDeviceList(newList);
        setHasUnsavedChanges(true);
    };

    const handleSaveDraft = () => handleSave(EXPORT_STATUS.DRAFT);
    const handleSaveAndSubmit = () => handleSave(EXPORT_STATUS.PENDING_APPROVAL);

    const handleSave = async (status: string) => {
        try {
            const values = await form.validateFields();

            // Validate device list
            if (deviceList.length === 0) {
                message.error('Vui lòng thêm ít nhất một thiết bị');
                return;
            }

            // Check if any device has quantity > stock
            const hasStockError = deviceList.some(d => {
                const stock = getDeviceStock(d.deviceModel);
                return d.quantity > stock;
            });

            if (hasStockError) {
                message.error('Có thiết bị vượt quá số lượng tồn kho!');
                return;
            }

            setLoading(true);

            // Prepare payload
            const payload: Partial<DeviceExport> = {
                ...values,
                status,
                requirements: deviceList.map(d => ({
                    productCode: d.deviceModel,
                    productName: d.name,
                    quantity: d.quantity,
                    // expectedSerials?
                }))
            } as any;

            if (isEditMode && id) {
                await exportService.update(id, payload as any);
                message.success('Cập nhật phiếu xuất thành công');
            } else {
                await exportService.create(payload as any);
                message.success('Tạo phiếu xuất thành công');
            }

            setHasUnsavedChanges(false);
            navigate('/export/list');

        } catch (error) {
            logger.error('Save export failed', { error });
            message.error('Có lỗi xảy ra khi lưu phiếu');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (hasUnsavedChanges) {
            modal.confirm({
                title: 'Xác nhận thoát',
                content: 'Dữ liệu chưa lưu sẽ bị mất? Bạn có chắc chắn muốn hủy?',
                okText: 'Thoát',
                cancelText: 'Ở lại',
                onOk: () => navigate('/export/list'),
            });
        } else {
            navigate('/export/list');
        }
    };

    return {
        form,
        loading,
        deviceList,
        deviceOptions,
        categoryOptions,
        projectOptions,
        loadingDevices,
        loadingCategories,
        handleAddDevice,
        handleDeleteDevice,
        handleDeviceChange,
        getDeviceStock,
        handleSaveDraft,
        handleSaveAndSubmit,
        handleCancel,
        setHasUnsavedChanges,
        isEditMode,
        // Project Creation
        isProjectModalOpen,
        pendingProjectName,
        onProjectSearch,
        handleProjectBlur,
        handleProjectKeyDown, // [NEW]
        handleCreateProject,
        handleCancelProjectCreation,
        setIsProjectModalOpen
    };
};
