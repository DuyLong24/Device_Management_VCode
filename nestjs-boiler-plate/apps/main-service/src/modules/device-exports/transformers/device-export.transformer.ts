import { DeviceExport } from '../schemas/device-export.schemas';

export class DeviceExportTransformer {
    static transformDetail(deviceExport: DeviceExport, deviceMap: Map<string, any>): any {
        const deviceExportObj = deviceExport.toObject ? deviceExport.toObject() : deviceExport;

        if (deviceExportObj.items && deviceExportObj.items.length > 0) {
            deviceExportObj.items = deviceExportObj.items.map((item: any) => {
                const device = deviceMap.get(item.mac);
                let scannerName = item.scannedBy;

                if (item.scannedBy && typeof item.scannedBy === 'object') {
                    const u = item.scannedBy as any;
                    scannerName = u.name || u.fullName || u.username || u._id?.toString();
                }

                return {
                    ...item,
                    mac: item.mac,
                    deviceName: device?.name,
                    serial: device?.serial,
                    scannedBy: scannerName
                };
            });
        }

        return deviceExportObj;
    }
}
