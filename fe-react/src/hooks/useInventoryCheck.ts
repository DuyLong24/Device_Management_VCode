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
    const [otherCompletedCount, setOtherCompletedCount] = useState(0);

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

            // Calculate other completed count
            const completedSessions = sessions.filter(s => s.status === 'completed' && s.id !== activeSession?.id);
            const othersCount = completedSessions.reduce((acc, s) => acc + (s.totalScanned || 0), 0);
            setOtherCompletedCount(othersCount);

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

    const handleScanSerial = async () => {
        const code = scannedInput.trim();
        if (!code) return;

        if (!selectedProductCode) {
            playError();
            message.warning('Vui lòng CHỌN SẢN PHẨM trước khi quét!');
            return;
        }

        // Check trùng (Server Only now)
        const isDup = serverItems.some(i => i.serial === code);
        if (isDup) {
            playError();
            message.warning(`Serial ${code} đã tồn tại!`);
            setScannedInput('');
            return;
        }

        try {
            // Save Immediately
            setIsSaving(true);
            const payload = {
                scannedItems: [{
                    serial: code,
                    deviceModel: selectedProductCode,
                    productCode: selectedProductCode
                }]
            };

            const updated = await inventorySessionService.update(session!.id, payload);
            if (updated && updated.details) {
                playSuccess();
                message.success(`Đã lưu serial: ${code}`);
                setServerItems(updated.details);
            }
        } catch (e) {
            playError();
            message.error('Lỗi khi lưu serial này. Vui lòng thử lại.');
        } finally {
            setIsSaving(false);
            setScannedInput('');
            inputRef.current?.focus();
        }
    };

    const handleManualImport = async () => {
        if (!manualSerials.trim() || !selectedProductCode) {
            message.warning('Vui lòng chọn sản phẩm và nhập danh sách serial');
            return;
        }

        const codes = manualSerials.split('\n').map(s => s.trim()).filter(Boolean);
        if (codes.length === 0) return;

        const dups: string[] = [];
        const validItems: any[] = [];

        codes.forEach(code => {
            const isDup = serverItems.some(i => i.serial === code) || validItems.some(i => i.serial === code);
            if (isDup) dups.push(code);
            else validItems.push({
                serial: code,
                deviceModel: selectedProductCode,
                productCode: selectedProductCode
            });
        });

        if (validItems.length > 0) {
            try {
                setIsSaving(true);
                const updated = await inventorySessionService.update(session!.id, { scannedItems: validItems });
                if (updated && updated.details) {
                    setServerItems(updated.details);
                    message.success(`Đã lưu ${validItems.length} serial.`);
                }
            } catch (e) {
                message.error('Lỗi lưu danh sách');
            } finally {
                setIsSaving(false);
            }
        }

        if (dups.length > 0) {
            message.warning(`${dups.length} serial trùng lặp đã bị bỏ qua.`);
        }
        setManualSerials('');
    };

    // Removed handleSaveItems

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
        handleCompleteInventory, handleCompleteConfirm, handleRemoveLocalItem,
        navigate,
        removeServerItem,
        setLocalItems,
        duplicateSerials,
        otherCompletedCount
    };
};