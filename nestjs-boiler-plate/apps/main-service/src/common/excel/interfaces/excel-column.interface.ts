export interface ExcelColumn {
    header: string;       // Tiêu đề cột (VD: "Tên thiết bị")
    key: string;          // Key dữ liệu (VD: "name" hoặc "warehouseId.name")
    width?: number;       // Độ rộng (Mặc định 20)

    /**
     * Hàm format dữ liệu tùy chỉnh.
     * @param value Giá trị raw của field tương ứng
     * @param row Toàn bộ object data của dòng đó (để kết hợp field khác nếu cần)
     * @param index Số thứ tự dòng (bắt đầu từ 1)
     */
    format?: (value: any, row?: any, index?: number) => string | number | Date;

    alignment?: 'left' | 'center' | 'right'; // Căn lề
}