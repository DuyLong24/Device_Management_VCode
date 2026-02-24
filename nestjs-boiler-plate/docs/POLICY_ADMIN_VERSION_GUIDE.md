# Policy Admin - Version Management Guide

## 🔍 Vấn đề: Duplicate key error khi publish

### Triệu chứng
```
MongoServerError: E11000 duplicate key error collection: glorin.versions index: hash_1 dup key: { hash: "83d5e82194c64c78b23aee3dfc77d9dc21ab3de3f80d02b944df85bfd36bc9f7" }
```

### Nguyên nhân
- Hash được tạo từ cùng một payload (permissions, roles, catalog giống nhau)
- Version với hash đó đã tồn tại trong database
- MongoDB có unique index trên field `hash`

## 🛠️ Cách xử lý

### 1. Kiểm tra versions hiện có
```bash
curl -X GET "http://localhost:3000/policy/versions"
```

Response:
```json
[
  {
    "id": "...",
    "hash": "83d5e82194c64c78b23aee3dfc77d9dc21ab3de3f80d02b944df85bfd36bc9f7",
    "snapshot": {
      "app": {
        "permissions": {...},
        "roles": {...},
        "catalog": {...}
      }
    },
    "createdBy": "admin",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 2. Kiểm tra version cụ thể
```bash
curl -X GET "http://localhost:3000/policy/versions/83d5e82194c64c78b23aee3dfc77d9dc21ab3de3f80d02b944df85bfd36bc9f7"
```

### 3. Publish lại (sẽ sử dụng version cũ nếu hash giống)
```bash
curl -X POST "http://localhost:3000/policy/publish" \
  -H "Content-Type: application/json" \
  -d '{"createdBy": "admin"}'
```

Logs sẽ hiển thị:
```
Version with hash 83d5e82194c64c78b23aee3dfc77d9dc21ab3de3f80d02b944df85bfd36bc9f7 already exists, using existing version
✅ Version saved with hash: 83d5e82194c64c78b23aee3dfc77d9dc21ab3de3f80d02b944df85bfd36bc9f7
```

## 📋 Version Management

### Cách hoạt động
1. **Hash generation**: Tạo hash SHA256 từ payload (permissions + roles + catalog)
2. **Duplicate check**: Kiểm tra hash đã tồn tại chưa
3. **Save or reuse**: 
   - Nếu hash mới → tạo version mới
   - Nếu hash đã tồn tại → sử dụng version cũ

### Lợi ích
- **Deduplication**: Tránh lưu trùng lặp
- **History tracking**: Theo dõi lịch sử thay đổi
- **Rollback**: Có thể rollback về version cũ
- **Audit trail**: Audit trail cho compliance

## 🔧 Các trường hợp sử dụng

### 1. Publish lần đầu
```bash
# Tạo permissions, roles, catalog
# Publish lần đầu → tạo version mới
curl -X POST "http://localhost:3000/policy/publish" \
  -H "Content-Type: application/json" \
  -d '{"createdBy": "admin"}'
```

### 2. Publish lại (không thay đổi data)
```bash
# Publish lại với data giống → sử dụng version cũ
curl -X POST "http://localhost:3000/policy/publish" \
  -H "Content-Type: application/json" \
  -d '{"createdBy": "admin"}'
```

### 3. Publish với data thay đổi
```bash
# Thêm permission mới
curl -X PUT "http://localhost:3000/policy/permissions:bulk-upsert" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": [
      {
        "key": "user:delete",
        "resources": [
          {"path": "/users/:id", "methods": ["DELETE"]}
        ]
      }
    ]
  }'

# Publish → tạo version mới (hash khác)
curl -X POST "http://localhost:3000/policy/publish" \
  -H "Content-Type: application/json" \
  -d '{"createdBy": "admin"}'
```

## 📊 Version History

### Xem tất cả versions
```bash
curl -X GET "http://localhost:3000/policy/versions"
```

### Xem version cụ thể
```bash
curl -X GET "http://localhost:3000/policy/versions/{hash}"
```

### So sánh versions
```bash
# Lấy 2 versions để so sánh
curl -X GET "http://localhost:3000/policy/versions/hash1"
curl -X GET "http://localhost:3000/policy/versions/hash2"
```

## 🚨 Troubleshooting

### 1. "Duplicate key error"
```
MongoServerError: E11000 duplicate key error
```
**Giải pháp**: Đây là behavior bình thường, version sẽ được reuse

### 2. "Version not found"
```
Error: Version not found
```
**Giải pháp**: Kiểm tra hash có đúng không

### 3. "Hash mismatch"
```
Error: Hash mismatch
```
**Giải pháp**: Kiểm tra data có thay đổi không

## 🔄 Quy trình làm việc

### 1. Development
```bash
# 1. Tạo/modify permissions, roles
# 2. Publish để test
curl -X POST "http://localhost:3000/policy/publish"

# 3. Kiểm tra OPA
curl -X GET "http://localhost:3000/policy/debug/opa/data"
curl -X POST "http://localhost:3000/policy/simulate" # test

# 4. Lặp lại nếu cần
```

### 2. Production
```bash
# 1. Review changes
curl -X GET "http://localhost:3000/policy/versions"

# 2. Publish to production
curl -X POST "http://localhost:3000/policy/publish" \
  -H "Content-Type: application/json" \
  -d '{"createdBy": "production-deploy"}'

# 3. Verify deployment
curl -X GET "http://localhost:3000/policy/debug/opa/health"
curl -X POST "http://localhost:3000/policy/simulate" # smoke test
```

## 📝 Best Practices

### 1. Version Naming
- Sử dụng `createdBy` để track ai tạo version
- Ví dụ: `"admin"`, `"ci-cd"`, `"production-deploy"`

### 2. Change Management
- Review changes trước khi publish
- Test với simulate trước khi deploy
- Monitor OPA health sau khi publish

### 3. Rollback Strategy
- Lưu trữ versions để có thể rollback
- Test rollback procedure
- Document rollback steps

## 🎯 Kết quả mong đợi

Sau khi implement version management:
1. **No duplicate errors** - Versions được reuse khi hash giống
2. **History tracking** - Có thể xem lịch sử thay đổi
3. **Audit trail** - Track ai tạo version khi nào
4. **Rollback capability** - Có thể rollback về version cũ
5. **Efficient storage** - Không lưu trùng lặp data
