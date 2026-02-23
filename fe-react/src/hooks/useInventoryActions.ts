import { useState } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import { inventorySessionService } from '../services/inventory-session.service';
import { useScanSound } from '../hooks/useScanSound';
import type { InventorySession, ScannedItem } from '../services/inventory-session.service';
import type { LocalScannedItem } from '../types/inventory.type';

interface UseInventoryActionsProps {
    session: InventorySession | null;
    setSession: (s: InventorySession | null) => void;
    serverItems: ScannedItem[];
    setServerItems: React.Dispatch<React.SetStateAction<ScannedItem[]>>;
    localItems: LocalScannedItem[];
    setLocalItems: React.Dispatch<React.SetStateAction<LocalScannedItem[]>>;
    setSessionStatus: (status: 'init' | 'in-progress' | 'completed') => void;
    importInfo: any;
    selectedDeviceCode: string | null;
    navigate: any;
}

export const useInventoryActions = ({
    session,
    setSession,
    serverItems,
    setServerItems,
    localItems,
    setLocalItems,
    setSessionStatus,
    importInfo,
    selectedDeviceCode,
    navigate
}: UseInventoryActionsProps) => {
    const [isSaving, setIsSaving] = useState(false);
    const [scannedInput, setScannedInput] = useState('');
    const [manualMacs, setManualMacs] = useState('');
    const [duplicateMacs, setDuplicateMacs] = useState<string[]>([]);
    const [completeModalVisible, setCompleteModalVisible] = useState(false);
    const { playError, playSuccess } = useScanSound();

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

    const handleScanMac = async (inputRef: any) => {
        const code = scannedInput.trim();
        if (!code) return;

        if (!selectedDeviceCode) {
            playError();
            message.warning('Vui lòng CHỌN THIẾT BỊ trước khi quét!');
            return;
        }

        // Check trùng server
        const isDup = serverItems.some(i => i.mac === code);
        if (isDup) {
            playError();
            message.warning(`Mac ${code} đã tồn tại!`);
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
                playSuccess();
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

        const dups: string[] = [];
        const validItems: any[] = [];

        codes.forEach(code => {
            const isDup = serverItems.some(i => i.mac === code) || validItems.some(i => i.mac === code);
            if (isDup) dups.push(code);
            else validItems.push({
                mac: code,
                deviceModel: selectedDeviceCode,
                deviceCode: selectedDeviceCode
            });
        });

        if (validItems.length > 0) {
            try {
                setIsSaving(true);
                const updated = await inventorySessionService.update(session!.id, { scannedItems: validItems });
                if (updated && updated.details) {
                    setServerItems(updated.details);
                    message.success(`Đã lưu ${validItems.length} mac.`);
                }
            } catch (e) {
                message.error('Lỗi lưu danh sách');
            } finally {
                setIsSaving(false);
            }
        }

        if (dups.length > 0) {
            message.warning(`${dups.length} mac trùng lặp đã bị bỏ qua.`);
        }
        setManualMacs('');
    };

    const removeServerItem = async (mac: string) => {
        if (!session) return;
        try {
            await inventorySessionService.removeItem(session.id, mac);
            setServerItems(prev => prev.filter(i => i.mac !== mac));
            setDuplicateMacs(prev => prev.filter(s => s !== mac));
            message.success(`Đã xóa mac ${mac}`);
        } catch (e) {
            message.error('Không thể xóa thiết bị đã lưu');
        }
    };

    const handleRemoveLocalItem = (mac: string, inputRef: any) => {
        setLocalItems(prev => prev.filter(i => i.mac !== mac));
        inputRef.current?.focus();
    };

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

    return {
        isSaving,
        scannedInput,
        setScannedInput,
        manualMacs,
        setManualMacs,
        duplicateMacs,
        completeModalVisible,
        setCompleteModalVisible,
        handleStartSession,
        handleScanMac,
        handleManualImport,
        removeServerItem,
        handleRemoveLocalItem,
        handleCompleteInventory,
        handleCompleteConfirm
    };
};
