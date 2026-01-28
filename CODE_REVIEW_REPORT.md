# Báo cáo Code Review

**Ngày**: 28-01-2026
**Phạm vi**: Toàn dự án (Lấy mẫu Module Users Backend & Frontend)
**Tiêu chuẩn**: `.agent/rules/07-technical-standards.md`

## 📊 Tổng Quan
Quá trình review đã phát hiện một số vi phạm các tiêu chuẩn kỹ thuật, đặc biệt là liên quan đến Log (Ghi nhật ký), An toàn kiểu dữ liệu (Type Safety) và Quy tắc đặt tên. Một **Lỗi Bảo Mật Nghiêm Trọng** cũng đã được tìm thấy.

## 🔴 Vấn đề NGHIÊM TRỌNG (Phải sửa ngay lập tức)

### 1. 🛡️ Bảo mật: Lộ Mật Khẩu Dưới Dạng Văn Bản Thuần (Plain Text)
- **Vị trí**: `apps/main-service/src/common/services/user-keycloak-integration.service.ts` (Dòng 269)
- **Mã lỗi**: `console.log('[KeycloakSync] Payload:', user);`
- **Vấn đề**: Khi cập nhật user (hoặc đồng bộ), đối tượng `user` chứa mảng `credentials` (bao gồm mật khẩu). Việc này khiến mật khẩu người dùng bị ghi lại vào log server mà không được mã hóa.
- **Vi phạm**: Các nguyên tắc bảo mật cơ bản.

## 🟠 Mức độ CAO (Cần sửa theo Tiêu chuẩn Kỹ thuật)

### 1. 📝 Logging (Quy tắc #4 Xử lý Lỗi)
- **Vi phạm**: Sử dụng tràn lan `console.log` và `console.error`.
- **Tiêu chuẩn**: "Structured Logging: Sử dụng `logger.error(...)`".
- **Các file bị ảnh hưởng**:
  - `user-keycloak-integration.service.ts`
  - `user-management.service.ts`
- **Khuyến nghị**: Thay thế `console` bằng dịch vụ `Logger` của NestJS.

### 2. ⚠️ An toàn kiểu dữ liệu (Quy tắc #3 Type Safety)
- **Vi phạm**: Sử dụng kiểu `any`.
- **Tiêu chuẩn**: "Strict Typing: Khai báo kiểu rõ ràng cho tham số và giá trị trả về".
- **Các file bị ảnh hưởng**:
  - `user-management.service.ts` (Backend): `user: any`, `query: any`.
  - `user-management.service.ts` (Frontend): `axiosInstance.get<any>`.
  - `CreateUserModal.tsx`: `onCreate(data: any)`.
- **Khuyến nghị**: Định nghĩa Interface (`UserEntity`, `FilterParams`) và DTO nghiêm ngặt.

### 3. 🛡️ Xử lý lỗi (Quy tắc #4 Xử lý Lỗi)
- **Vi phạm**: "Nuốt" lỗi (swallowing errors) hoặc xử lý chung chung.
- **Các file bị ảnh hưởng**:
  - `useUserManagement.ts`: `catch (error: any) { message.error(...) }`.
  - Các service Backend thường catch lỗi và chỉ `console.error` mà không throw ra hoặc trả về kiểu Result (ví dụ như trong Keycloak service trả về null một cách lặng lẽ).
- **Khuyến nghị**: Đảm bảo lỗi được xử lý hoặc ném ra (propagate) với đầy đủ ngữ cảnh.

## 🟡 Mức độ TRUNG BÌNH (Cải thiện)

### 1. 📛 Quy tắc đặt tên (Quy tắc #1 Naming)
- **Vi phạm**: Đặt tên không nhất quán giữa Frontend và Backend.
- **Ví dụ**: Backend dùng `name`, Frontend dùng `fullName`. Frontend phải tự chuyển đổi (map) thủ công khi submit.
- **Khuyến nghị**: Chuẩn hóa dùng `name` hoặc `fullName` trên toàn bộ stack để giảm thiễu mã mapping dễ gây lỗi.

### 2. 🏗️ Luồng Logic (Quy tắc #2 Function & Logic)
- **Vi phạm**: Hardcoded Logic / Magic Strings (Chuỗi ký tự cứng).
- **Ví dụ**: `user-management.controller.ts` sử dụng các chuỗi `'active'`, `'inactive'`.
- **Khuyến nghị**: Sử dụng Enums (`UserStatus.Active`) để tránh lỗi đánh máy và dễ refactor.

### 3. Phân tách trách nhiệm (Separation of Concerns)
- **Quan sát**: Hook `useUserManagement` xử lý cả việc lấy dữ liệu API VÀ trạng thái giao diện (Modals).
- **Khuyến nghị**: Tách thành `useUserList` (Dữ liệu) và `useUserModals` (Giao diện) để tăng khả năng bảo trì (Quy tắc #2 "Single Responsibility").

## 🟢 Điểm mạnh
- **Kiến trúc**: Cấu trúc module NestJS được tổ chức tốt (Controllers, Services, DTOs).
- **Frontend**: Các service API được tách biệt khỏi Components.

---
**Các bước tiếp theo**:
1. Sửa lỗi Bảo mật Nghiêm trọng ngay lập tức.
2. Refactor lại Logging để sử dụng `Logger`.
3. Siết chặt An toàn kiểu dữ liệu (loại bỏ `any`).
