# Authentication & Authorization System

Hệ thống NestJS Template này cung cấp một giải pháp authentication và authorization hoàn chình với tích hợp Keycloak SSO.

## 🚀 Tính năng chính

### Authentication
- **JWT Authentication**: Hỗ trợ access token và refresh token
- **Keycloak SSO**: Tích hợp với Keycloak cho Single Sign-On
- **Dual Strategy**: Hỗ trợ cả JWT và Keycloak đồng thời
- **Rate Limiting**: Bảo vệ khỏi tấn công brute force
- **Password Management**: Đổi mật khẩu an toàn với validation

### Authorization
- **Role-Based Access Control (RBAC)**: Phân quyền theo vai trò
- **Permission-Based Access**: Kiểm soát truy cập chi tiết theo permission
- **Custom Decorators**: `@Roles()`, `@Permissions()`, `@Public()`
- **Guard System**: Authentication và authorization guards tự động

### User Management
- **CRUD Operations**: Quản lý người dùng đầy đủ
- **Keycloak Sync**: Đồng bộ dữ liệu với Keycloak
- **Password Hashing**: Bảo mật mật khẩu với bcrypt
- **Email Validation**: Validate email với EmailVO

## 🏗️ Kiến trúc

```
src/
├── auth/                          # Authentication module
│   ├── controllers/               # Auth controllers
│   ├── dto/                      # Data transfer objects
│   ├── guards/                   # Authentication & authorization guards
│   ├── services/                 # Authentication services
│   └── strategies/               # Passport strategies
├── common/                       # Shared components
│   ├── decorators/               # Custom decorators
│   ├── guards/                   # Global guards
│   └── services/                 # Integration services
└── users/                        # User management
    ├── controllers/              # User controllers
    ├── services/                 # User services
    └── entities/                 # User entity
```

## 🔧 Cài đặt và cấu hình

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình environment variables

Copy `.env.example` thành `.env` và cập nhật các giá trị:

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_REFRESH_EXPIRES_IN=7d

# Authentication Strategy
AUTH_STRATEGY=both  # jwt | keycloak | both

# Keycloak Configuration
KEYCLOAK_BASE_URL=http://localhost:8080
KEYCLOAK_REALM=nestjs-realm
KEYCLOAK_CLIENT_ID=nestjs-client
KEYCLOAK_CLIENT_SECRET=your_keycloak_client_secret
KEYCLOAK_PUBLIC_KEY_URL=http://localhost:8080/realms/nestjs-realm/protocol/openid_connect/certs
KEYCLOAK_INTROSPECTION_URL=http://localhost:8080/realms/nestjs-realm/protocol/openid_connect/token/introspect
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin

# Database
MONGODB_URI=mongodb://localhost:27017/nestjs-template

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

### 3. Khởi động ứng dụng

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## 📖 Sử dụng

### 1. Authentication Endpoints

```bash
# Đăng ký
POST /auth/register
{
  "username": "user123",
  "email": "user@example.com",
  "password": "password123"
}

# Đăng nhập
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Refresh token
POST /auth/refresh
{
  "refreshToken": "your-refresh-token"
}

# Lấy profile
GET /auth/profile
Authorization: Bearer your-jwt-token

# Đổi mật khẩu
POST /auth/change-password
Authorization: Bearer your-jwt-token
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}

# Đăng xuất
POST /auth/logout
Authorization: Bearer your-jwt-token
```

### 2. Authorization Decorators

```typescript
import { Roles, Permissions, Public } from '@/common/decorators';

@Controller('admin')
export class AdminController {
  
  @Public() // Endpoint công khai, không cần authentication
  @Get('info')
  getPublicInfo() {
    return { message: 'Public information' };
  }

  @Roles('admin', 'super_admin') // Chỉ admin và super_admin
  @Get('users')
  getUsers() {
    return this.userService.findAll();
  }

  @Permissions('users:delete') // Chỉ user có permission users:delete
  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.userService.delete(id);
  }

  @Roles('super_admin')
  @Permissions('system:manage') // Kết hợp cả role và permission
  @Post('system/reset')
  resetSystem() {
    return this.systemService.reset();
  }
}
```

### 3. User Management

```bash
# Tạo user mới (admin only)
POST /users
Authorization: Bearer admin-token
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User",
  "funcRoleId": "role-id"
}

# Gán role cho user
PATCH /users/:id/assign-role
Authorization: Bearer admin-token
{
  "roleId": "role-id"
}

# Sync user với Keycloak
POST /users/:id/sync-to-keycloak
Authorization: Bearer admin-token
```

## 🔐 Security Features

### 1. Password Security
- Minimum 6 characters
- Bcrypt hashing với salt rounds
- Password change tracking
- Current password verification

### 2. Token Security
- JWT với expiration time
- Refresh token rotation
- Token blacklisting on logout
- Secure token storage recommendations

### 3. Rate Limiting
- Configurable rate limits
- Per-IP tracking
- Protection against brute force attacks

### 4. Input Validation
- DTO validation với class-validator
- Email format validation
- Required field checking
- Type safety với TypeScript

## 🔄 Keycloak Integration

### 1. Setup Keycloak
1. Tạo realm mới: `nestjs-realm`
2. Tạo client: `nestjs-client`
3. Configure client settings:
   - Access Type: confidential
   - Valid Redirect URIs: `http://localhost:3000/*`
   - Web Origins: `http://localhost:3000`

### 2. User Synchronization
- **Automatic**: User được sync tự động khi tạo/cập nhật
- **Manual**: Sử dụng sync endpoints
- **Bidirectional**: Sync từ local đến Keycloak và ngược lại

### 3. Token Validation
- **Primary**: Public key verification
- **Fallback**: Token introspection endpoint
- **Error Handling**: Graceful fallback giữa các methods

## 🧪 Testing

### 1. Sử dụng test files
```bash
# Test authentication flows
./test-auth.http

# Test API endpoints
./api-test.http
```

### 2. Manual Testing
1. Đăng ký user mới
2. Đăng nhập và lấy token
3. Test protected endpoints
4. Test role-based access
5. Test Keycloak integration

### 3. Automated Testing
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🚨 Lưu ý Production

### 1. Security Checklist
- [ ] Đổi tất cả secret keys
- [ ] Enable HTTPS
- [ ] Cấu hình CORS đúng
- [ ] Setup rate limiting phù hợp
- [ ] Implement logging và monitoring
- [ ] Secure database connection
- [ ] Setup proper error handling

### 2. Keycloak Production
- [ ] Sử dụng production-ready Keycloak
- [ ] SSL/TLS certificates
- [ ] Database persistence
- [ ] Backup strategy
- [ ] High availability setup

### 3. Monitoring
- [ ] Application logs
- [ ] Authentication metrics
- [ ] Error tracking
- [ ] Performance monitoring
- [ ] Security alerts

## 📚 Tài liệu tham khảo

- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [Passport.js](http://www.passportjs.org/)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [JWT.io](https://jwt.io/)

## 🤝 Contributing

Khi đóng góp cho dự án:
1. Follow coding standards
2. Write tests cho features mới
3. Update documentation
4. Test thoroughly trước khi submit PR

## 📄 License

MIT License - xem file LICENSE để biết thêm chi tiết.
