import { useState, useEffect } from 'react';
import { Form, App } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';

import { logger } from '../utils/logger';
import { EXPORT_STATUS } from '../constants/export-status.constant';
import { exportService } from '../services/export.service';
import { sharedDataService } from '../services/shared-data.service';
import { axiosInstance } from '../configs/axios.config';
import { DEVICE_STATUS } from '../constants/dashboard.constants';

// Interfaces
export interface DeviceItem {
    key: string;
    deviceModel: string;
    name: string;
    quantity: number;
    inStock?: number;
    expectedMacs?: string[];
}

export const useCreateExport = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;

    const [form] = Form.useForm();
    const { message, modal } = App.useApp();

    // Removed unused queryClient

    const [loading, setLoading] = useState(false); // UI loading
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Legacy Device List state
    const [deviceList, setDeviceList] = useState<DeviceItem[]>([]);

    // Project Creation Logic
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [pendingProjectName, setPendingProjectName] = useState('');
    const [projectSearchValue, setProjectSearchValue] = useState('');

    // 1. Projects
    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const res = await sharedDataService.getDataByGroupCode('PROJECT');
            return res || [];
        },
        staleTime: 5 * 60 * 1000,
        select: (data) => data.map((p: any) => ({ label: p.name, value: p.code }))
    });

    // 2. Models & Stock
    const { data: deviceOptions = [], isLoading: loadingDevices } = useQuery({
        queryKey: ['device-stock-options'],
        queryFn: async () => {
            // Parallel fetch
            const [models, warehousesRes] = await Promise.all([
                sharedDataService.getDataByGroupCode('MODEL'),
                axiosInstance.get('/warehouses')
            ]);

            const readyWarehouse = warehousesRes.data?.find((w: any) => w.code === DEVICE_STATUS.READY_TO_EXPORT);
            let stockCounts: Record<string, number> = {};

            if (readyWarehouse) {
                // Use optimized stock summary endpoint instead of fetching all devices
                const response = await axiosInstance.get('/devices/stock-summary');
                const summary = response.data || [];

                if (Array.isArray(summary)) {
                    stockCounts = summary.reduce((acc: any, item: any) => {
                        const m = item.deviceModel;
                        if (m) acc[m] = item.count || 0;
                        return acc;
                    }, {});
                }
            }

            if (!models) return [];

            return models.map((m: any) => ({
                value: m.code,
                label: m.code,
                stockName: m.name,
                inStock: stockCounts[m.code] || 0
            })).sort((a: any, b: any) => a.value.localeCompare(b.value));
        },
        staleTime: 60 * 1000
    });

    useEffect(() => {
        if (!isEditMode || !id) {
            const today = dayjs();
            const code = `PX-${today.format('YYYY-MM')}-${String(Math.floor(Math.random() * 5000)).padStart(3, '0')}`;
            form.setFieldValue('code', code);
            return;
        }

        const loadDetail = async () => {
            try {
                setLoading(true);
                const res = await exportService.getDetail(id);
                const data = res.data;

                if (data.status !== EXPORT_STATUS.DRAFT) {
                    message.warning('Chỉ có thể sửa phiếu xuất ở trạng thái NHÁP');
                    navigate('/export/list');
                    return;
                }

                form.setFieldsValue({
                    ...data,
                    exportDate: data.exportDate ? dayjs(data.exportDate) : undefined
                });

                if (data.requirements) {
                    const mappedDevices: DeviceItem[] = data.requirements.map((req: any, index: number) => ({
                        key: `prod-${index}-${Date.now()}`,
                        deviceModel: req.deviceCode,
                        name: req.deviceName || '',
                        quantity: req.quantity,
                        inStock: 0,
                        expectedMacs: req.expectedMacs || []
                    }));
                    setDeviceList(mappedDevices);
                }
            } catch (err) {
                message.error('Lỗi tải chi tiết phiếu');
            } finally {
                setLoading(false);
            }
        };
        loadDetail();
    }, [id, isEditMode, form, message, navigate]);

    // Logic tạo dự án
    const onProjectSearch = (value: string) => setProjectSearchValue(value);

    const handleProjectBlur = () => {
        setTimeout(() => {
            const searchText = projectSearchValue.trim();
            const currentVal = form.getFieldValue('project');
            if (!currentVal && searchText) {
                const exists = projects.some((p: any) => p.label.toLowerCase() === searchText.toLowerCase());
                if (!exists) {
                    setPendingProjectName(searchText);
                    setIsProjectModalOpen(true);
                } else {
                    const match = projects.find((p: any) => p.label.toLowerCase() === searchText.toLowerCase());
                    if (match) form.setFieldValue('project', match.value);
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

    // Logic danh sách thiết bị
    const getDeviceStock = (deviceModel: string): number => {
        const option = deviceOptions.find((d: any) => d.value === deviceModel);
        return option?.inStock || 0;
    };

    const handleAddDevice = () => {
        const newItem: DeviceItem = {
            key: `new-${Date.now()}`,
            deviceModel: '',
            name: '',
            quantity: 1,
            inStock: 0
        };
        setDeviceList([newItem, ...deviceList]);
        setHasUnsavedChanges(true);
    };

    const handleDeleteDevice = (key: string) => {
        setDeviceList(deviceList.filter((item) => item.key !== key));
        setHasUnsavedChanges(true);
    };

    const handleDeviceChange = (key: string, field: keyof DeviceItem, value: any) => {
        setDeviceList(prev => prev.map(item => {
            if (item.key === key) {
                const updated = { ...item, [field]: value };

                // Tự động điền tên và số lượng tồn kho khi thay đổi model
                if (field === 'deviceModel') {
                    const option = deviceOptions.find((o: any) => o.value === value);
                    if (option) {
                        updated.name = option.stockName || '';
                        updated.inStock = option.inStock;
                    }
                }
                return updated;
            }
            return item;
        }));
        setHasUnsavedChanges(true);
    };

    // Save Logic
    const handleSave = async (status: string) => {
        try {
            const values = await form.validateFields();

            if (deviceList.length === 0) {
                message.error('Vui lòng thêm ít nhất một thiết bị');
                return;
            }

            // Kiểm tra số lượng tồn kho
            const hasStockError = deviceList.some(d => {
                const stock = getDeviceStock(d.deviceModel);
                return d.quantity > stock;
            });

            if (hasStockError) {
                message.error('Có thiết bị vượt quá số lượng tồn kho!');
                return;
            }

            setLoading(true);

            const payload = {
                ...values,
                status,
                requirements: deviceList.map(d => ({
                    deviceCode: d.deviceModel,
                    deviceName: d.name,
                    quantity: d.quantity,
                    // expectedMacs?
                }))
            };

            if (isEditMode && id) {
                await exportService.update(id, payload);
                message.success('Cập nhật phiếu xuất thành công');
            } else {
                await exportService.create(payload);
                message.success('Tạo phiếu xuất thành công');
            }

            setHasUnsavedChanges(false);
            navigate('/export/list');

        } catch (error: any) {
            logger.error('Save export failed', { error });
            const errorMsg = error?.response?.data?.message || 'Có lỗi xảy ra';
            message.error(errorMsg);
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
        loadingDevices,
        handleAddDevice,
        handleDeleteDevice,
        handleDeviceChange,
        getDeviceStock,
        handleSaveDraft: () => handleSave(EXPORT_STATUS.DRAFT),
        handleSaveAndSubmit: () => handleSave(EXPORT_STATUS.PENDING_APPROVAL),
        handleCancel,
        setHasUnsavedChanges,
        isEditMode,
        // Project
        isProjectModalOpen,
        setIsProjectModalOpen,
        pendingProjectName,
        onProjectSearch,
        handleProjectBlur,
        handleProjectKeyDown
    };
};
