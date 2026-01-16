# Dynamic Pagination System Documentation

## Tổng quan
Hệ thống pagination động đã được cập nhật để tự động tạo ra pagination DTO phù hợp với từng model, tương tự như hệ thống Joi validation bạn đã sử dụng trước đây.

## Cách hoạt động

### 1. Pagination DTO tự động
Generator sẽ tạo ra một pagination DTO riêng cho mỗi module với:
- **Filter fields**: Các field được sử dụng để filter chính xác (exact match)
- **Search fields**: Các field string được sử dụng để search với regex
- **Pagination options**: page, limit, sortBy, populate

### 2. Phân loại fields tự động
- **String/Email fields** → Sử dụng cho search với regex
- **Number/Boolean/Date fields** → Sử dụng cho filter chính xác
- **Tất cả fields** → Có thể dùng trong pagination DTO

### 3. Utility functions
File `src/utils/pick.util.ts` chứa:
- `pick()`: Tương tự Joi pick, lấy các field để filter chính xác
- `pickSearch()`: Tương tự Joi pickSearch, tạo regex search cho string fields
- `createFilterAndOptions()`: Kết hợp cả hai và tạo filter + options

## Ví dụ sử dụng

### Sinh module mới
```bash
node generate.js product name:string price:number description:string category:string isActive:boolean createdDate:date
```

### API endpoints được tạo
```typescript
// GET /products - Có thể có hoặc không có pagination
// GET /products/paginated - Luôn có pagination

// Query parameters tự động:
// Filter (exact match): price, isActive, createdDate
// Search (regex): name, description, category
// Pagination: page, limit, sortBy, populate
```

### Ví dụ API calls
```javascript
// Filter chính xác
GET /products?price=100&isActive=true&page=1&limit=10

// Search với regex
GET /products?name=iPhone&category=electronics&page=1&limit=10

// Kết hợp filter và search
GET /products?price=100&name=iPhone&isActive=true&page=1&limit=10&sortBy=createdAt:desc

// Date range filtering
GET /products?createdFrom=2024-01-01&createdTo=2024-12-31
```

## Controller logic

Controller tự động sử dụng `createFilterAndOptions()` để:
1. Phân tách query parameters thành filter và options
2. Tạo regex search cho string fields
3. Truyền filter và options vào service layer

```typescript
const { filter, options } = createFilterAndOptions(
  query,
  ['price', 'isActive', 'createdDate'], // Filter keys
  ['name', 'description', 'category'],  // Search keys
  ['sortBy', 'limit', 'page', 'populate'] // Option keys
);
```

## Repository layer

Repository nhận filter và options riêng biệt:
```typescript
async findAllWithPagination(filter: any = {}, options: any = {}) {
  return this.productModel.paginate(filter, options);
}
```

## So sánh với hệ thống cũ

### Trước đây (Joi)
```javascript
const filter = pick(req.query, ['status', 'funcRoleId', 'uiRoleId', 'type']);
const searchFilter = pickSearch(req.query, ['name']);
filter = { ...filter, ...searchFilter };
const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
```

### Bây giờ (NestJS với class-validator)
```typescript
const { filter, options } = createFilterAndOptions(
  query,
  ['status', 'funcRoleId', 'uiRoleId', 'type'], // Filter keys
  ['name'], // Search keys
  ['sortBy', 'limit', 'page', 'populate'] // Option keys
);
```

## Type safety
Tất cả pagination DTOs đều có type safety với class-validator:
- Validation tự động cho từng field type
- Transform tự động (string to number, string to boolean)
- Optional validation cho tất cả pagination fields

## Extensibility
Dễ dàng mở rộng bằng cách:
1. Thêm fields mới vào entity
2. Re-generate module
3. Pagination DTO sẽ tự động cập nhật
