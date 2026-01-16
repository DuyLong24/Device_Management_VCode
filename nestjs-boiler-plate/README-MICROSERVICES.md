# NestJS Microservices with Kafka

Dự án NestJS được refactor từ kiến trúc monolithic sang microservices sử dụng Kafka để giao tiếp.

## Cấu trúc dự án

```
├── apps/
│   ├── main-service/          # Service chính chứa tất cả module cũ
│   │   └── src/
│   │       ├── main.ts        # Entry point của main service
│   │       ├── app.module.ts  # App module với Kafka config
│   │       ├── file/          # Module xử lý file upload qua Kafka
│   │       └── ...            # Các module khác (auth, users, etc.)
│   └── upload-service/        # Service chuyên xử lý upload file
│       └── src/
│           ├── main.ts        # Entry point của upload service
│           ├── app.module.ts  # App module
│           └── upload/        # Module upload
├── libs/
│   └── shared/               # Shared library
│       └── src/
│           ├── constants/    # Kafka constants
│           ├── interfaces/   # Shared interfaces
│           └── dto/         # Shared DTOs
├── docker-compose.yml       # Kafka, Zookeeper, MongoDB
└── package.json            # Dependencies và scripts
```

## Cài đặt và chạy

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Khởi động Kafka và MongoDB

```bash
docker-compose up -d
```

### 3. Copy file environment

```bash
cp .env.example .env
```

### 4. Chạy các services

#### Chạy tất cả services cùng lúc:
```bash
npm run start:dev
```

#### Hoặc chạy từng service riêng:

**Main Service (port 3001):**
```bash
npm run start:main:dev
```

**Upload Service (port 3002):**
```bash
npm run start:upload:dev
```

## Kiến trúc Microservices

### Main Service (Port 3001)
- Chứa tất cả module cũ: Auth, Users, FncRoles, Tokens, etc.
- Có thêm File module để giao tiếp với Upload Service qua Kafka
- Hoạt động như API Gateway nhận request từ client

### Upload Service (Port 3002)
- Microservice chuyên xử lý upload và quản lý file
- Lắng nghe Kafka messages từ Main Service
- Lưu file local hoặc cloud storage

### Giao tiếp qua Kafka

**Topics:**
- `file.upload` - Upload file request
- `file.upload.response` - Upload file response
- `file.delete` - Delete file request  
- `file.delete.response` - Delete file response

## API Endpoints

### Upload File

```bash
curl -X POST http://localhost:3001/files/upload \
  -F "file=@/path/to/your/file.jpg" \
  -F "userId=user123" \
  -F "metadata={\"description\":\"Test file\"}"
```

### Delete File

```bash
curl -X DELETE http://localhost:3001/files/{fileId} \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123"}'
```

## Workflow

1. **Client gửi file** → Main Service `/files/upload`
2. **Main Service** nhận file và gửi qua Kafka topic `file.upload`
3. **Upload Service** nhận message, xử lý upload, trả response
4. **Main Service** nhận response và trả về client

## Monitoring

- **Kafka UI**: http://localhost:8080 (để monitor Kafka topics và messages)
- **Main Service**: http://localhost:3001
- **Upload Service**: chạy như microservice, không có HTTP endpoint

## Development Scripts

```bash
# Build tất cả services
npm run build:all

# Build riêng từng service  
npm run build:main
npm run build:upload

# Format code
npm run format

# Lint code
npm run lint

# Test
npm run test
```

## Environment Variables

Xem file `.env.example` để biết các biến environment cần thiết.

## Lưu ý

1. Đảm bảo Kafka và MongoDB đang chạy trước khi start services
2. Upload Service lưu file tại thư mục `./uploads`
3. Kafka timeout được set 30s cho upload, 10s cho delete
4. File size limit: 10MB (có thể config trong code)

## Troubleshooting

1. **Lỗi kết nối Kafka**: Kiểm tra docker-compose up -d
2. **Lỗi timeout**: Tăng timeout trong file service
3. **Lỗi upload**: Kiểm tra quyền ghi thư mục uploads
4. **Lỗi MongoDB**: Kiểm tra connection string trong .env
