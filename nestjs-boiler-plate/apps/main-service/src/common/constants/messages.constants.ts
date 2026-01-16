export const ERROR_MESSAGES = {
    DEVICE: {
        NOT_FOUND: 'Không tìm thấy thiết bị',
        UPDATE_FAILED: 'Cập nhật thiết bị thất bại',
        DELETE_FAILED: 'Xóa thiết bị thất bại',
        TRANSFER_SAME_WAREHOUSE: 'Thiết bị đã ở trong kho này',
        TRANSFER_RULE_NOT_FOUND: 'Lỗi: Không thể chuyển từ kho {from} sang {to} do chưa có cấu hình',
        TRANSFER_FAILED: 'Chuyển kho thất bại'
    },
    WAREHOUSE: {
        NOT_FOUND: 'Không tìm thấy kho',
        EXISTED: 'Kho đã tồn tại',
        CREATE_FAILED: 'Tạo kho thất bại',
        UPDATE_FAILED: 'Cập nhật kho thất bại',
        DELETE_FAILED: 'Xóa kho thất bại'
    },
    DEVICE_IMPORT: {
        NOT_FOUND: 'Không tìm thấy phiếu nhập thiết bị',
        CREATE_FAILED: 'Tạo phiếu nhập thất bại',
        UPDATE_FAILED: 'Cập nhật phiếu nhập thất bại',
        DELETE_FAILED: 'Xóa phiếu nhập thất bại',
        DRAFT_ONLY_EDIT: 'Chỉ được sửa các phiếu ở trạng thái DRAFT (nháp)',
        DRAFT_ONLY_DELETE: 'Chỉ được xóa các phiếu ở trạng thái DRAFT (nháp)',
        SERIAL_QUANTITY_MISMATCH: 'Sản phẩm {product}: Trang thái Serial khai báo ({serials}) không khớp với số lượng nhập ({quantity})',
        SERIAL_DUPLICATE: 'Sản phẩm {product}: Danh sách Serial có chứa mã trùng lặp'
    },
    DEVICE_EXPORT: {
        NOT_FOUND: 'Không tìm thấy phiếu xuất',
        CREATE_FAILED: 'Tạo phiếu xuất thất bại',
        UPDATE_FAILED: 'Cập nhật phiếu xuất thất bại',
        DELETE_FAILED: 'Xóa phiếu xuất thất bại'
    },
    INVENTORY: {
        SESSION_NOT_FOUND: 'Không tìm thấy phiên kiểm kê',
        ALREADY_COMPLETED: 'Phiên kiểm kê đã hoàn thành',
        IMPORT_NOT_FOUND: 'Phiếu nhập không tồn tại',
        IMPORT_ALREADY_COMPLETED: 'Phiếu nhập đã hoàn thành',
        SERIAL_EXISTED: 'Serial đã tồn tại trong phiên này: {serials}',
        CONFIG_ERROR: 'Cấu hình lỗi: Không tìm thấy kho {warehouse}',
        COMPLETE_FAILED: 'Lỗi hoàn tất phiên: {error}'
    },
    CATEGORY: {
        NOT_FOUND: 'Không tìm thấy danh mục',
        CREATE_FAILED: 'Tạo danh mục thất bại',
        UPDATE_FAILED: 'Cập nhật danh mục thất bại',
        DELETE_FAILED: 'Xóa danh mục thất bại'
    },
    COMMON: {
        NOT_FOUND: 'Không tìm thấy dữ liệu',
        BAD_REQUEST: 'Yêu cầu không hợp lệ',
        INTERNAL_ERROR: 'Lỗi hệ thống'
    }
};
