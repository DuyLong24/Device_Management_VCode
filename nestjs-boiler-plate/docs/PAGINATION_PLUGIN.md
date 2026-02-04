# TypeScript Pagination Plugin

## Tổng quan

Plugin pagination TypeScript tùy chỉnh cho Mongoose với full type safety và tính năng advanced.

## Tính năng chính

### 🔥 TypeScript Support
- Full type safety với interfaces và generic types
- Auto-completion trong IDE
- Compile-time error checking

### 🚀 Advanced Features
- **Multi-field sorting**: `createdAt:desc,title:asc`
- **Smart populate**: `author,category` hoặc `author.profile`
- **Field selection**: `title,content,author`
- **Flexible search**: Regex search với case-insensitive
- **Performance optimized**: Promise.all và efficient MongoDB queries

###  Plugin Interface

```typescript
interface PaginateOptions {
  sortBy?: string;           // 'field:order,field2:order'
  populate?: string | object; // 'field1,field2' hoặc object
  limit?: number;            // max items per page
  page?: number;             // current page
  select?: string;           // 'field1 field2 field3'
}

interface PaginateResult<T> {
  results: T[];              // documents
  page: number;              // current page
  limit: number;             // items per page
  totalPages: number;        // total pages
  totalResults: number;      // total documents
}
```

## Cách sử dụng

### 1. Trong Entity
```typescript
import paginate, { PaginateModel } from '../../plugins/paginate.plugin';

const Schema = SchemaFactory.createForClass(Entity);
Schema.plugin(paginate);

export type EntityModel = PaginateModel<EntityDocument>;
```

### 2. Trong Repository
```typescript
constructor(@InjectModel(Entity.name) private entityModel: EntityModel) {}

async findWithPagination(options: PaginationDto): Promise<PaginateResult<EntityDocument>> {
  return this.entityModel.paginate(filter, options);
}
```

### 3. API Calls
```bash
# Basic pagination
GET /entities?page=1&limit=10

# With search
GET /entities?page=1&search=keyword

# With sorting
GET /entities?sortBy=createdAt:desc,title:asc

# With populate
GET /entities?populate=author,category

# With field selection
GET /entities?select=title,content,author

# Combined
GET /entities?page=1&limit=5&search=js&sortBy=createdAt:desc&populate=author&select=title,content
```

## Lợi ích

✅ **Type Safety**: Tránh runtime errors
✅ **Performance**: Optimized MongoDB queries  
✅ **Flexibility**: Nhiều options tùy chỉnh
✅ **Maintainability**: Clean TypeScript code
✅ **Developer Experience**: Auto-completion và IntelliSense
