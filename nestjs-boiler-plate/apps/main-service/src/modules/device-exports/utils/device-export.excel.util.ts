import { DeviceExport } from '../schemas/device-export.schemas';

export class DeviceExportExcelUtil {
    static prepareExcelData(exportRecord: DeviceExport, deviceMap: Map<string, any>) {
        // 1. Thông tin phiếu xuất
        const info = [
            { label: 'MÃ PHIẾU', value: exportRecord.code },
            { label: 'TÊN PHIẾU', value: exportRecord.exportName || '--' },
            { label: 'LOẠI XUẤT', value: exportRecord.type },
            { label: 'TRẠNG THÁI', value: exportRecord.status },
            { label: 'NGÀY TẠO', value: exportRecord.createdAt ? new Date(exportRecord.createdAt).toLocaleDateString('vi-VN') : '--' },
            { label: 'NGƯỜI NHẬN', value: exportRecord.receiver || exportRecord.receiverPerson || '--' },
            { label: 'DỰ ÁN / KH', value: exportRecord.project || exportRecord.customer || '--' },
            { label: 'GHI CHÚ', value: exportRecord.notes || '--' },
        ];

        // 2. Chuẩn bị dữ liệu bảng
        let tableData: any[] = [];
        let columns: any[] = [];

        if (exportRecord.items && exportRecord.items.length > 0) {
            // Xuất danh sách thiết bị thực tế
            columns = [
                { header: 'STT', key: 'stt', width: 10, alignment: 'center' },
                { header: 'MAC Address', key: 'mac', width: 25 },
                { header: 'Serial', key: 'serial', width: 25 },
                { header: 'Model', key: 'deviceModel', width: 25 },
                { header: 'Tên thiết bị', key: 'deviceName', width: 35 },
            ];

            tableData = exportRecord.items.map((item, index) => {
                const device = deviceMap.get(item.mac);
                const name = device?.name || '--';

                return {
                    stt: index + 1,
                    mac: item.mac,
                    serial: device?.serial || '--',
                    deviceModel: item.deviceModel || device?.deviceModel,
                    deviceName: name
                };
            });
        } else {
            // Xuất danh sách yêu cầu
            columns = [
                { header: 'STT', key: 'stt', width: 10, alignment: 'center' },
                { header: 'Mã Model', key: 'deviceModel', width: 25 },
                { header: 'Số lượng yêu cầu', key: 'quantity', width: 20, alignment: 'center' },
            ];

            tableData = (exportRecord.requirements || []).map((req, index) => ({
                stt: index + 1,
                deviceModel: req.deviceCode,
                quantity: req.quantity
            }));
        }

        return { info, tableData, columns };
    }
}
