import { useState, useEffect, useMemo, useRef } from 'react';
import { message, Form } from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { importService } from '../services/import.service';
import { sharedDataService } from '../services/shared-data.service';
import { inventorySessionService } from '../services/inventory-session.service';

import type { InventorySession, ScannedItem } from '../services/inventory-session.service';
import type { DeviceImport } from '../types/import.type';
import { useScanSound } from '../hooks/useScanSound';

export type LocalScannedItem = ScannedItem & { deviceCode?: string };

// Web Audio API beep (standalone, no React deps)
export const playSuccessSound = () => {
    try {
        // Trỏ thẳng vào file mp3 nằm trong thư mục public
        const audio = new Audio('/iphone-beep.m4a');

        // Vặn max volume 100% để át tiếng ồn xưởng
        audio.volume = 1.0;

        // Phát nhạc!
        audio.play().catch(e => console.log("Trình duyệt chặn autoplay:", e));
    } catch (_) {
        /* silent fail */
    }
};

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
    const [manualMacs, setManualMacs] = useState('');
    const [otherCompletedCount, setOtherCompletedCount] = useState(0);
    const [otherCompletedItemsByModel, setOtherCompletedItemsByModel] = useState<Record<string, number>>({});
    const [otherScannedMacs, setOtherScannedMacs] = useState<string[]>([]);

    const [selectedDeviceCode, setSelectedDeviceCode] = useState<string | null>(null);
    const [deviceModels, setDeviceModels] = useState<any[]>([]);

    // State bật/tắt âm thanh + localStorage persistence
    const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() =>
        localStorage.getItem('inventory_sound_enabled') !== 'false'
    );
    useEffect(() => {
        localStorage.setItem('inventory_sound_enabled', String(isSoundEnabled));
    }, [isSoundEnabled]);

    const inputRef = useRef<any>(null);
    const { playError } = useScanSound();

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
            const [importRes, models] = await Promise.all([
                importService.getImportDetail(id),
                sharedDataService.getDataByGroupCode('MODEL').catch(() => [])
            ]);
            setImportInfo(importRes.data);
            setDeviceModels(models);

            if (importRes.data.devices?.length === 1) {
                setSelectedDeviceCode(importRes.data.devices[0].deviceCode);
            }

            const sessions = await inventorySessionService.getByImportId(id);
            let activeSession: InventorySession | undefined;

            if (sessionIdParam) {
                activeSession = sessions.find(s => s.id === sessionIdParam);
            } else {
                activeSession = sessions.find(s => s.status === 'processing');
            }

            // Tính tổng số lượng đã kiểm kê
            const completedSessions = sessions.filter(s => s.status === 'completed' && s.id !== activeSession?.id);
            const othersCount = completedSessions.reduce((acc, s) => acc + (s.totalScanned || 0), 0);
            setOtherCompletedCount(othersCount);

            // Tính tổng số lượng đã kiểm kê theo model + trích xuất toàn bộ MAC đã quét ở phiên khác
            const itemsByModel: Record<string, number> = {};
            const allOtherMacs: string[] = [];
            completedSessions.forEach(session => {
                (session.details || []).forEach((item: any) => {
                    const deviceCode = item.deviceCode || item.deviceModel;
                    if (deviceCode) {
                        itemsByModel[deviceCode] = (itemsByModel[deviceCode] || 0) + 1;
                    }
                    if (item.mac) allOtherMacs.push(item.mac);
                });
            });
            setOtherCompletedItemsByModel(itemsByModel);
            setOtherScannedMacs(allOtherMacs);

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

    const removeServerItem = async (mac: string) => {
        if (!session) return;
        try {
            await inventorySessionService.removeItem(session.id, mac);
            setServerItems(prev => prev.filter(i => i.mac !== mac));
            setDuplicateMacs(prev => prev.filter(s => s !== mac)); // Xóa khỏi danh sách trùng nếu có
            message.success(`Đã xóa mac ${mac}`);
        } catch (e) {
            message.error('Không thể xóa thiết bị đã lưu');
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

    const handleScanMac = async () => {
        const code = scannedInput.trim();
        if (!code) return;

        if (!selectedDeviceCode) {
            playError();
            message.warning('Vui lòng CHỌN THIẾT BỊ trước khi quét!');
            return;
        }

        // Check trùng (Bao gồm cả phiên hiện tại, mảng local, và các phiên trước)
        const isDup = serverItems.some(i => i.mac === code) ||
            localItems.some(i => i.mac === code) ||
            (typeof otherScannedMacs !== 'undefined' && otherScannedMacs.includes(code));

        if (isDup) {
            playError();
            message.error(`Mac ${code} bị trùng! Kiểm tra danh sách.`);

            setLocalItems(prev => [{
                mac: code,
                deviceModel: selectedDeviceCode,
                deviceCode: selectedDeviceCode,
                scannedAt: new Date().toISOString()
            }, ...prev]);

            setDuplicateMacs(prev => Array.from(new Set([...prev, code])));
            setScannedInput('');
            return;
        }

        try {
            // Lưu lên server
            setIsSaving(true);
            const payload = {
                scannedItems: [{
                    mac: code,
                    deviceModel: selectedDeviceCode,
                    deviceCode: selectedDeviceCode
                }]
            };

            const updated = await inventorySessionService.update(session!.id, payload);
            if (updated && updated.details) {
                // Trigger âm thanh tại điểm "Save thành công"
                if (isSoundEnabled) playSuccessSound();
                message.success(`Đã lưu mac: ${code}`);
                setServerItems(updated.details);
            }
        } catch (e) {
            playError();
            message.error('Lỗi khi lưu mac này. Vui lòng thử lại.');
        } finally {
            setIsSaving(false);
            setScannedInput('');
            inputRef.current?.focus();
        }
    };

    const handleManualImport = async () => {
        if (!manualMacs.trim() || !selectedDeviceCode) {
            message.warning('Vui lòng chọn thiết bị và nhập danh sách mac');
            return;
        }

        const codes = manualMacs.split('\n').map(s => s.trim()).filter(Boolean);
        if (codes.length === 0) return;

        const dups: any[] = []; // Chứa item lỗi
        const validItems: any[] = []; // Chứa item ngon

        codes.forEach(code => {
            const isDup = serverItems.some(i => i.mac === code) ||
                validItems.some(i => i.mac === code) ||
                localItems.some(i => i.mac === code) ||
                (typeof otherScannedMacs !== 'undefined' && otherScannedMacs.includes(code));

            if (isDup) {
                // BẮT QUẢ TANG MÃ TRÙNG -> Lưu lại để ném ra UI
                dups.push({
                    mac: code,
                    deviceModel: selectedDeviceCode,
                    deviceCode: selectedDeviceCode,
                    scannedAt: new Date().toISOString()
                });
            } else {
                validItems.push({
                    mac: code,
                    deviceModel: selectedDeviceCode,
                    deviceCode: selectedDeviceCode
                });
            }
        });

        // 1. Gửi bọn mã Hợp lệ lên Server
        if (validItems.length > 0) {
            try {
                setIsSaving(true);
                const updated = await inventorySessionService.update(session!.id, { scannedItems: validItems });
                if (updated && updated.details) {
                    setServerItems(updated.details);
                    message.success(`Đã lưu ${validItems.length} mac hợp lệ.`);
                    if (isSoundEnabled) playSuccessSound(); // Kêu Típ báo ngon
                }
            } catch (e) {
                message.error('Lỗi lưu danh sách');
            } finally {
                setIsSaving(false);
            }
        }

        // 2. Ném bọn mã Trùng lặp ra Table để bêu riếu
        if (dups.length > 0) {
            playError(); // Kêu bíp bíp báo lỗi
            setLocalItems(prev => [...dups, ...prev]);
            setDuplicateMacs(prev => Array.from(new Set([...prev, ...dups.map(d => d.mac)])));
            message.error(`Phát hiện ${dups.length} mã TRÙNG LẶP! Hãy kiểm tra lại ở danh sách.`);
        }

        setManualMacs('');
    };

    const [duplicateMacs, setDuplicateMacs] = useState<string[]>([]);

    const handleCompleteInventory = () => {
        if (localItems.length > 0) {
            message.warning('Vui lòng bấm LƯU các mac mới trước khi hoàn tất!');
            return;
        }
        setDuplicateMacs([]);
        setCompleteModalVisible(true);
    };

    const handleCompleteConfirm = async () => {
        if (!session) return;
        try {
            setIsSaving(true);
            setDuplicateMacs([]);
            await inventorySessionService.update(session.id, { status: 'completed' });
            message.success('Hoàn tất kiểm kê thành công!');
            setSessionStatus('completed');
            setCompleteModalVisible(false);
            navigate('/import/inventory-list');
        } catch (e: any) {
            const data = e.response?.data;
            const msg = data?.message || 'Lỗi hoàn tất phiên';

            if (data?.duplicates && Array.isArray(data.duplicates)) {
                setDuplicateMacs(data.duplicates);
                message.error(`Có ${data.duplicates.length} mac bị trùng lặp!`);
            } else {
                message.error(msg);
            }
        } finally { setIsSaving(false); }
    };

    const handleRemoveLocalItem = (mac: string) => {
        setLocalItems(prev => prev.filter(i => (i as any).mac !== mac));
        inputRef.current?.focus();
    };

    return {
        loading, isSaving, session, importInfo, serverItems, localItems, sessionStatus,
        scannedInput, setScannedInput, manualMacs, setManualMacs,
        selectedDeviceCode, setSelectedDeviceCode, inputRef,
        completeModalVisible, setCompleteModalVisible,
        handleStartSession, handleScanMac, handleManualImport,
        handleCompleteInventory, handleCompleteConfirm, handleRemoveLocalItem,
        navigate,
        removeServerItem,
        setLocalItems,
        duplicateMacs,
        otherCompletedCount,
        otherCompletedItemsByModel,
        deviceModels,
        isSoundEnabled, setIsSoundEnabled,
        otherScannedMacs,
    };
};
