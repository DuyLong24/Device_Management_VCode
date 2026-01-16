# Hướng Dẫn Import và Sử Dụng Postman Collection

## 📋 Tổng quan
Hệ thống generator đã được cập nhật để tự động tạo ra Postman collection hoàn chỉnh cho mỗi module được generate, bao gồm tất cả các endpoint CRUD và pagination.

## 🚀 Cách Import Postman Collection

### Bước 1: Mở Postman
- Khởi động ứng dụng Postman Desktop hoặc truy cập Postman Web

### Bước 2: Import Collection
1. Click vào nút **"Import"** ở góc trái trên
2. Chọn tab **"File"**
3. Click **"Choose Files"** và chọn file JSON collection (VD: `product-api-collection.json`)
4. Click **"Import"**

### Bước 3: Import Environment (Optional)
1. Import file `product-api-environment.json` theo cách tương tự
2. Set environment bằng cách click dropdown ở góc phải trên và chọn "Product API Environment"

## 📁 Files được tạo tự động

Khi generate module mới, bạn sẽ có:
```
postman/
├── {module}-api-collection.json     # Main collection với tất cả endpoints
└── {module}-api-environment.json    # Environment variables
```

## 🔧 Environment Variables

### Default Variables:
- `baseUrl`: http://localhost:3000
- `{module}Id`: Sample ID để test các endpoint cần ID
- `authToken`: Để authentication (nếu cần)

### Cách sử dụng:
1. Update `baseUrl` nếu server chạy ở port khác
2. Copy real ID từ response và paste vào `{module}Id` variable
3. Set `authToken` nếu API yêu cầu authentication

## 📝 Collection Structure

### 1. **Create {Module}**
```http
POST /products
Content-Type: application/json

{
  "name": "Sample product",
  "price": 100,
  "description": "Sample description",
  "category": "Sample category",
  "isActive": true
}
```

### 2. **Get All {Module}s** 
```http
GET /products
```

### 3. **Get {Module}s with Pagination**
```http
GET /products?page=1&limit=10&sortBy=createdAt:desc
```

### 4. **Get {Module}s with Filter** (Exact Match)
```http
GET /products?price=100&isActive=true
```

### 5. **Search {Module}s** (Regex Search)
```http
GET /products?name=iPhone&description=advanced&page=1&limit=10
```

### 6. **Get {Module}s Paginated** (Always Paginated)
```http
GET /products/paginated?page=1&limit=5&sortBy=price:asc
```

### 7. **Get {Module} by ID**
```http
GET /products/{{productId}}
```

### 8. **Update {Module}**
```http
PUT /products/{{productId}}
Content-Type: application/json

{
  "name": "Updated product",
  "price": 150
}
```

### 9. **Delete {Module}**
```http
DELETE /products/{{productId}}
```

### 10. **Advanced Filter & Search Combination**
```http
GET /products?name=iPhone&price=999&isActive=true&category=Electronics&page=1&limit=10&sortBy=createdAt:desc&populate=category
```

### 11. **Date Range Filter**
```http
GET /products?createdFrom=2024-01-01&createdTo=2024-12-31&page=1&limit=10
```

## 🎯 Query Parameters Chi Tiết

### Filter Parameters (Exact Match)
- `price`: Filter theo giá chính xác
- `isActive`: Filter theo status boolean
- `{numberField}`: Bất kỳ field number nào trong model

### Search Parameters (Regex Search)
- `name`: Search theo tên (regex)
- `description`: Search theo mô tả (regex)  
- `{stringField}`: Bất kỳ field string nào trong model

### Pagination Parameters
- `page`: Số trang (default: 1)
- `limit`: Số items per page (default: 10, max: 100)
- `sortBy`: Sắp xếp (format: field:direction, VD: createdAt:desc)
- `populate`: Populate related fields

### Date Range Parameters
- `createdFrom`: Ngày bắt đầu
- `createdTo`: Ngày kết thúc
- `updatedFrom`: Ngày update bắt đầu
- `updatedTo`: Ngày update kết thúc

## 🔄 Workflow Testing

### 1. Test Flow Hoàn Chỉnh:
1. **Create** một item mới
2. Copy `_id` từ response
3. Set `_id` vào environment variable `{module}Id`
4. **Get by ID** để verify
5. **Update** item
6. **Get All** với pagination
7. **Search** với filters
8. **Delete** item

### 2. Test Pagination:
1. Create multiple items
2. Test different page sizes
3. Test sorting options
4. Test search combinations

## 🛠️ Customization

### Thêm Authentication:
```javascript
// Pre-request Script example
pm.request.headers.add({
    key: 'Authorization',
    value: 'Bearer ' + pm.environment.get('authToken')
});
```

### Dynamic Variable Generation:
```javascript
// Pre-request Script để generate random data
pm.environment.set('randomName', 'Product ' + Math.floor(Math.random() * 1000));
```

## 📊 Response Examples

### Success Create Response:
```json
{
  "_id": "64f1b2b3c9b9c7a3d8e1f2g3",
  "name": "iPhone 15 Pro",
  "price": 999,
  "description": "Latest iPhone with advanced features",
  "category": "Electronics",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Paginated Response:
```json
{
  "results": [...],
  "page": 1,
  "limit": 10,
  "totalPages": 5,
  "totalResults": 50
}
```

## 🎯 Tips & Best Practices

1. **Always set environment** trước khi test
2. **Copy real IDs** từ Create response vào environment variables
3. **Test pagination** với different page sizes
4. **Combine filters** để test advanced search
5. **Use date ranges** cho time-based filtering
6. **Check response structure** khớp với expected format

## 🔍 Troubleshooting

### Common Issues:
1. **404 Errors**: Check `baseUrl` và ensure server is running
2. **Validation Errors**: Check request body format khớp với DTO requirements
3. **Empty Results**: Check filter parameters và database content
4. **Pagination Issues**: Verify page/limit values are positive integers
