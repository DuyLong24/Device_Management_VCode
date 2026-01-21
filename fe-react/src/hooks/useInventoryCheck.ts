import { useState, useEffect, useMemo, useRef } from 'react';
import { message, Form } from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { importService } from '../services/import.service';
import { inventorySessionService } from '../services/inventory-session.service';

import type { InventorySession, ScannedItem } from '../services/inventory-session.service';
import type { DeviceImport } from '../types/import.type';
import { useScanSound } from '../hooks/useScanSound';

export type LocalScannedItem = ScannedItem & { productCode?: string };

export const useInventoryCheck = () => {

    const navigate = useNavigate();
    const { importId } = useParams<{ importId: string }>();
    const [searchParams] = useSearchParams();
    const sessionIdParam = searchParams.get('sessionId');

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [sessionStatus, setSessionStatus] = useState<'init' | 'in-progress' | 'completed'>('init');
    const [completeModalVisible, setCompleteModalVisible] = useState(false);

    const [importInfo, setImportInfo] = useState<DeviceImport | null>(null);
    const [session, setSession] = useState<InventorySession | null>(null);
    const [createForm] = Form.useForm();

    const [serverItems, setServerItems] = useState<ScannedItem[]>([]);
    const [localItems, setLocalItems] = useState<LocalScannedItem[]>([]);

    const [scannedInput, setScannedInput] = useState('');
    const [manualSerials, setManualSerials] = useState('');
    const [selectedProductCode, setSelectedProductCode] = useState<string | null>(null);

    const inputRef = useRef<any>(null);
    const { playError, playSuccess } = useScanSound();

    const storageKey = useMemo(() => session ? `inventory_data_${session.id}` : null, [session]);

    useEffect(() => {
        if (storageKey) {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) setLocalItems(parsed);
                } catch (e) { console.error(e); }
            }
        }
    }, [storageKey]);

    useEffect(() => {
        if (storageKey) {
            localItems.length > 0
                ? localStorage.setItem(storageKey, JSON.stringify(localItems))
                : localStorage.removeItem(storageKey);
        }
    }, [localItems, storageKey]);

    useEffect(() => {
        if (importId) loadData(importId);
    }, [importId, sessionIdParam]);

    const loadData = async (id: string) => {
        setLoading(true);
        try {
            const importRes = await importService.getImportDetail(id);
            setImportInfo(importRes.data);

            if (importRes.data.products?.length === 1) {
                setSelectedProductCode(importRes.data.products[0].productCode);
            }

            const sessions = await inventorySessionService.getByImportId(id);
            let activeSession: InventorySession | undefined;

            if (sessionIdParam) {
                activeSession = sessions.find(s => s.id === sessionIdParam);
            } else {
                activeSession = sessions.find(s => s.status === 'processing');
            }

            if (activeSession) {
                setSession(activeSession);
                const sortedDetails = (activeSession.details || []).sort((a: any, b: any) => {
                    return new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime();
                });

                setServerItems(sortedDetails);
                setSessionStatus(activeSession.status === 'completed' ? 'completed' : 'in-progress');
            } else {
                setSessionStatus('init');
                if (!sessionIdParam) {
                    createForm.setFieldsValue({ sessionName: `Kiểm kê lần 1 (${dayjs().format('DD/MM/YYYY')})` });
                }
            }
        } catch (e) {
            message.error('Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const removeServerItem = async (serial: string) => {
        if (!session) return;
        try {
            await inventorySessionService.removeItem(session.id, serial);
            setServerItems(prev => prev.filter(i => i.serial !== serial));
            setDuplicateSerials(prev => prev.filter(s => s !== serial)); // Clear from duplicate list
            message.success(`Đã xóa serial ${serial}`);
        } catch (e) {
            message.error('Không thể xóa item đã lưu');
        }
    };

    const handleStartSession = async () => {
        if (!importInfo) return;
        try {
            const newSession = await inventorySessionService.create({
                importId: importInfo.id,
                name: `Kiểm kê ${dayjs().format('DD/MM/YYYY HH:mm')}`,
                note: 'Bắt đầu từ giao diện kiểm kê'
            });
            setSession(newSession);
            setServerItems([]);
            setSessionStatus('in-progress');
            message.success('Đã bắt đầu phiên kiểm kê mới');
        } catch (e) {
            message.error('Không thể tạo phiên kiểm kê');
        }
    };

    const handleScanSerial = () => {
        const code = scannedInput.trim();
        if (!code) return;

        if (!selectedProductCode) {
            playError();
            message.warning('Vui lòng CHỌN SẢN PHẨM trước khi quét!');
            return;
        }

        const isDup = [...localItems, ...serverItems].some(i => i.serial === code);
        if (isDup) {
            playError();
            message.warning(`Serial ${code} đã tồn tại!`);
            setScannedInput('');
            return;
        }

        playSuccess();

        const newItem: LocalScannedItem = {
            serial: code,
            model: selectedProductCode,
            productCode: selectedProductCode,
            scannedAt: new Date().toISOString()
        } as any;

        setLocalItems(prev => [newItem, ...prev]);
        setScannedInput('');
        inputRef.current?.focus();
    };

    const handleManualImport = () => {
        if (!manualSerials.trim() || !selectedProductCode) {
            message.warning('Vui lòng chọn sản phẩm và nhập danh sách serial');
            return;
        }

        const codes = manualSerials.split('\n').map(s => s.trim()).filter(Boolean);
        const newItems: LocalScannedItem[] = [];
        const duplicates: string[] = [];

        codes.forEach(code => {
            const isDup = [...localItems, ...serverItems, ...newItems].some(i => i.serial === code);
            if (isDup) duplicates.push(code);
            else newItems.push({
                serial: code,
                model: selectedProductCode,
                productCode: selectedProductCode,
                scannedAt: new Date().toISOString()
            } as any);
        });

        if (newItems.length > 0) {
            setLocalItems(prev => [...newItems, ...prev]);
            message.success(`Đã thêm ${newItems.length} serial.`);
        }
        if (duplicates.length > 0) {
            message.warning(`${duplicates.length} serial bị trùng đã bị bỏ qua.`);
        }
        setManualSerials('');
    };

    const handleSaveItems = async () => {
        if (!session || localItems.length === 0) return;
        try {
            setIsSaving(true);
            const payload = {
                scannedItems: localItems.map(i => ({
                    serial: i.serial,
                    deviceModel: i.deviceModel,
                    productCode: i.productCode
                }))
            };
            const updated = await inventorySessionService.update(session.id, payload);
            if (updated && updated.details) {
                setServerItems(updated.details);
                setLocalItems([]);
                message.success(`Đã lưu thành công ${payload.scannedItems.length} mã vào hệ thống!`);
            }
        } catch (e) { message.error('Lỗi lưu dữ liệu'); }
        finally { setIsSaving(false); }
    };

    const [duplicateSerials, setDuplicateSerials] = useState<string[]>([]);

    const handleCompleteInventory = () => {
        if (localItems.length > 0) {
            message.warning('Vui lòng bấm LƯU các serial mới trước khi hoàn tất!');
            return;
        }
        setDuplicateSerials([]); // Clear old errors
        setCompleteModalVisible(true);
    };

    const handleCompleteConfirm = async () => {
        if (!session) return;
        try {
            setIsSaving(true);
            setDuplicateSerials([]);
            await inventorySessionService.update(session.id, { status: 'completed' });
            message.success('Hoàn tất kiểm kê thành công!');
            setSessionStatus('completed');
            setCompleteModalVisible(false);
            navigate('/import/list');
        } catch (e: any) {
            const data = e.response?.data;
            const msg = data?.message || 'Lỗi hoàn tất phiên';

            if (data?.duplicates && Array.isArray(data.duplicates)) {
                setDuplicateSerials(data.duplicates);
                message.error(`Có ${data.duplicates.length} serial bị trùng lặp!`);
            } else {
                message.error(msg);
            }
        } finally { setIsSaving(false); }
    };

    const handleRemoveLocalItem = (serial: string) => {
        setLocalItems(prev => prev.filter(i => i.serial !== serial));
        inputRef.current?.focus();
    };

    return {
        loading, isSaving, session, importInfo, serverItems, localItems, sessionStatus,
        scannedInput, setScannedInput, manualSerials, setManualSerials,
        selectedProductCode, setSelectedProductCode, inputRef,
        completeModalVisible, setCompleteModalVisible,
        handleStartSession, handleScanSerial, handleManualImport,
        handleSaveItems, handleCompleteInventory, handleCompleteConfirm, handleRemoveLocalItem,
        navigate,
        removeServerItem,
        setLocalItems,
        duplicateSerials,
    };
};