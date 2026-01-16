# Token Management Guide

## Tại sao Keycloak token chỉ sử dụng được 1 lần?

### Nguyên nhân chính:

1. **Access Token có thời gian sống ngắn**
   - Mặc định Keycloak access token có thời gian sống 5-15 phút
   - Sau khi hết hạn, token sẽ không valid nữa
   - Điều này được thiết kế để bảo mật

2. **Không có cơ chế refresh token**
   - Frontend cần implement logic refresh token
   - Khi access token hết hạn, sử dụng refresh token để lấy token mới

3. **Token không được cache đúng cách**
   - Token cần được lưu trữ và quản lý đúng cách
   - Cần kiểm tra expiration trước khi sử dụng

## Giải pháp:

### 1. Backend Implementation (Đã cải thiện)

#### KeycloakGuard:
- ✅ Kiểm tra token expiration (`exp`) và not-before (`nbf`)
- ✅ Fallback mechanism: Public key verification → Token introspection
- ✅ Detailed error logging
- ✅ Token validation với algorithm RS256

#### TokenManagerService:
- ✅ Refresh access token using refresh token
- ✅ Revoke tokens khi logout
- ✅ Utility methods để check token expiration

### 2. Frontend Implementation (Cần implement)

#### Axios Interceptor Example:

```typescript
// token.service.ts
export class TokenService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpirationTime: number | null = null;

  setTokens(accessToken: string, refreshToken: string, expiresIn: number) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpirationTime = Date.now() + (expiresIn * 1000);
    
    // Save to localStorage
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('token_expiration', this.tokenExpirationTime.toString());
  }

  getAccessToken(): string | null {
    if (!this.accessToken) {
      this.accessToken = localStorage.getItem('access_token');
      const expiration = localStorage.getItem('token_expiration');
      this.tokenExpirationTime = expiration ? parseInt(expiration) : null;
    }
    return this.accessToken;
  }

  isTokenExpired(): boolean {
    if (!this.tokenExpirationTime) return true;
    // Check if token expires in next 30 seconds
    return Date.now() >= (this.tokenExpirationTime - 30000);
  }

  async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshToken) {
      this.refreshToken = localStorage.getItem('refresh_token');
    }

    if (!this.refreshToken) {
      return null;
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const tokenData = await response.json();
      this.setTokens(tokenData.accessToken, tokenData.refreshToken, tokenData.expiresIn);
      
      return tokenData.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return null;
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpirationTime = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expiration');
  }
}

// axios.interceptor.ts
import axios from 'axios';

const tokenService = new TokenService();

// Request interceptor
axios.interceptors.request.use(
  async (config) => {
    let token = tokenService.getAccessToken();
    
    if (token && tokenService.isTokenExpired()) {
      console.log('Token expired, refreshing...');
      token = await tokenService.refreshAccessToken();
      
      if (!token) {
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(new Error('Token refresh failed'));
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await tokenService.refreshAccessToken();
        
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axios(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }

      // If refresh fails, redirect to login
      tokenService.clearTokens();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);
```

### 3. Environment Configuration

```bash
# .env
KEYCLOAK_BASE_URL=http://localhost:8080
KEYCLOAK_REALM=your-realm
KEYCLOAK_CLIENT_ID=your-client-id
KEYCLOAK_CLIENT_SECRET=your-client-secret
KEYCLOAK_PUBLIC_KEY_URL=http://localhost:8080/realms/your-realm/protocol/openid-connect/certs
```

### 4. Keycloak Client Configuration

Trong Keycloak Admin Console:
1. **Access Token Lifespan**: 5-15 minutes
2. **Refresh Token Lifespan**: 30 days
3. **Client Authentication**: ON (for confidential clients)
4. **Valid Redirect URIs**: Configure cho frontend
5. **Web Origins**: Configure CORS

### 5. Best Practices

1. **Luôn check token expiration trước khi gửi request**
2. **Implement retry mechanism với refresh token**
3. **Store tokens securely** (HttpOnly cookies hoặc secure localStorage)
4. **Handle token refresh failures gracefully**
5. **Implement proper logout với token revocation**
6. **Monitor token usage và expired tokens**

### 6. Common Issues & Solutions

#### Issue: "Token chỉ sử dụng được 1 lần"
**Solution**: Implement refresh token mechanism

#### Issue: "Token expired too quickly"
**Solution**: Increase token lifespan trong Keycloak hoặc implement auto-refresh

#### Issue: "CORS errors khi refresh token"
**Solution**: Configure Web Origins trong Keycloak client

#### Issue: "Token không được accept sau refresh"
**Solution**: Check algorithm (RS256) và public key validation

### 7. Testing Token Flow

```bash
# Test token validation
curl -X GET http://localhost:3000/api/protected-endpoint \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Test token refresh
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'

# Test token introspection
curl -X POST http://localhost:8080/realms/your-realm/protocol/openid-connect/token/introspect \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=YOUR_TOKEN&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"
```

## Kết luận

Token chỉ sử dụng được 1 lần là do:
1. **Access token có thời gian sống ngắn** (tính năng bảo mật)
2. **Thiếu cơ chế refresh token** trong frontend
3. **Không có retry mechanism** khi token expired

Với các cải thiện trên, hệ thống sẽ tự động refresh token và handle token expiration một cách seamless.
