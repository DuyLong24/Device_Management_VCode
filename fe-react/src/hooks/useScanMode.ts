import { useState, useCallback } from 'react';

export type ScanMode = 'mac' | 'serial';

export const useScanMode = () => {
    const [mode, setModeState] = useState<ScanMode>(() => {
        return (localStorage.getItem('preferred_scan_mode') as ScanMode) || 'mac';
    });

    const setMode = useCallback((newMode: ScanMode) => {
        setModeState(newMode);
        localStorage.setItem('preferred_scan_mode', newMode);
    }, []);

    return { mode, setMode };
};
