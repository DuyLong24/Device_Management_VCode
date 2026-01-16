# Template-Based NestJS Module Generator

## Cấu trúc project

```
NestJsTemplate/
├── generate.js              # Main generator script
├── templates/               # Template files (có thể tùy chỉnh)
│   ├── entity.txt          # Entity template
│   ├── create-dto.txt      # Create DTO template  
│   ├── update-dto.txt      # Update DTO template
│   ├── repository.txt      # Repository template
│   ├── service.txt         # Service template
│   ├── controller.txt      # Controller template
│   └── module.txt          # Module template
├── GENERATOR_README.md     # Hướng dẫn chi tiết
└── src/                    # Generated modules sẽ được tạo ở đây
```

## Cách hoạt động

1. **Generator script** (`generate.js`) đọc các template từ thư mục `templates/`
2. **Replace variables** trong template với các giá trị cụ thể
3. **Tạo files** theo cấu trúc NestJS chuẩn

## Template Variables

- `{{MODULE_NAME_CAPITAL}}` - Tên module viết hoa
- `{{MODULE_NAME_LOWER}}` - Tên module viết thường  
- `{{FIELDS}}` - Các trường dữ liệu
- `{{VALIDATORS}}` - Validators cho DTO

## Lợi ích của cấu trúc mới

✅ **Dễ tùy chỉnh**: Chỉ cần sửa file template
✅ **Tái sử dụng**: Template có thể dùng cho nhiều dự án
✅ **Bảo trì dễ dàng**: Code template tách biệt khỏi logic generator
✅ **Mở rộng**: Dễ thêm template mới
✅ **Version control**: Template có thể được track riêng

## Sử dụng nhanh

```bash
# Tạo module mới
node generate.js product name:string price:number description:string

# Module sẽ được tạo tại: src/products/
```

## Tùy chỉnh template

Để thay đổi cấu trúc code được sinh ra, chỉ cần chỉnh sửa file template tương ứng trong thư mục `templates/`.
