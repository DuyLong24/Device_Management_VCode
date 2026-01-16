# NestJS Authentication & Authorization System

Hệ thống Authentication & Authorization cho NestJS với kiến trúc DDD, hỗ trợ JWT và Keycloak SSO.

## 📋 Tính năng

### Authentication
- ✅ JWT Authentication với Access & Refresh Token
- ✅ Keycloak SSO Integration
- ✅ Flexible Authentication Strategy (JWT | Keycloak | Both)
- ✅ Token Management
- ✅ Rate Limiting

### Authorization
- ✅ Role-Based Access Control (RBAC)
- ✅ Permission-Based Authorization
- ✅ Custom Decorators (@Roles, @Permissions, @Public)
- ✅ Dynamic Permission Checking
- ✅ Keycloak Role Synchronization

### Additional Features
- ✅ User Management với Keycloak Sync
- ✅ Seed Data cho Roles & Permissions
- ✅ Password Management
- ✅ Environment-based Configuration

## 🏗️ Cấu trúc dự án

```
src/
├── auth/
│   ├── controllers/
│   │   └── auth.controller.ts          # API endpoints cho authentication
│   ├── dto/
│   │   └── auth.dto.ts                 # DTOs cho auth requests
│   ├── guards/
│   │   ├── auth.guard.ts               # Main authentication guard
│   │   └── keycloak.guard.ts           # Keycloak-specific guard
│   ├── interfaces/
│   │   └── auth.interface.ts           # Authentication interfaces
│   ├── services/
│   │   ├── auth.service.ts             # Authentication logic
│   │   └── keycloak-user.service.ts    # Keycloak user management
│   ├── strategies/
│   │   └── jwt.strategy.ts             # JWT strategy
│   └── auth.module.ts                  # Auth module
├── common/
│   ├── decorators/
│   │   └── auth.decorator.ts           # Custom decorators
│   ├── guards/
│   │   └── permission.guard.ts         # Permission checking guard
│   └── services/
│       └── seed.service.ts             # Seed data service
├── users/
│   └── services/
│       └── enhanced-user.service.ts    # User service với Keycloak sync
└── fnc-roles/                          # Role & Permission management
```

## 🚀 Cài đặt và Cấu hình

### 1. Cài đặt Dependencies

```bash
npm install @nestjs/throttler jwks-rsa node-jose
```

### 2. Cấu hình Environment

Tạo file `.env`:

```env
# Authentication Strategy
AUTH_STRATEGY=jwt  # jwt | keycloak | both

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRATION=7d

# Keycloak Configuration
KEYCLOAK_BASE_URL=http://localhost:8080
KEYCLOAK_REALM=your-realm
KEYCLOAK_CLIENT_ID=your-client-id
KEYCLOAK_CLIENT_SECRET=your-client-secret

# Database
DATABASE_URL=mongodb://localhost:27017/nestjs_ddd
```

### 3. Khởi chạy

```bash
npm run start:dev
```

## 🔐 Sử dụng

### Authentication API

```typescript
// Register
POST /auth/register
{
  "username": "john_doe",
  "email": "john@example.com", 
  "password": "password123",
  "name": "John Doe"
}

// Login
POST /auth/login
{
  "username": "john@example.com",
  "password": "password123"
}
```

### Authorization Decorators

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UserController {

  @Get()
  @Permissions('list_users')
  async findAll() {
    // Chỉ user có permission 'list_users' mới truy cập được
  }

  @Post()
  @Roles('admin', 'super_admin')
  async create() {
    // Chỉ admin hoặc super_admin mới tạo được user
  }

  @Get('public')
  @Public()
  async publicEndpoint() {
    // Endpoint công khai, không cần authentication
  }
}
```

## 📊 Roles & Permissions

### Default Roles

| Role | Permissions |
|------|-------------|
| `super_admin` | Tất cả permissions |
| `admin` | manage_users, create_user, update_user, delete_user |
| `editor` | create_user, update_user, get_user, list_users |
| `viewer` | get_user, list_users |
| `user` | get_user, update_own_profile, change_own_password |

### Default Permissions

- `manage_users` - Quản lý toàn bộ users
- `create_user` - Tạo user mới
- `update_user` - Cập nhật thông tin user
- `delete_user` - Xóa user
- `get_user` - Xem thông tin user
- `list_users` - Danh sách users
- `manage_roles` - Quản lý roles
- `manage_tokens` - Quản lý tokens

## 🔧 Cấu hình Keycloak

### 1. Keycloak Setup

1. Cài đặt và khởi chạy Keycloak
2. Tạo Realm mới
3. Tạo Client với Client ID và Secret
4. Cấu hình Public Key URL

### 2. Environment Variables

```env
AUTH_STRATEGY=keycloak
KEYCLOAK_BASE_URL=http://localhost:8080
KEYCLOAK_REALM=your-realm
KEYCLOAK_CLIENT_ID=your-client-id
KEYCLOAK_CLIENT_SECRET=your-client-secret
KEYCLOAK_PUBLIC_KEY_URL=http://localhost:8080/realms/your-realm/protocol/openid_connect/certs
```

### 3. User Synchronization

Khi `AUTH_STRATEGY=keycloak`, hệ thống sẽ tự động:
- Đồng bộ user mới vào Keycloak khi tạo
- Cập nhật thông tin user trong Keycloak khi sửa
- Xóa user khỏi Keycloak khi xóa
- Đồng bộ roles giữa hệ thống local và Keycloak

## 🛡️ Security Features

### Rate Limiting
```typescript
// Cấu hình trong .env
RATE_LIMIT_TTL=60      // 60 seconds
RATE_LIMIT_LIMIT=10    // 10 requests per TTL
```

### Token Security
- Access Token: Thời gian sống ngắn (15 minutes)
- Refresh Token: Thời gian sống dài (7 days) 
- Token được lưu trong database để kiểm soát
- Hỗ trợ logout toàn bộ devices

### Password Security
- BCrypt hashing
- Password validation
- Password change tracking

## 🧪 Testing

Sử dụng file `AUTH_API_EXAMPLES.md` để test các API endpoints.

### Postman Collection

Import Postman collection từ thư mục `postman/` để test nhanh.

## 📝 Các lưu ý quan trọng

### 1. Migration từ hệ thống cũ
- Backup dữ liệu users và roles hiện có
- Chạy seed data để tạo permissions mới
- Cập nhật user roles theo hệ thống mới

### 2. Production Setup
- Thay đổi `JWT_SECRET` thành secret phức tạp
- Cấu hình CORS phù hợp
- Thiết lập HTTPS
- Cấu hình rate limiting phù hợp

### 3. Keycloak Production
- Cấu hình SSL cho Keycloak
- Thiết lập backup cho Keycloak database
- Cấu hình clustering nếu cần

## 🐛 Troubleshooting

### Common Issues

1. **JWT Token Invalid**
   - Kiểm tra `JWT_SECRET` trong .env
   - Đảm bảo token chưa expired

2. **Keycloak Connection Failed**
   - Kiểm tra `KEYCLOAK_BASE_URL`
   - Xác nhận Keycloak đang chạy
   - Kiểm tra network connectivity

3. **Permission Denied**
   - Xác nhận user có đúng role/permission
   - Kiểm tra decorator syntax
   - Verify guard order trong controller

### Debug Mode

```typescript
// Enable debug logs
export const logger = new Logger('Auth');
logger.setLogLevels(['error', 'warn', 'log', 'debug']);
```

## 🤝 Contributing

1. Fork the project
2. Create feature branch
3. Commit changes
4. Push to branch  
5. Open Pull Request

## 📄 License

MIT License
