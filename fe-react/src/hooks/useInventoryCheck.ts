import { useRef, useMemo, useEffect, useState } from 'react';
import { Form } from 'antd';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useInventoryData } from './useInventoryData';
import { useInventoryActions } from './useInventoryActions';
import type { LocalScannedItem } from '../types/inventory.type';

export const useInventoryCheck = () => {
    const navigate = useNavigate();
    const { importId } = useParams<{ importId: string }>();
    const [searchParams] = useSearchParams();
    const sessionIdParam = searchParams.get('sessionId');
    const inputRef = useRef<any>(null);
    const [createForm] = Form.useForm();

    const [localItems, setLocalItems] = useState<LocalScannedItem[]>([]);

    const {
        loading,
        importInfo,
        session,
        setSession,
        serverItems,
        setServerItems,
        sessionStatus,
        setSessionStatus,
        otherCompletedCount,
        otherCompletedItemsByModel,
        deviceModels,
        selectedDeviceCode,
        setSelectedDeviceCode,
        initialSessionName
    } = useInventoryData(importId, sessionIdParam || undefined);

    // Sync tên phiên kiểm kê
    useEffect(() => {
        if (initialSessionName) {
            createForm.setFieldsValue({ sessionName: initialSessionName });
        }
    }, [initialSessionName, createForm]);


    // Logic lưu trữ
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


    const actions = useInventoryActions({
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
    });

    return {
        // Data
        loading,
        session,
        importInfo,
        serverItems,
        localItems,
        setLocalItems,
        sessionStatus,
        otherCompletedCount,
        otherCompletedItemsByModel,
        deviceModels,
        selectedDeviceCode,
        setSelectedDeviceCode,

        // Actions & UI State from Actions
        isSaving: actions.isSaving,
        scannedInput: actions.scannedInput,
        setScannedInput: actions.setScannedInput,
        manualMacs: actions.manualMacs,
        setManualMacs: actions.setManualMacs,
        duplicateMacs: actions.duplicateMacs,
        completeModalVisible: actions.completeModalVisible,
        setCompleteModalVisible: actions.setCompleteModalVisible,

        handleStartSession: actions.handleStartSession,
        handleScanMac: () => actions.handleScanMac(inputRef),
        handleManualImport: actions.handleManualImport,
        removeServerItem: actions.removeServerItem,
        handleRemoveLocalItem: (mac: string) => actions.handleRemoveLocalItem(mac, inputRef),
        handleCompleteInventory: actions.handleCompleteInventory,
        handleCompleteConfirm: actions.handleCompleteConfirm,

        // Refs & Nav
        inputRef,
        navigate,
        createForm
    };
};
