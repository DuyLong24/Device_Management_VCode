# Policy Admin Module

Module quản lý policy OPA cho NestJS với MongoDB/Mongoose và tích hợp Keycloak.

## Cấu trúc

```
src/policy-admin/
├── policy-admin.module.ts          # Module chính
├── policy.controller.ts            # Controller với tất cả endpoints
├── policy.service.ts               # Service chính
├── sync.service.ts                 # Đồng bộ với Keycloak
├── route-scanner.service.ts        # Quét routes từ controllers
├── opa.service.ts                  # Tương tác với OPA server
├── keycloak-admin.service.ts       # Tương tác với Keycloak Admin API
├── decorators/
│   ├── policy-module.decorator.ts  # @PolicyModule('product')
│   └── policy-exclude.decorator.ts # @PolicyExclude()
├── schemas/
│   ├── resource-template.schema.ts # Resource templates
│   ├── permission-config.schema.ts # Permission configurations
│   └── version.schema.ts           # Policy versions
├── dto/
│   ├── catalog.dto.ts              # Catalog operations
│   ├── permissions.dto.ts          # Permission operations
│   ├── roles.dto.ts                # Role operations
│   ├── publish.dto.ts              # Publish operations
│   └── simulate.dto.ts             # Simulation operations
└── guards/
    └── keycloak-admin.guard.ts     # Keycloak admin guard
```

## Cài đặt

### 1. Import Module

Thêm `PolicyAdminModule` vào `app.module.ts`:

```typescript
import { PolicyAdminModule } from './policy-admin/policy-admin.module';

@Module({
  imports: [
    // ... other imports
    PolicyAdminModule,
  ],
})
export class AppModule {}
```

### 2. Biến môi trường

Thêm vào file `.env`:

```env
# OPA Configuration
OPA_URL=http://localhost:8181

# Keycloak Configuration
KC_BASE=http://localhost:8081
KC_REALM=demo
KC_CLIENT_ID_API=your-api
KC_ADMIN_USER=admin
KC_ADMIN_PASS=admin
```

### 3. Dependencies

Cài đặt các dependencies cần thiết:

```bash
npm install axios
```

## Sử dụng

### 1. Decorators

#### @PolicyModule
Đánh dấu controller thuộc module nào:

```typescript
@PolicyModule('product')
@Controller('products')
export class ProductController {
  // ...
}
```

#### @PolicyExclude
Loại trừ controller khỏi policy scanning:

```typescript
@PolicyExclude()
@Controller('health')
export class HealthController {
  // ...
}
```

### 2. Endpoints

#### Catalog
- `GET /policy/catalog` - Lấy catalog
- `POST /policy/catalog/resource-templates:bulk-upsert` - Bulk upsert resource templates
- `POST /policy/catalog/scan?apply=true&applyPermissions=true` - Quét routes

#### Permissions
- `GET /policy/permissions` - Lấy tất cả permissions
- `PUT /policy/permissions:bulk-upsert` - Bulk upsert permissions
- `DELETE /policy/permissions/:key` - Xóa permission

#### Roles (SoR = FncRole)
- `GET /policy/roles` - Lấy tất cả roles
- `POST /policy/roles` - Tạo role mới
- `PUT /policy/roles/:code` - Cập nhật role
- `DELETE /policy/roles/:code` - Xóa role
- `POST /policy/roles/:code/permissions:bulk-set` - Set permissions cho role

#### Sync & Publish
- `POST /policy/sync/keycloak` - Đồng bộ với Keycloak
- `POST /policy/publish` - Publish policy lên OPA
- `POST /policy/simulate` - Simulate policy evaluation

#### User Permissions
- `GET /policy/users/:userId/permissions` - Lấy permissions của user từ Keycloak

### 3. Postman Collection

Import file `postman/Policy_Admin_API.postman_collection.json` vào Postman để test các endpoints.

Xem hướng dẫn chi tiết tại: `docs/POLICY_ADMIN_POSTMAN_GUIDE.md`

## Quy trình thao tác

### 1. Khởi tạo

1. **Scan routes** (không apply):
   ```bash
   curl -X POST "http://localhost:3000/policy/catalog/scan?apply=false&applyPermissions=false"
   ```

2. **Bulk upsert resource templates**:
   ```bash
   curl -X POST "http://localhost:3000/policy/catalog/resource-templates:bulk-upsert" \
     -H "Content-Type: application/json" \
     -d '{
       "templates": [
         {
           "module": "product",
           "path": "/products",
           "methods": ["GET", "POST"],
           "description": "Product list and create"
         },
         {
           "module": "product",
           "path": "/products/:id",
           "methods": ["GET", "PUT", "PATCH", "DELETE"],
           "description": "Product detail operations"
         }
       ]
     }'
   ```

3. **Bulk upsert permissions**:
   ```bash
   curl -X PUT "http://localhost:3000/policy/permissions:bulk-upsert" \
     -H "Content-Type: application/json" \
     -d '{
       "permissions": [
         {
           "key": "product:get",
           "resources": [
             {
               "path": "/products",
               "methods": ["GET"]
             },
             {
               "path": "/products/:id",
               "methods": ["GET"]
             }
           ]
         },
         {
           "key": "product:manage",
           "resources": [
             {
               "path": "/products",
               "methods": ["POST"]
             },
             {
               "path": "/products/:id",
               "methods": ["PUT", "PATCH"]
             }
           ]
         },
         {
           "key": "product:delete",
           "resources": [
             {
               "path": "/products/:id",
               "methods": ["DELETE"]
             }
           ]
         }
       ]
     }'
   ```

### 2. Tạo Role

```bash
curl -X POST "http://localhost:3000/policy/roles" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Normal Developer",
    "code": "ND",
    "permissions": ["product:get", "product:manage"]
  }'
```

### 3. Sync với Keycloak

```bash
curl -X POST "http://localhost:3000/policy/sync/keycloak"
```

### 4. Publish Policy

```bash
curl -X POST "http://localhost:3000/policy/publish" \
  -H "Content-Type: application/json" \
  -d '{
    "createdBy": "admin"
  }'
```

### 5. Simulate

```bash
# Test GET /products (allow)
curl -X POST "http://localhost:3000/policy/simulate" \
  -H "Content-Type: application/json" \
  -d '{
    "http": {
      "method": "GET",
      "path": "/products"
    },
    "subject": {
      "user_id": "user123",
      "roles": ["ND"],
      "perms": ["product:get", "product:manage"]
    }
  }'

# Test POST /products (allow)
curl -X POST "http://localhost:3000/policy/simulate" \
  -H "Content-Type: application/json" \
  -d '{
    "http": {
      "method": "POST",
      "path": "/products"
    },
    "subject": {
      "user_id": "user123",
      "roles": ["ND"],
      "perms": ["product:get", "product:manage"]
    }
  }'

# Test DELETE /products/123 (deny)
curl -X POST "http://localhost:3000/policy/simulate" \
  -H "Content-Type: application/json" \
  -d '{
    "http": {
      "method": "DELETE",
      "path": "/products/123"
    },
    "subject": {
      "user_id": "user123",
      "roles": ["ND"],
      "perms": ["product:get", "product:manage"]
    }
  }'
```

## Lưu ý

1. **SoR (Source of Truth)**: FncRole trong MongoDB là nguồn sự thật về roles và permissions
2. **Keycloak Integration**: Keycloak chỉ để đồng bộ và projection permissions vào JWT
3. **OPA Policy**: Chưa có ngoại lệ/override, chỉ RBAC cơ bản
4. **Route Scanner**: Hiện tại là placeholder, cần implement đầy đủ với ModulesContainer
5. **Authentication**: Guard hiện tại cho phép tất cả requests, cần implement proper authentication

## TODO

- [ ] Implement đầy đủ RouteScannerService với ModulesContainer
- [ ] Implement proper KeycloakAdminGuard
- [ ] Thêm validation cho resource templates và permissions
- [ ] Thêm pagination cho các endpoints list
- [ ] Implement policy exceptions/overrides
- [ ] Thêm logging và monitoring
- [ ] Thêm unit tests và integration tests
