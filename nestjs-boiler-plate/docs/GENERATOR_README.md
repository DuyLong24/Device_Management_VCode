# Module Generator

Công cụ tự động sinh code cho NestJS modules dựa trên cấu trúc của module User với hệ thống template có thể tùy chỉnh.

## Cách sử dụng

```bash
node generate.js <tên-module> <field1>:<type> <field2>:<type> ...
```

## Các kiểu dữ liệu hỗ trợ

- `string` - Chuỗi văn bản
- `number` - Số
- `boolean` - Boolean (true/false)
- `date` - Ngày tháng
- `email` - Email (sẽ có validation email)

## Ví dụ

### 1. Tạo module Product
```bash
node generate.js product name:string price:number description:string category:string inStock:boolean
```

### 2. Tạo module Order  
```bash
node generate.js order customerName:string customerEmail:email totalAmount:number orderDate:date isCompleted:boolean
```

### 3. Tạo module Category
```bash
node generate.js category name:string description:string isActive:boolean createdBy:string
```

## Cấu trúc Template

Generator sử dụng hệ thống template linh hoạt với các file template trong thư mục `templates/`:

```
templates/
├── entity.txt          # Template cho Entity
├── create-dto.txt      # Template cho Create DTO
├── update-dto.txt      # Template cho Update DTO
├── repository.txt      # Template cho Repository
├── service.txt         # Template cho Service
├── controller.txt      # Template cho Controller
└── module.txt          # Template cho Module
```

### Tùy chỉnh Templates

Bạn có thể dễ dàng chỉnh sửa các template bằng cách:

1. **Mở file template** trong thư mục `templates/`
2. **Chỉnh sửa nội dung** theo ý muốn
3. **Sử dụng các biến template** để thay thế động:

#### Biến template có sẵn:
- `{{MODULE_NAME_CAPITAL}}` - Tên module viết hoa (VD: Product, Order)
- `{{MODULE_NAME_LOWER}}` - Tên module viết thường (VD: product, order)
- `{{FIELDS}}` - Các trường dữ liệu được sinh tự động
- `{{VALIDATORS}}` - Danh sách validators được import

#### Ví dụ chỉnh sửa template controller.txt:

```typescript
// Thêm authentication decorator
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('{{MODULE_NAME_LOWER}}s')
@UseGuards(JwtAuthGuard)  // Thêm authentication
export class {{MODULE_NAME_CAPITAL}}Controller {
  // ... rest of controller
}
```

#### Ví dụ chỉnh sửa service.txt để thêm logging:

```typescript
import { Injectable, NotFoundException, Logger } from '@nestjs/common';

@Injectable()
export class {{MODULE_NAME_CAPITAL}}Service {
  private readonly logger = new Logger({{MODULE_NAME_CAPITAL}}Service.name);

  constructor(private readonly {{MODULE_NAME_LOWER}}Repository: {{MODULE_NAME_CAPITAL}}Repository) {}

  async create(create{{MODULE_NAME_CAPITAL}}Dto: Create{{MODULE_NAME_CAPITAL}}Dto) {
    this.logger.log('Creating new {{MODULE_NAME_LOWER}}');
    return this.{{MODULE_NAME_LOWER}}Repository.create(create{{MODULE_NAME_CAPITAL}}Dto);
  }
  // ... rest of service
}
```

## Cấu trúc được tạo

Khi chạy lệnh, tool sẽ tạo ra:

```
src/{module-name}s/
├── controllers/
│   └── {module-name}.controller.ts
├── dto/
│   ├── create-{module-name}.dto.ts
│   ├── update-{module-name}.dto.ts
│   └── pagination.dto.ts                # DTO cho phân trang
├── entities/
│   └── {module-name}.entity.ts
├── interfaces/
│   └── pagination-result.interface.ts   # Interface cho kết quả phân trang
├── repositories/
│   └── {module-name}.repository.ts
├── services/
│   └── {module-name}.service.ts
└── {module-name}s.module.ts
```

## Các file được tạo

1. **Entity**: Định nghĩa schema MongoDB với Mongoose
2. **DTOs**: Create, Update và Pagination Data Transfer Objects với validation
3. **Repository**: Tầng truy cập dữ liệu với hỗ trợ phân trang
4. **Service**: Business logic layer với methods phân trang
5. **Controller**: REST API endpoints với pagination support
6. **Module**: NestJS module configuration
7. **Interfaces**: TypeScript interfaces cho pagination result

## Sau khi generate

1. **Thêm module vào app.module.ts**:
```typescript
import { {ModuleName}Module } from './src/{module-name}s/{module-name}s.module';

@Module({
  imports: [
    // ... other modules
    {ModuleName}Module,
  ],
  // ...
})
export class AppModule {}
```

2. **Cài đặt dependencies** (nếu chưa có):
```bash
npm install @nestjs/mongoose mongoose
npm install class-validator class-transformer
```

3. **Chạy ứng dụng**:
```bash
npm run start:dev
```

## API Endpoints được tạo

Với module `product`, bạn sẽ có các endpoints:

### Basic CRUD
- `POST /products` - Tạo product mới
- `GET /products/:id` - Lấy product theo ID
- `PUT /products/:id` - Cập nhật product
- `DELETE /products/:id` - Xóa product

### Advanced Queries
- `GET /products` - Lấy tất cả products (tự động phân trang nếu có query params)
- `GET /products/paginated` - Lấy products với phân trang bắt buộc
- `GET /products/by-status?status=active` - Lấy products theo status

### Pagination Parameters

Sử dụng query parameters để phân trang:

```bash
# Phân trang cơ bản
GET /products?page=1&limit=10

# Phân trang với search
GET /products?page=1&limit=5&search=smartphone

# Phân trang với sắp xếp
GET /products?page=1&limit=10&sortBy=createdAt&sortOrder=desc

# Tất cả tham số
GET /products?page=2&limit=20&search=laptop&sortBy=name&sortOrder=asc
```

### Pagination Response Format

```json
{
  "results": [
    {
      "id": "...",
      "name": "Product 1",
      "price": 100,
      // ... other fields
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 5,
  "totalResults": 50
}
```

### Advanced Pagination Features

Với plugin TypeScript mới, bạn có thêm các tính năng:

```bash
# Populate relations
GET /articles?page=1&limit=10&populate=author,category

# Select specific fields
GET /articles?page=1&limit=10&select=title,author,createdAt

# Complex sorting
GET /articles?page=1&limit=10&sortBy=createdAt:desc,title:asc

# Combination
GET /articles?page=1&limit=10&search=javascript&populate=author&select=title,content&sortBy=createdAt:desc
```

## Lưu ý

- Tất cả modules được tạo có sẵn các field: `status`, `createdAt`, `updatedAt`
- Validation được thêm tự động dựa trên kiểu dữ liệu
- Repository pattern được áp dụng để tách biệt logic truy cập dữ liệu
- Error handling cơ bản đã được implement (NotFoundException, etc.)
- **Pagination tự động**: GET endpoint sẽ tự động sử dụng phân trang nếu có query params
- **Search capability**: Hỗ trợ tìm kiếm trong các trường text
- **Sorting**: Hỗ trợ sắp xếp theo field và thứ tự
- Templates có thể được tùy chỉnh hoàn toàn theo nhu cầu dự án

### Pagination Features

- **TypeScript Plugin**: Sử dụng plugin pagination TypeScript tùy chỉnh
- **Flexible pagination**: Có thể bật/tắt phân trang tự động
- **Search trong database**: Search qua các trường text
- **Dynamic sorting**: Sắp xếp theo bất kỳ field nào với format `field:order`
- **Population support**: Populate relations với cú pháp `field1,field2` hoặc `field.subfield`
- **Field selection**: Chọn fields cụ thể để trả về
- **Multi-sort**: Sắp xếp theo nhiều field cùng lúc
- **Performance optimized**: Sử dụng MongoDB skip/limit hiệu quả
- **Type safety**: Full TypeScript support với interfaces và types
