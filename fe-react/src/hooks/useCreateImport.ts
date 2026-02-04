import { useState, useEffect } from 'react';
import { Form, App } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';

import { importService } from '../services/import.service';
import { sharedDataService } from '../services/shared-data.service';
import { categoryService } from '../services/category.service';
import { deviceService } from '../services/device.service';
import { useAuth } from './useAuth';
import type { DeviceEntry } from '../types/import.type';

export const useCreateImport = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;
    const [form] = Form.useForm();
    const { modal, message } = App.useApp();
    const { user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [deviceList, setDeviceList] = useState<DeviceEntry[]>([]);

    // Data States
    const [categoryOptions, setCategoryOptions] = useState<{ label: string, value: string }[]>([]);
    const [modelOptions, setModelOptions] = useState<any[]>([]);
    const [originOptions, setOriginOptions] = useState<any[]>([]);

    // Modal States
    const [isMacModalOpen, setIsMacModalOpen] = useState(false);
    const [currentDeviceKey, setCurrentDeviceKey] = useState<string | null>(null);
    const [tempMacs, setTempMacs] = useState<string>('');
    const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);

    const generateImportCode = () => {
        const today = dayjs();
        const dateStr = today.format('DD/MM/YYYY');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `PN-${dateStr}-${random}`;
    };

    useEffect(() => {
        const initData = async () => {
            try {
                const [categories, devices] = await Promise.all([
                    categoryService.getAll(),
                    deviceService.getAll()
                ]);

                setCategoryOptions(categories.map((c: any) => ({ label: c.name, value: c.name })));

                const models = await sharedDataService.getDataByGroupCode('MODEL');
                if (models && models.length > 0) {
                    setModelOptions(models.map(m => ({
                        label: m.code,
                        value: m.code,
                        stockName: m.name
                    })));
                } else {
                    const dl = (devices as any).docs || (devices as any).data || (Array.isArray(devices) ? devices : []);
                    const fallbackModels = [...new Set(dl.map((d: any) => d.deviceModel))];
                    if (fallbackModels.length > 0) {
                        setModelOptions(fallbackModels.map(m => ({
                            label: m as string,
                            value: m as string,
                            stockName: ''
                        })));
                    }
                }

                if (isEditMode) {
                    const fetchImportDetail = async (importId: string) => {
                        try {
                            setLoading(true);
                            const res = await importService.getImportDetail(importId);
                            const data = res.data;

                            if (data.status !== 'DRAFT') {
                                message.warning('Chỉ có thể sửa phiếu nhập ở trạng thái NHÁP');
                                navigate('/import/list');
                                return;
                            }

                            form.setFieldsValue({
                                code: data.code,
                                supplier: data.supplier,
                                deviceType: data.deviceType,
                                totalQuantity: data.totalQuantity,
                                importDate: dayjs(data.importDate),
                                notes: data.notes,
                                status: data.status
                            });

                            if (data.devices && data.devices.length > 0) {
                                const mappedDevices: DeviceEntry[] = data.devices.map((device: any, index: number) => ({
                                    key: device._id || `prod-${index}-${Date.now()}`,
                                    deviceCode: device.deviceCode,
                                    quantity: device.quantity || 0,
                                    boxCount: device.boxCount || null,
                                    itemsPerBox: device.itemsPerBox || null,
                                    expectedSerials: device.expectedSerials || [],
                                    serialImported: device.serialImported || 0,
                                    expectedDetails: device.expectedDetails || []
                                }));
                                setDeviceList(mappedDevices);
                            }

                        } catch (error) {
                            console.error('Failed to fetch import detail', { error });
                            message.error('Không thể tải chi tiết phiếu nhập');
                            navigate('/import/list');
                        } finally {
                            setLoading(false);
                        }
                    };
                    fetchImportDetail(id!);
                } else {
                    form.setFieldValue('code', generateImportCode());
                    if (user && user.username) {
                        form.setFieldValue('importedBy', user.username);
                    }
                }

                const origins = await sharedDataService.getDataByGroupCode('ORIGIN');
                if (origins && origins.length > 0) {
                    setOriginOptions(origins.map((o: any) => ({
                        label: o.name,
                        value: o.code
                    })));
                }

            } catch (error) {
                console.error('Init data failed:', error);
                message.error('Không thể tải dữ liệu');
            }
        };

        initData();
    }, [id, isEditMode, form, navigate]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const handleFormChange = () => setHasUnsavedChanges(true);

    const handleAddDevice = () => {
        const newDevice: DeviceEntry = {
            key: `device-${Date.now()}`,
            deviceCode: '',
            quantity: 1,
            boxCount: null,
            itemsPerBox: null,
            expectedSerials: [],
            serialImported: 0,
            expectedDetails: []
        };
        setDeviceList([...deviceList, newDevice]);
        setHasUnsavedChanges(true);
    };

    const handleDeleteDevice = (key: string) => {
        setDeviceList(deviceList.filter(item => item.key !== key));
        setHasUnsavedChanges(true);
    };

    const handleDeviceChange = (key: string, field: string, value: any) => {
        setDeviceList(deviceList.map(item => {
            if (item.key === key) {
                const newItem = { ...item, [field]: value };
                if (field === 'deviceCode') {
                    newItem.expectedSerials = [];
                }
                return newItem;
            }
            return item;
        }));
        setHasUnsavedChanges(true);
    };

    const openMacModal = (record: DeviceEntry) => {
        setCurrentDeviceKey(record.key);
        setTempMacs((record.expectedSerials || []).join('\n'));
        setIsMacModalOpen(true);
    };

    const handleSaveMacs = (uniqueList: string[]) => {
        if (!currentDeviceKey) return;

        setDeviceList(deviceList.map(p => {
            if (p.key === currentDeviceKey) {
                return { ...p, expectedSerials: uniqueList };
            }
            return p;
        }));

        message.success(`Đã cập nhật ${uniqueList.length} MAC`);
        setIsMacModalOpen(false);
        setHasUnsavedChanges(true);
    };

    const validateDeviceList = (): { valid: boolean; message?: string } => {
        if (deviceList.length === 0) return { valid: false, message: 'Vui lòng thêm ít nhất 1 thiết bị' };
        for (const p of deviceList) {
            if (!p.deviceCode) return { valid: false, message: 'Vui lòng chọn Mã thiết bị' };
            if (p.quantity <= 0) return { valid: false, message: 'Số lượng phải lớn hơn 0' };
        }
        return { valid: true };
    };

    const submitImport = async (targetStatus: 'DRAFT' | 'PUBLIC') => {
        try {
            const values = await form.validateFields();
            const validation = validateDeviceList();

            if (!validation.valid) {
                message.error(validation.message);
                return;
            }

            setLoading(true);

            const payload = {
                code: values.code,
                deviceType: values.deviceType || values.deviceType,
                origin: values.origin,
                importDate: values.importDate.toISOString(),
                importedBy: values.importedBy,
                supplier: values.supplier,
                handoverPerson: values.handoverPerson,
                notes: values.notes,
                status: targetStatus,
                devices: deviceList.map(p => ({
                    deviceCode: p.deviceCode,
                    quantity: p.quantity,
                    boxCount: p.boxCount || undefined,
                    itemsPerBox: p.itemsPerBox || undefined,
                    expectedSerials: p.expectedSerials,
                    expectedDetails: p.expectedDetails?.map(({ _id, ...rest }: any) => rest)
                })),
            };

            let finalId = id;

            if (isEditMode) {
                await importService.updateImport(id!, payload as any);
                message.success(targetStatus === 'DRAFT' ? 'Cập nhật nháp thành công' : 'Cập nhật & Chuyển trạng thái thành công');
            } else {
                const res = await importService.createImport(payload as any);
                message.success(targetStatus === 'DRAFT' ? 'Lưu nháp thành công' : 'Tạo phiếu thành công');
                finalId = res?.data?.id || (res?.data as any)?._id;
            }

            setHasUnsavedChanges(false);

            if (targetStatus === 'DRAFT') {
                if (isEditMode) {
                    message.success('Cập nhật nháp thành công');
                } else {
                    if (finalId) {
                        navigate(`/import/edit/${finalId}`);
                    } else {
                        navigate('/import/list');
                    }
                }
            } else {
                if (finalId) {
                    navigate(`/import/${finalId}`);
                } else {
                    navigate('/import/list');
                }
            }

        } catch (error: any) {
            console.error('Submit Error:', error);
            const msg = error.response?.data?.message;
            if (Array.isArray(msg)) {
                message.error(msg.join(', '));
            } else if (msg) {
                message.error(msg);
            } else {
                message.error('Có lỗi xảy ra khi xử lý phiếu');
            }
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
                onOk: () => navigate('/import/list'),
            });
        } else {
            navigate('/import/list');
        }
    };

    const handleWizardSuccess = (details: any[]) => {
        if (!details || details.length === 0) return;

        const deviceMap = new Map<string, {
            quantity: number;
            boxCount: number | null;
            itemsPerBox: number | null;
            serials: string[];
            details: any[];
        }>();

        details.forEach((row: any) => {
            const pCode = row.deviceCode || row.deviceCode;
            if (!pCode) return;

            const current = deviceMap.get(pCode) || {
                quantity: 0,
                boxCount: row.boxCount || null,
                itemsPerBox: row.itemsPerBox || null,
                serials: [] as string[],
                details: [] as any[]
            };

            let qty = Number(row.quantity) || 0;
            if (row.mac && qty === 0) qty = 1;

            current.quantity += qty;
            if (row.mac) {
                current.serials.push(row.mac);
                current.details.push({
                    mac: row.mac,
                    serial: row.serial || '',
                    p2p: row.p2p || '',
                    name: row.name || ''
                });
            }

            if (!current.boxCount && row.boxCount) current.boxCount = row.boxCount;
            if (!current.itemsPerBox && row.itemsPerBox) current.itemsPerBox = row.itemsPerBox;

            deviceMap.set(pCode, current);
        });

        const newDevices: DeviceEntry[] = [];
        deviceMap.forEach((val, key) => {
            newDevices.push({
                key: `wiz-${key}-${Date.now()}`,
                deviceCode: key,
                quantity: val.quantity,
                boxCount: val.boxCount,
                itemsPerBox: val.itemsPerBox,
                serialImported: 0,
                expectedSerials: val.serials,
                expectedDetails: val.details
            });
        });

        setDeviceList([...deviceList, ...newDevices]);
        setHasUnsavedChanges(true);
        message.success(`Đã thêm ${newDevices.length} dòng thiết bị từ Excel`);
    };

    // Field Definitions
    const IMPORT_TICKET_FIELDS: any[] = [
        { key: 'deviceCode', label: 'Mã Model', required: true, description: 'Mã Model thiết bị' },
        { key: 'mac', label: 'MAC Address', required: true, description: 'Địa chỉ MAC (Duy nhất)' },
        { key: 'name', label: 'Tên thiết bị', required: false, description: 'Tên hiển thị' },
        { key: 'p2p', label: 'P2P', required: false, description: 'Mã P2P (Cloud)' },
        { key: 'serial', label: 'Serial Number', required: false, description: 'Số Serial' },
        { key: 'quantity', label: 'Số lượng', required: false, description: 'Mặc định là 1 nếu có MAC' },
        { key: 'boxCount', label: 'Số hộp', required: false },
        { key: 'itemsPerBox', label: 'Số SP/Hộp', required: false },
    ];

    return {
        isEditMode,
        form,
        loading,
        deviceList, setDeviceList,
        categoryOptions,
        modelOptions,
        originOptions,
        isMacModalOpen, setIsMacModalOpen,
        currentDeviceKey,
        tempMacs,
        isImportWizardOpen, setIsImportWizardOpen,
        openMacModal,
        handleSaveMacs,
        handleAddDevice,
        handleDeleteDevice,
        handleDeviceChange,
        handleFormChange,
        submitImport,
        handleCancel,
        handleWizardSuccess,
        hasUnsavedChanges,
        setHasUnsavedChanges,
        IMPORT_TICKET_FIELDS
    };
};
