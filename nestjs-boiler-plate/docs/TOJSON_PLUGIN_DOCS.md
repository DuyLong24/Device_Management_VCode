# toJSON Plugin Documentation

## 🎯 Tổng quan
`toJSON` plugin là một Mongoose schema plugin được tích hợp tự động vào tất cả entities được generate bởi hệ thống. Plugin này giúp:

1. **Loại bỏ private fields** khỏi JSON response
2. **Transform `_id` thành `id`** để đồng nhất API response
3. **Loại bỏ mongoose internal fields** như `__v`, `createdAt`, `updatedAt`

## 🔧 Cách hoạt động

### Trong Entity
```typescript
import { toJSONPlugin } from '../../plugins/toJSON.plugin';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  username!: string;

  @Prop({ required: true, private: true }) // ← Private field
  password!: string;

  @Prop({ private: true }) // ← Private field
  secretToken?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.plugin(toJSONPlugin); // ← Apply plugin
```

### Response Transformation

**Before (Raw MongoDB document):**
```json
{
  "_id": "64f1b2b3c9b9c7a3d8e1f2g3",
  "username": "john_doe",
  "password": "hashed_password_123",
  "secretToken": "secret_abc_xyz",
  "name": "John Doe",
  "__v": 0,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**After (toJSON transformation):**
```json
{
  "id": "64f1b2b3c9b9c7a3d8e1f2g3",
  "username": "john_doe",
  "name": "John Doe"
}
```

## 🛡️ Private Fields

### Cách đánh dấu field là private:
```typescript
@Prop({ required: true, private: true })
password!: string;

@Prop({ private: true })
sensitiveData?: string;
```

### Fields được loại bỏ tự động:
- Tất cả fields có `private: true`
- `_id` (được chuyển thành `id`)
- `__v` (mongoose version key)
- `createdAt` (mongoose timestamp)
- `updatedAt` (mongoose timestamp)

## 📝 Implementation Details

### Plugin Code:
```typescript
export const toJSONPlugin = (schema: Schema): void => {
  schema.options.toJSON = Object.assign(schema.options.toJSON || {}, {
    transform(doc: any, ret: any, options: any) {
      // Remove private fields
      Object.keys(schema.paths).forEach((path) => {
        if (schema.paths[path].options && schema.paths[path].options.private) {
          deleteAtPath(ret, path.split('.'), 0);
        }
      });

      // Transform _id to id
      if (ret._id) {
        ret.id = ret._id.toString();
        delete ret._id;
      }
      
      // Remove mongoose internal fields
      delete ret.__v;
      delete ret.createdAt;
      delete ret.updatedAt;
      
      return ret;
    },
  });
};
```

## 🔄 Tích hợp với Templates

### Entity Template tự động apply:
```typescript
// templates/entity.txt
import { toJSONPlugin } from '../../plugins/toJSON.plugin';

@Schema({ timestamps: true })
export class {{MODULE_NAME_CAPITAL}} extends Document {
  // ... fields

  // Virtual for id (will be handled by toJSON plugin)
  id?: string;
}

export const {{MODULE_NAME_CAPITAL}}Schema = SchemaFactory.createForClass({{MODULE_NAME_CAPITAL}});

// Apply plugins
{{MODULE_NAME_CAPITAL}}Schema.plugin(paginate);
{{MODULE_NAME_CAPITAL}}Schema.plugin(toJSONPlugin); // ← Auto applied
```

## 💡 Use Cases

### 1. **User Authentication:**
```typescript
@Prop({ required: true, private: true })
password!: string;

@Prop({ private: true })
refreshToken?: string;
```

### 2. **Internal System Fields:**
```typescript
@Prop({ private: true })
internalNotes?: string;

@Prop({ private: true })
systemFlags?: any;
```

### 3. **Sensitive Business Data:**
```typescript
@Prop({ private: true })
cost?: number; // Hide from public API

@Prop()
price!: number; // Show in public API
```

## 🎯 Benefits

1. **Security**: Tự động ẩn sensitive data
2. **Consistency**: Unified API response format với `id` thay vì `_id`  
3. **Clean Response**: Loại bỏ mongoose internal fields
4. **Easy to Use**: Chỉ cần thêm `private: true` option
5. **Automatic**: Apply tự động cho tất cả modules được generate

## 🚀 Testing

### Test API Response:
```bash
# Create user
POST /users
{
  "username": "testuser",
  "password": "secret123",
  "name": "Test User"
}

# Expected Response (password bị ẩn):
{
  "id": "64f1b2b3c9b9c7a3d8e1f2g3",
  "username": "testuser", 
  "name": "Test User"
}
```

### Verify toJSON Working:
```typescript
// In service or controller
const user = await this.userRepository.create(createUserDto);
console.log(user.toJSON()); // Should not contain password or internal fields
```

## 🔧 Customization

### Thêm custom transformation:
```typescript
UserSchema.options.toJSON.transform = function(doc, ret, options) {
  // Apply toJSON plugin logic first
  const result = toJSONPlugin(doc, ret, options);
  
  // Add custom transformations
  if (result.dateOfBirth) {
    result.age = calculateAge(result.dateOfBirth);
  }
  
  return result;
};
```

## ⚡ Performance Notes

- Plugin chỉ chạy khi `.toJSON()` được gọi
- Không ảnh hưởng đến database queries
- Chỉ transform data khi serialize response
- Minimal overhead cho JSON responses

## 📋 Best Practices

1. **Always mark sensitive fields as private:**
   ```typescript
   @Prop({ required: true, private: true })
   password!: string;
   ```

2. **Use meaningful field names:**
   ```typescript
   id?: string; // Virtual field for consistency
   ```

3. **Test API responses** để ensure private fields không expose

4. **Document private fields** trong code comments

5. **Review security** khi thêm fields mới vào entities
