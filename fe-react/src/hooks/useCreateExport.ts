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
    stockName?: string;
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

    const [stockMap, setStockMap] = useState<Record<string, { inStock: number; reserved: number; available: number }>>({});

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

    const onProjectSearch = (value: string) => {
        setProjectSearchValue(value);
    };

    const handleProjectBlur = () => {
        setTimeout(() => {
            const searchText = projectSearchValue.trim();
            const currentVal = form.getFieldValue('project');
            if (!currentVal && searchText) {
                const exists = projectOptions.some(p => p.label.toLowerCase() === searchText.toLowerCase());

                if (!exists) {
                    console.log('Project not found, suggesting create:', searchText);
                    setPendingProjectName(searchText);
                    setIsProjectModalOpen(true);
                } else {
                    const existingOption = projectOptions.find(p => p.label.toLowerCase() === searchText.toLowerCase());
                    if (existingOption) {
                        form.setFieldValue('project', existingOption.value);
                    }
                }
            }
        }, 200);
    };

    const handleProjectKeyDown = (e: any) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleProjectBlur();
        }
    };

    const handleCreateProject = async (code: string, name: string) => {
        try {
            // 1. Lấy id nhóm Dự án 
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

            // 2. Thêm vào options
            const newOption = { label: newData.name, value: newData.code };
            setProjectOptions([...projectOptions, newOption]);

            form.setFieldValue('project', newData.code);

            setIsProjectModalOpen(false);
            setProjectSearchValue('');

        } catch (error) {
            logger.error('Failed to create project', { error });
            message.error('Không thể tạo dự án mới');
        }
    };

    const handleCancelProjectCreation = () => {
        setIsProjectModalOpen(false);
        setPendingProjectName('');
        setProjectSearchValue('');
        form.setFieldValue('project', undefined);
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

            form.setFieldsValue({
                ...data,
            });

            if (data.requirements) {
                const mappedDevices: DeviceItem[] = data.requirements.map((req: any, index: number) => ({
                    key: `prod-${index}-${Date.now()}`,
                    deviceModel: req.deviceCode,
                    name: req.deviceName || '',
                    quantity: req.quantity,
                    inStock: 0,
                    expectedSerials: req.expectedSerials || []
                }));
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
            // 1. Fetch Danh mục Model từ SharedData (Source of Truth for Code & Name)
            const models = await sharedDataService.getDataByGroupCode('MODEL');

            // 2. Fetch Tồn kho thực tế (Ready to Export)
            const warehousesRes = await axiosInstance.get('/warehouses');
            const readyWarehouse = warehousesRes.data?.find((w: any) => w.code === DEVICE_STATUS.READY_TO_EXPORT);

            let stockCounts: Record<string, number> = {};

            if (readyWarehouse) {
                const response = await axiosInstance.get('/devices', {
                    params: {
                        warehouseId: readyWarehouse.id,
                        limit: 2000, // Fetch large number to count stock
                        sortBy: 'deviceModel:asc',
                        page: 1
                        // Note: For large scale, use a breakdown API instead of fetching all devices
                    }
                });
                const devices = response.data?.results || response.data || [];
                if (Array.isArray(devices)) {
                    stockCounts = devices.reduce((acc: any, device: any) => {
                        const model = device.deviceModel;
                        if (model) {
                            acc[model] = (acc[model] || 0) + 1;
                        }
                        return acc;
                    }, {});
                }
            }

            // 3. Merge Metadata with Stock
            if (models && models.length > 0) {
                const options: DeviceOption[] = models.map((m: any) => ({
                    value: m.code,
                    label: m.code, // Main Label
                    stockName: m.name, // Sub Label
                    inStock: stockCounts[m.code] || 0
                }));
                // Sort by Code
                options.sort((a, b) => a.value.localeCompare(b.value));
                setDeviceOptions(options);

            } else {
                // Fallback if SharedData empty?
                setDeviceOptions([]);
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
        // Lấy tồn kho khả dụng từ API
        if (stockMap[deviceModel]) {
            return stockMap[deviceModel].available;
        }
        // Nếu không có tồn kho khả dụng thì lấy từ deviceOptions
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

    const handleDeviceChange = async (key: string, field: keyof DeviceItem, value: any) => {
        const newList = deviceList.map((item) => {
            if (item.key === key) {
                const updated = { ...item, [field]: value };
                if (field === 'deviceModel') {
                    const option = deviceOptions.find(o => o.value === value);
                    if (option) {
                        updated.name = option.stockName || '';
                        // Temp set inStock from option until API returns
                        updated.inStock = option.inStock;
                    }
                }
                return updated;
            }
            return item;
        });
        setDeviceList(newList);
        setHasUnsavedChanges(true);

        // Lấy tồn kho khả dụng từ API
        if (field === 'deviceModel' && value) {
            try {
                const status = await exportService.getInventoryStatus(value);
                setStockMap(prev => ({
                    ...prev,
                    [value]: status.data || status // Handle response structure
                }));

                //
            } catch (error) {
                console.error('Failed to fetch inventory status', error);
            }
        }
    };

    const handleSaveDraft = () => handleSave(EXPORT_STATUS.DRAFT);
    const handleSaveAndSubmit = () => handleSave(EXPORT_STATUS.PENDING_APPROVAL);

    const handleSave = async (status: string) => {
        try {
            const values = await form.validateFields();

            // Kiểm tra danh sách thiết bị
            if (deviceList.length === 0) {
                message.error('Vui lòng thêm ít nhất một thiết bị');
                return;
            }

            // Kiểm tra nếu có thiết bị vượt quá số lượng tồn kho
            const hasStockError = deviceList.some(d => {
                const stock = getDeviceStock(d.deviceModel);
                return d.quantity > stock;
            });

            if (hasStockError) {
                message.error('Có thiết bị vượt quá số lượng tồn kho!');
                return;
            }

            setLoading(true);

            // Chuẩn bị payload
            const payload: Partial<DeviceExport> = {
                ...values,
                status,
                requirements: deviceList.map(d => ({
                    deviceCode: d.deviceModel,
                    deviceName: d.name,
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
        handleProjectKeyDown,
        handleCreateProject,
        handleCancelProjectCreation,
        setIsProjectModalOpen
    };
};
