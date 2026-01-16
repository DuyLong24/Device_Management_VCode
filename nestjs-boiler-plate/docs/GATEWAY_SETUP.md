# API Gateway với OPA và Envoy

## Mô hình kiến trúc

```
Client with Keycloak Token → Envoy → OPA → Envoy → NestJS Backend (192.168.1.8:3000)
```

## Cấu hình đã cập nhật

### 1. Docker Compose
- **OPA**: Chạy trên port 8181 (API) và 9191 (gRPC cho Envoy)
- **Envoy**: Chạy trên port 8080 (Gateway) và 10000 (Admin)
- Backend NestJS: 192.168.1.8:3000

### 2. Envoy Configuration
- Lắng nghe trên port 8080
- Kết nối đến OPA qua gRPC port 9191
- Forward requests đến NestJS backend tại 192.168.1.8:3000
- Có admin interface tại port 10000

### 3. OPA Policy
- Kiểm tra Keycloak JWT token
- Verify token expiration
- Check issuer là Keycloak
- Phân quyền dựa trên roles trong token

## Cách sử dụng

### Khởi động dịch vụ
```bash
# Sử dụng script tự động
./start-gateway.sh

# Hoặc khởi động thủ công
docker-compose up -d opa envoy
```

### Dừng dịch vụ
```bash
# Sử dụng script
./stop-gateway.sh

# Hoặc dừng thủ công
docker-compose down opa envoy
```

### Test Gateway

#### 1. Health Check (không cần token)
```bash
curl http://localhost:8080/health
```

#### 2. Protected endpoints (cần Keycloak token)
```bash
curl -H "Authorization: Bearer <your-keycloak-token>" \
     http://localhost:8080/users
```

#### 3. Login endpoint (không cần token)
```bash
curl -X POST http://localhost:8080/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"user","password":"pass"}'
```

## URLs dịch vụ

- **Gateway**: http://localhost:8080
- **OPA API**: http://localhost:8181
- **Envoy Admin**: http://localhost:10000
- **Backend**: http://192.168.1.8:3000

## Kiểm tra logs

```bash
# Xem logs của OPA và Envoy
docker-compose logs -f opa envoy

# Xem logs riêng biệt
docker-compose logs -f opa
docker-compose logs -f envoy
```

## Debugging

### 1. Kiểm tra OPA policy
```bash
# Test OPA policy trực tiếp
curl -X POST http://localhost:8181/v1/data/envoy/authz/allow \
     -H "Content-Type: application/json" \
     -d @test-input.json
```

### 2. Kiểm tra Envoy config
```bash
# Xem config hiện tại
curl http://localhost:10000/config_dump

# Xem stats
curl http://localhost:10000/stats
```

### 3. Kiểm tra kết nối backend
```bash
# Test direct connection to backend
curl http://192.168.1.8:3000/health
```

## Customization

### Thêm routes mới trong OPA policy
Chỉnh sửa file `config/opa/policy.rego`:

```rego
# Thêm path mới vào allowed_paths
allowed_paths := [
    "/users",
    "/products", 
    "/upload",
    "/tokens",
    "/fnc-roles",
    "/your-new-endpoint"  # Thêm endpoint mới
]
```

### Thay đổi backend IP
Chỉnh sửa file `config/envoy/envoy.yaml`:

```yaml
socket_address: { address: 192.168.1.8, port_value: 3000 }
```

## Troubleshooting

### OPA không start
- Kiểm tra policy syntax: `opa fmt config/opa/policy.rego`
- Xem logs: `docker-compose logs opa`

### Envoy không kết nối được OPA
- Kiểm tra OPA đang chạy trên port 9191
- Verify network connectivity between containers

### Backend không accessible
- Đảm bảo NestJS backend đang chạy trên 192.168.1.8:3000
- Kiểm tra firewall settings
- Test direct connection: `curl http://192.168.1.8:3000/health`
