import { ExcelColumn } from 'apps/main-service/src/common/excel/interfaces/excel-column.interface';

export const COMPONENT_KEY = 'DEVICE';

export const DEVICE_STATUS = {
    PENDING: 'PENDING',
    PENDING_QC: 'PENDING_QC',
    READY_TO_EXPORT: 'READY_TO_EXPORT',
    PASS: 'PASS',
    DEFECT: 'DEFECT',
    IN_WARRANTY: 'IN_WARRANTY',
    SOLD: 'SOLD'
};

export const DEVICE_STATUS_LABEL: Record<string, string> = {
    [DEVICE_STATUS.PENDING]: 'Chờ QC',
    [DEVICE_STATUS.PENDING_QC]: 'Chờ QC',
    [DEVICE_STATUS.READY_TO_EXPORT]: 'Sẵn sàng xuất',
    [DEVICE_STATUS.PASS]: 'Sẵn sàng xuất',
    [DEVICE_STATUS.DEFECT]: 'Lỗi',
    [DEVICE_STATUS.IN_WARRANTY]: 'Đang bảo hành',
    [DEVICE_STATUS.SOLD]: 'Đã bán'
};

export const DEVICE_EXCEL_COLUMNS: ExcelColumn[] = [
    {
        header: 'STT',
        key: 'index',
        width: 8,
        alignment: 'center',
        format: (val, row, index) => index || 0
    },
    { header: 'Serial', key: 'serial', width: 20 },
    { header: 'Tên thiết bị', key: 'name', width: 30 },
    { header: 'Model', key: 'deviceModel', width: 20 },
    {
        header: 'Kho hiện tại',
        key: 'warehouseId.name',
        width: 25
    },
    {
        header: 'Trạng thái',
        key: 'status',
        width: 15,
        alignment: 'center',
        format: (val, row) => {
            const status = row.qcStatus || row.status;
            return DEVICE_STATUS_LABEL[status] || status || '';
        }
    },
    {
        header: 'Ngày nhập',
        key: 'importDate',
        width: 15,
        alignment: 'center',
        format: (val, row) => {
            const finalDate = val || row.createdAt;
            if (!finalDate) return '';
            const date = new Date(finalDate);
            return isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN');
        }
    }
];
