# User Module API Documentation

## Endpoints

### 1. Create User
- **Method**: `POST`
- **URL**: `/users`
- **Description**: Tạo người dùng mới
- **Body**:
```json
{
  "username": "string (required)",
  "email": "string (required, unique)",
  "password": "string (required, min 6 chars)",
  "name": "string (required)",
  "gender": "male|female|other (optional)",
  "code": "string (optional)",
  "funcRoleId": "string (optional)",
  "uiRoleId": "string (optional)",
  "dateOfBirth": "string (ISO date, optional)",
  "phoneNumber": "string (optional)",
  "address": "string (optional)",
  "status": "active|inactive|pending (optional, default: pending)",
  "isPasswordChange": "boolean (optional, default: false)"
}
```

### 2. Register User
- **Method**: `POST`
- **URL**: `/users/register`
- **Description**: Đăng ký người dùng (endpoint đơn giản)
- **Body**:
```json
{
  "username": "string (required)",
  "email": "string (required)",
  "password": "string (required)"
}
```

### 3. Get All Users
- **Method**: `GET`
- **URL**: `/users`
- **Description**: Lấy danh sách tất cả người dùng

### 4. Get User by ID
- **Method**: `GET`
- **URL**: `/users/:id`
- **Description**: Lấy thông tin người dùng theo ID
- **Params**: `id` - MongoDB ObjectId

### 5. Get User by Email
- **Method**: `GET`
- **URL**: `/users/by-email?email={email}`
- **Description**: Tìm người dùng theo email
- **Query**: `email` - Email của người dùng

### 6. Update User
- **Method**: `PUT`
- **URL**: `/users/:id`
- **Description**: Cập nhật thông tin người dùng
- **Params**: `id` - MongoDB ObjectId
- **Body**: Tất cả fields đều optional, chỉ gửi những field cần cập nhật
```json
{
  "username": "string (optional)",
  "email": "string (optional)",
  "password": "string (optional, min 6 chars)",
  "name": "string (optional)",
  "gender": "male|female|other (optional)",
  "code": "string (optional)",
  "funcRoleId": "string (optional)",
  "uiRoleId": "string (optional)",
  "dateOfBirth": "string (ISO date, optional)",
  "phoneNumber": "string (optional)",
  "address": "string (optional)",
  "status": "active|inactive|pending (optional)",
  "isPasswordChange": "boolean (optional)"
}
```

### 7. Delete User
- **Method**: `DELETE`
- **URL**: `/users/:id`
- **Description**: Xóa người dùng
- **Params**: `id` - MongoDB ObjectId

### 8. Set Password
- **Method**: `PATCH`
- **URL**: `/users/:id/set-password`
- **Description**: Đặt password mới cho người dùng (admin function)
- **Params**: `id` - MongoDB ObjectId
- **Body**:
```json
{
  "newPassword": "string (required, min 6 chars)"
}
```
- **Response**:
```json
{
  "message": "Password set successfully",
  "user": {
    // user object without password
  }
}
```

### 9. Change Password
- **Method**: `PATCH`
- **URL**: `/users/:id/change-password`
- **Description**: Thay đổi password (user function)
- **Params**: `id` - MongoDB ObjectId
- **Body**:
```json
{
  "currentPassword": "string (required, min 6 chars)",
  "newPassword": "string (required, min 6 chars)"
}
```
- **Response**:
```json
{
  "message": "Password changed successfully",
  "user": {
    // user object without password
  }
}
```

## Error Responses

### 400 Bad Request
- Validation errors (missing required fields, invalid format)
- Current password is incorrect
- New password must be different from current password
- Failed to update password

### 404 Not Found
- User not found

### 409 Conflict
- Email already exists

## Features

### Validation
- Email format validation
- Password minimum length (6 characters)
- Required field validation
- Enum validation for gender and status

### Business Logic
- Email uniqueness check on create and update
- Automatic date conversion for dateOfBirth and dayPasswordChange
- Email validation using EmailVO value object
- Password change tracking (isPasswordChange, dayPasswordChange)

### Password Management
- **Set Password**: Admin can set new password for any user
- **Change Password**: User can change their own password with current password verification
- Password change is tracked with timestamp
- New password must be different from current password
- Passwords are not returned in API responses

### Error Handling
- Proper HTTP status codes
- Descriptive error messages
- Exception handling for common scenarios

## Security Notes
⚠️ **Important**: Current implementation stores passwords in plain text for demonstration purposes. In production:
- Use bcrypt or similar hashing library
- Implement proper password hashing and comparison
- Add rate limiting for password change attempts
- Implement proper authentication and authorization

## Testing

Use the `api-test.http` file to test all endpoints with sample data.

## 10. Keycloak Integration

### 10.1 Overview
The system integrates with Keycloak for SSO authentication and user management. When enabled, the system can:
- Authenticate users using Keycloak tokens (JWT)
- Automatically sync user data between local database and Keycloak
- Support both local JWT and Keycloak authentication strategies

### 10.2 Keycloak Sync Endpoints

#### 10.2.1 Sync User to Keycloak
- **Method**: `POST`
- **URL**: `/users/:id/sync-to-keycloak`
- **Description**: Manually sync a user to Keycloak
- **Params**: `id` - MongoDB ObjectId
- **Response**:
```json
{
  "message": "User synced to Keycloak successfully",
  "keycloakId": "keycloak-user-id"
}
```

#### 10.2.2 Sync User from Keycloak
- **Method**: `POST`
- **URL**: `/users/:id/sync-from-keycloak`
- **Description**: Sync user data from Keycloak to local database
- **Params**: `id` - MongoDB ObjectId
- **Response**:
```json
{
  "message": "User synced from Keycloak successfully",
  "user": {
    // updated user object
  }
}
```

### 10.3 Configuration
Required environment variables for Keycloak integration:

```bash
KEYCLOAK_BASE_URL=http://localhost:8080
KEYCLOAK_REALM=nestjs-realm
KEYCLOAK_CLIENT_ID=nestjs-client
KEYCLOAK_CLIENT_SECRET=your_keycloak_client_secret
KEYCLOAK_PUBLIC_KEY_URL=http://localhost:8080/realms/nestjs-realm/protocol/openid_connect/certs
KEYCLOAK_INTROSPECTION_URL=http://localhost:8080/realms/nestjs-realm/protocol/openid_connect/token/introspect
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin
```

### 10.4 Authentication Strategies
The system supports multiple authentication strategies:
1. **JWT Only**: Use local JWT tokens
2. **Keycloak Only**: Use Keycloak tokens exclusively
3. **Both**: Support both JWT and Keycloak tokens (recommended)

Configure via `AUTH_STRATEGY` environment variable:
- `jwt` - JWT only
- `keycloak` - Keycloak only
- `both` - Support both (default)

### 10.5 Token Validation
Keycloak tokens are validated using:
1. **Public Key Verification**: Primary method using Keycloak's public keys
2. **Token Introspection**: Fallback method when public key verification fails

### 10.6 User Synchronization
- **Automatic Sync**: When a user is created/updated, it's automatically synced to Keycloak (if enabled)
- **Manual Sync**: Use the sync endpoints for manual synchronization
- **Bidirectional**: Support syncing both to and from Keycloak
