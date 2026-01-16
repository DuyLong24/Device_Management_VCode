# Policy Admin Module - Cấu trúc hoàn chỉnh

## 📁 Cây thư mục

```
apps/main-service/src/policy-admin/
├── policy-admin.module.ts                    # Module chính
├── policy.controller.ts                      # Controller với tất cả endpoints
├── policy.service.ts                         # Service chính
├── sync.service.ts                           # Đồng bộ với Keycloak
├── route-scanner.service.ts                  # Quét routes từ controllers
├── opa.service.ts                            # Tương tác với OPA server
├── keycloak-admin.service.ts                 # Tương tác với Keycloak Admin API
├── decorators/
│   ├── policy-module.decorator.ts            # @PolicyModule('product')
│   └── policy-exclude.decorator.ts           # @PolicyExclude()
├── schemas/
│   ├── resource-template.schema.ts           # Resource templates
│   ├── permission-config.schema.ts           # Permission configurations
│   └── version.schema.ts                     # Policy versions
├── dto/
│   ├── catalog.dto.ts                        # Catalog operations
│   ├── permissions.dto.ts                    # Permission operations
│   ├── roles.dto.ts                          # Role operations
│   ├── publish.dto.ts                        # Publish operations
│   └── simulate.dto.ts                       # Simulation operations
└── guards/
    └── keycloak-admin.guard.ts               # Keycloak admin guard
```

## 📋 Danh sách file đã tạo

### Core Files
1. **policy-admin.module.ts** - Module chính với đăng ký Mongoose models, providers và controllers
2. **policy.controller.ts** - Controller với tất cả endpoints (prefix /policy)
3. **policy.service.ts** - Service chính quản lý tất cả operations

### Services
4. **sync.service.ts** - Đồng bộ dữ liệu từ MongoDB sang Keycloak
5. **route-scanner.service.ts** - Quét routes từ controllers (placeholder)
6. **opa.service.ts** - Tương tác với OPA server (publish/evaluate)
7. **keycloak-admin.service.ts** - Tương tác với Keycloak Admin API

### Schemas (Mongoose)
8. **resource-template.schema.ts** - Resource templates với validation và index
9. **permission-config.schema.ts** - Permission configurations với validation
10. **version.schema.ts** - Policy versions để lưu trữ lịch sử

### DTOs
11. **catalog.dto.ts** - DTOs cho catalog operations
12. **permissions.dto.ts** - DTOs cho permission operations
13. **roles.dto.ts** - DTOs cho role operations
14. **publish.dto.ts** - DTOs cho publish operations
15. **simulate.dto.ts** - DTOs cho simulation operations

### Decorators
16. **policy-module.decorator.ts** - @PolicyModule('product')
17. **policy-exclude.decorator.ts** - @PolicyExclude()

### Guards
18. **keycloak-admin.guard.ts** - Guard cho Keycloak admin authentication

### Documentation
19. **README-PolicyAdmin.md** - Hướng dẫn chi tiết sử dụng
20. **POLICY_ADMIN_ENV.example** - File .env.example
21. **POLICY_ADMIN_TEST.sh** - Script test các chức năng
22. **POLICY_ADMIN_POSTMAN_GUIDE.md** - Hướng dẫn sử dụng Postman

### Postman Collection
23. **Policy_Admin_API.postman_collection.json** - Postman collection để test API

## 🔧 Endpoints

### Catalog
- `GET /policy/catalog` - Lấy catalog
- `POST /policy/catalog/resource-templates:bulk-upsert` - Bulk upsert resource templates
- `POST /policy/catalog/scan?apply=true&applyPermissions=true` - Quét routes

### Permissions
- `GET /policy/permissions` - Lấy tất cả permissions
- `PUT /policy/permissions:bulk-upsert` - Bulk upsert permissions
- `DELETE /policy/permissions/:key` - Xóa permission

### Roles (SoR = FncRole)
- `GET /policy/roles` - Lấy tất cả roles
- `POST /policy/roles` - Tạo role mới
- `PUT /policy/roles/:code` - Cập nhật role
- `DELETE /policy/roles/:code` - Xóa role
- `POST /policy/roles/:code/permissions:bulk-set` - Set permissions cho role

### Sync & Publish
- `POST /policy/sync/keycloak` - Đồng bộ với Keycloak
- `POST /policy/publish` - Publish policy lên OPA
- `POST /policy/simulate` - Simulate policy evaluation

### User Permissions
- `GET /policy/users/:userId/permissions` - Lấy permissions của user từ Keycloak

## 🚀 Cách sử dụng

### 1. Import Module
```typescript
import { PolicyAdminModule } from './policy-admin/policy-admin.module';

@Module({
  imports: [
    PolicyAdminModule,
  ],
})
export class AppModule {}
```

### 2. Biến môi trường
```env
OPA_URL=http://localhost:8181
KC_BASE=http://localhost:8081
KC_REALM=demo
KC_CLIENT_ID_API=your-api
KC_ADMIN_USER=admin
KC_ADMIN_PASS=admin
```

### 3. Test
```bash
chmod +x docs/POLICY_ADMIN_TEST.sh
./docs/POLICY_ADMIN_TEST.sh
```

## 📝 Lưu ý quan trọng

1. **SoR (Source of Truth)**: FncRole trong MongoDB là nguồn sự thật về roles và permissions
2. **Keycloak Integration**: Keycloak chỉ để đồng bộ và projection permissions vào JWT
3. **OPA Policy**: Chưa có ngoại lệ/override, chỉ RBAC cơ bản
4. **Route Scanner**: Hiện tại là placeholder, cần implement đầy đủ với ModulesContainer
5. **Authentication**: Guard hiện tại cho phép tất cả requests, cần implement proper authentication

## ✅ Tính năng đã hoàn thành

- [x] Module structure hoàn chỉnh
- [x] Mongoose schemas với validation và index
- [x] DTOs với validation
- [x] Services với business logic
- [x] Controller với tất cả endpoints
- [x] Decorators cho policy module và exclude
- [x] OPA service integration
- [x] Keycloak admin service integration
- [x] Sync service
- [x] Documentation chi tiết
- [x] Test script

## 🔄 TODO

- [ ] Implement đầy đủ RouteScannerService với ModulesContainer
- [ ] Implement proper KeycloakAdminGuard
- [ ] Thêm validation cho resource templates và permissions
- [ ] Thêm pagination cho các endpoints list
- [ ] Implement policy exceptions/overrides
- [ ] Thêm logging và monitoring
- [ ] Thêm unit tests và integration tests
