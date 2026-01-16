# Authentication & Authorization API Examples

## Base URL
```
http://localhost:3000
```

## Authentication Endpoints

### 1. Register User
```http
POST /auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "name": "John Doe",
  "phoneNumber": "+1234567890"
}
```

### 2. Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "john@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

### 3. Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token_here"
}
```

### 4. Get Profile
```http
GET /auth/profile
Authorization: Bearer your_access_token_here
```

### 5. Change Password
```http
POST /auth/change-password
Authorization: Bearer your_access_token_here
Content-Type: application/json

{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

### 6. Logout
```http
POST /auth/logout
Authorization: Bearer your_access_token_here
```

## User Management Endpoints (Requires Authorization)

### 1. Create User (Requires: create_user permission)
```http
POST /users
Authorization: Bearer your_access_token_here
Content-Type: application/json

{
  "username": "jane_doe",
  "email": "jane@example.com",
  "password": "password123",
  "name": "Jane Doe",
  "funcRoleId": "role_id_here"
}
```

### 2. Get All Users (Requires: list_users permission)
```http
GET /users
Authorization: Bearer your_access_token_here
```

### 3. Get User by ID (Requires: get_user permission)
```http
GET /users/{user_id}
Authorization: Bearer your_access_token_here
```

### 4. Update User (Requires: update_user permission)
```http
PUT /users/{user_id}
Authorization: Bearer your_access_token_here
Content-Type: application/json

{
  "name": "Updated Name",
  "phoneNumber": "+0987654321"
}
```

### 5. Delete User (Requires: delete_user permission)
```http
DELETE /users/{user_id}
Authorization: Bearer your_access_token_here
```

### 6. Assign Role to User (Requires: manage_users permission)
```http
PATCH /users/{user_id}/assign-role
Authorization: Bearer your_access_token_here
Content-Type: application/json

{
  "roleCode": "admin"
}
```

### 7. Remove Role from User (Requires: manage_users permission)
```http
PATCH /users/{user_id}/remove-role
Authorization: Bearer your_access_token_here
Content-Type: application/json

{
  "roleCode": "editor"
}
```

## Role & Permission Examples

### Default Roles and Their Permissions:

1. **super_admin**:
   - All permissions (manage_users, create_user, update_user, delete_user, etc.)

2. **admin**:
   - manage_users, create_user, update_user, delete_user, get_user, list_users

3. **editor**:
   - create_user, update_user, get_user, list_users

4. **viewer**:
   - get_user, list_users

5. **user**:
   - get_user, update_own_profile, change_own_password

## Environment Variables (.env)

```env
# Authentication Strategy (jwt | keycloak)
AUTH_STRATEGY=jwt

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_REFRESH_EXPIRATION=7d

# Keycloak Configuration (if using keycloak strategy)
KEYCLOAK_BASE_URL=http://localhost:8080
KEYCLOAK_REALM=nestjs-realm
KEYCLOAK_CLIENT_ID=nestjs-client
KEYCLOAK_CLIENT_SECRET=your_keycloak_client_secret
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin

# Database
DATABASE_URL=mongodb://localhost:27017/nestjs_ddd

# Application
PORT=3000
NODE_ENV=development

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=10
```

## Using Decorators in Controllers

### Example Controller with Authorization:

```typescript
@Controller('protected')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ProtectedController {

  // Only users with 'admin' role can access
  @Get('admin-only')
  @Roles('admin')
  async adminOnly() {
    return { message: 'Admin only endpoint' };
  }

  // Only users with specific permissions can access
  @Post('create-resource')
  @Permissions('create_resource', 'manage_resources')
  async createResource() {
    return { message: 'Resource created' };
  }

  // Public endpoint (no authentication required)
  @Get('public')
  @Public()
  async publicEndpoint() {
    return { message: 'This is public' };
  }

  // Use specific auth strategy
  @Get('keycloak-only')
  @AuthStrategy('keycloak')
  async keycloakOnly() {
    return { message: 'Keycloak authentication required' };
  }
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Authentication failed"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions. Required: create_user",
  "error": "Forbidden"
}
```

### 429 Too Many Requests
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```
