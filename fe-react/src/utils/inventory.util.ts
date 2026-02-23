import type { ImportDevice } from '../types/import.type';

export const getMacStatus = (mac: string, deviceCode: string | undefined, importDevices: ImportDevice[]) => {
    if (!importDevices || !deviceCode) return 'UNKNOWN';
    const device = importDevices.find(p => p.deviceCode === deviceCode);
    if (!device) return 'UNKNOWN';

    // Nếu không có expectedMacs -> Mặc định Match
    if (!device.expectedMacs || device.expectedMacs.length === 0) return 'MATCHED';

    return device.expectedMacs.includes(mac) ? 'MATCHED' : 'EXCESS';
};
