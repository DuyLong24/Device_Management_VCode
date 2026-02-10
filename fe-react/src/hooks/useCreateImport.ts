import { useState, useEffect } from 'react';
import { Form, App } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';

import { importService } from '../services/import.service';
import { sharedDataService } from '../services/shared-data.service';
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

    // Modal States
    const [isMacModalOpen, setIsMacModalOpen] = useState(false);
    const [currentDeviceKey, setCurrentDeviceKey] = useState<string | null>(null);
    const [tempMacs, setTempMacs] = useState<string>('');
    const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);

    // --- React Query Fetching ---

    // 1. Models
    const { data: modelOptions = [] } = useQuery({
        queryKey: ['models'],
        queryFn: async () => {
            const models = await sharedDataService.getDataByGroupCode('MODEL');
            if (models && models.length > 0) {
                return models.map((m: any) => ({
                    label: m.code,
                    value: m.code,
                    stockName: m.name
                }));
            }
            return [];
        },
        staleTime: 5 * 60 * 1000 // 5 minutes
    });

    // 2. Import Detail (Edit Mode)
    useQuery({
        queryKey: ['import-detail', id],
        queryFn: () => importService.getImportDetail(id!),
        enabled: isEditMode,
        staleTime: 0,
        gcTime: 0
    });

    const generateImportCode = () => {
        const today = dayjs();
        const dateStr = today.format('DD/MM/YYYY');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `PN-${dateStr}-${random}`;
    };

    useEffect(() => {
        if (!isEditMode) {
            form.setFieldValue('code', generateImportCode());
            form.setFieldValue('importDate', dayjs());
            form.setFieldValue('origin', 'IMPORT');
            if (user && user.username) {
                form.setFieldValue('importedBy', user.username);
            }
            return;
        }

        const loadDetail = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const res = await importService.getImportDetail(id);
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
                    // origin: data.origin,
                    importDate: data.importDate ? dayjs(data.importDate) : undefined,
                    notes: data.notes,
                    status: data.status,
                    origin: data.origin || 'IMPORT'
                });

                if (data.devices && data.devices.length > 0) {
                    const mappedDevices: DeviceEntry[] = data.devices.map((device: any, index: number) => ({
                        key: device._id || `prod-${index}-${Date.now()}`,
                        deviceCode: device.deviceCode,
                        quantity: device.quantity || 0,
                        boxCount: device.boxCount || null,
                        itemsPerBox: device.itemsPerBox || null,
                        expectedMacs: device.expectedMacs || [],
                        macImported: device.macImported || 0,
                        expectedDetails: device.expectedDetails || []
                    }));
                    setDeviceList(mappedDevices);
                }
            } catch (err) {
                message.error('Không thể tải chi tiết phiếu nhập');
            } finally {
                setLoading(false);
            }
        };
        loadDetail();
    }, [id, isEditMode, form, user]);


    // Prevent Unload
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


    // --- Handlers ---

    const handleFormChange = () => setHasUnsavedChanges(true);

    const handleAddDevice = () => {
        const newDevice: DeviceEntry = {
            key: `device-${Date.now()}`,
            deviceCode: '',
            quantity: 1,
            boxCount: null,
            itemsPerBox: null,
            expectedMacs: [],
            macImported: 0,
            expectedDetails: []
        };
        setDeviceList([newDevice, ...deviceList]);
        setHasUnsavedChanges(true);
    };

    const handleDeleteDevice = (key: string) => {
        setDeviceList(deviceList.filter(item => item.key !== key));
        setHasUnsavedChanges(true);
    };

    const handleDeviceChange = (key: string, field: string, value: any) => {
        setDeviceList(prev => prev.map(item => {
            if (item.key === key) {
                const newItem = { ...item, [field]: value };
                if (field === 'deviceCode') {
                    newItem.expectedMacs = [];
                }
                return newItem;
            }
            return item;
        }));
        setHasUnsavedChanges(true);
    };

    const openMacModal = (record: DeviceEntry) => {
        setCurrentDeviceKey(record.key);
        setTempMacs((record.expectedMacs || []).join('\n'));
        setIsMacModalOpen(true);
    };

    const handleSaveMacs = (uniqueList: string[]) => {
        if (!currentDeviceKey) return;

        setDeviceList(prev => prev.map(p => {
            if (p.key === currentDeviceKey) {
                return { ...p, expectedMacs: uniqueList };
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
                deviceType: values.deviceType,
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
                    expectedMacs: p.expectedMacs,
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
                finalId = res?.data?.id || (res?.data as any)?._id || (res as any)?._id;
            }

            setHasUnsavedChanges(false);

            if (targetStatus === 'DRAFT') {
                if (isEditMode) {
                    // Stay
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
            const msg = error.response?.data?.message || 'Có lỗi xảy ra';
            message.error(Array.isArray(msg) ? msg.join(', ') : msg);
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
            macs: string[];
            details: any[];
        }>();

        details.forEach((row: any) => {
            const pCode = row.deviceCode;
            if (!pCode) return;

            const current = deviceMap.get(pCode) || {
                quantity: 0,
                boxCount: row.boxCount || null,
                itemsPerBox: row.itemsPerBox || null,
                macs: [] as string[],
                details: [] as any[]
            };

            let qty = Number(row.quantity) || 0;
            if (row.mac && qty === 0) qty = 1;

            current.quantity += qty;
            if (row.mac) {
                current.macs.push(row.mac);
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
                macImported: 0,
                expectedMacs: val.macs,
                expectedDetails: val.details
            });
        });

        // Add to TOP
        setDeviceList([...newDevices, ...deviceList]);
        setHasUnsavedChanges(true);
        message.success(`Đã thêm ${newDevices.length} dòng thiết bị từ Excel`);
    };

    const IMPORT_TICKET_FIELDS: any[] = [
        { key: 'deviceCode', label: 'Mã Model', required: true, description: 'Mã Model thiết bị' },
        { key: 'mac', label: 'MAC Address', required: true, description: 'Địa chỉ MAC (Duy nhất)' },
        { key: 'name', label: 'Tên thiết bị', required: false, description: 'Tên hiển thị' },
        { key: 'p2p', label: 'P2P', required: false, description: 'Mã P2P (Cloud)' },
        { key: 'serial', label: 'Serial Number', required: false, description: 'Số Serial' },
        // { key: 'quantity', label: 'Số lượng', required: false, description: 'Mặc định là 1 nếu có MAC' },
        // { key: 'boxCount', label: 'Số hộp', required: false },
        // { key: 'itemsPerBox', label: 'Số SP/Hộp', required: false },
    ];

    return {
        isEditMode,
        form,
        loading,
        deviceList,
        modelOptions,
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
