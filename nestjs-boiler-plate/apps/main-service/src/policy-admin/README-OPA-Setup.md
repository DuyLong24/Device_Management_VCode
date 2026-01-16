# OPA (Open Policy Agent) Setup for Policy Admin

## Prerequisites

1. OPA server running (version 0.40+ recommended)
2. Policy Admin module configured
3. Keycloak integration working

## Configuration

### 1. Environment Variables

Add OPA configuration to your `.env` file:

```bash
# OPA Configuration
OPA_URL=http://localhost:8181
```

### 2. OPA Server Setup

#### Option 1: Docker (Recommended)

```bash
docker run -d \
  --name opa \
  -p 8181:8181 \
  openpolicyagent/opa:latest \
  run --server --addr :8181
```

#### Option 2: Binary Download

1. Download OPA from https://www.openpolicyagent.org/docs/latest/#running-opa
2. Run: `./opa run --server --addr :8181`

### 3. Testing OPA Connection

The application includes health check functionality:

```typescript
// Test OPA connection
const opaService = new OpaService(configService);
const isHealthy = await opaService.healthCheck();
console.log('OPA Health:', isHealthy);
```

## Policy Structure

### Policy Files

The application uses policy files located in `config/opa/`:

1. **`authz.rego`** - Main policy file for policy admin RBAC
2. **`policy.rego`** - Envoy authorization policy (if exists)

The application will:
1. Try to load existing policy from `authz.rego`
2. Generate new RBAC rules if needed
3. Merge existing policy with new rules
4. Publish the merged policy to OPA

#### Main Policy Structure (`authz.rego`):

```rego
package policy_admin

# Default deny
default allow = false

# Allow if user has required permission for the resource
allow if {
    # Get the HTTP method and path
    method := input.http.method
    path := input.http.path
    
    # Get user permissions
    user_perms := input.subject.perms
    
    # Check if any permission grants access to this resource
    some perm
    perm = user_perms[_]
    
    # Get permission resources from app data
    resources := data.app.permissions[perm].resources
    
    # Check if any resource matches the current request
    some resource
    resource = resources[_]
    
    # Check if path matches (simple string matching for now)
    resource.path == path
    
    # Check if method is allowed
    method_allowed(method, resource.methods)
}

# Helper function to check if method is allowed
method_allowed(method, allowed_methods) if {
    method == allowed_methods[_]
}
```

### Data Structure

The application publishes data to OPA in this format:

```json
{
  "app": {
    "permissions": {
      "user:read": {
        "resources": [
          {
            "path": "users",
            "methods": ["GET"]
          }
        ]
      }
    },
    "catalog": {
      "modules": [
        {
          "code": "users",
          "name": "User Management"
        }
      ],
      "actions": ["get", "post", "put", "delete"],
      "resourceTemplates": [
        {
          "module": "users",
          "path": "users",
          "methods": ["GET", "POST"]
        }
      ]
    }
  }
}
```

## Troubleshooting

### Common Issues:

1. **400 Error - Policy Compilation**
   - Check the generated policy syntax
   - Verify Rego syntax is correct
   - Check for missing package declaration

2. **404 Error - Policy Not Found**
   - Ensure policy was published successfully
   - Check OPA server is running
   - Verify policy ID matches

3. **Connection Refused**
   - Check OPA server is running on correct port
   - Verify OPA_URL environment variable
   - Check firewall settings

### Debug Mode

The service includes detailed logging:

```typescript
// Enable debug logging
console.log('Generated policy rules:', policyRules);
console.log('Policy validation result:', isValid);
console.log('OPA response:', response.data);
```

### Manual Testing

Test policies manually using OPA CLI:

```bash
# Test policy compilation
opa eval --data authz.rego "data.authz.allow"

# Test with input
opa eval --data authz.rego --input input.json "data.authz.allow"
```

Example input.json:
```json
{
  "input": {
    "http": {
      "method": "GET",
      "path": "users"
    },
    "subject": {
      "user_id": "user123",
      "roles": ["admin"],
      "perms": ["user:read"]
    }
  }
}
```

## API Endpoints

### Publish Policy
```http
POST /policy/publish
Content-Type: application/json

{
  "app": {
    "permissions": { ... },
    "catalog": { ... }
  }
}
```

### Test Policy
```http
POST /policy/test
Content-Type: application/json

{
  "http": {
    "method": "GET",
    "path": "users"
  },
  "subject": {
    "user_id": "user123",
    "roles": ["admin"],
    "perms": ["user:read"]
  }
}
```

### Policy Merging

The application automatically merges policies:

1. **Loads existing policy** from `config/opa/authz.rego`
2. **Generates new RBAC rules** if needed
3. **Merges policies** to avoid conflicts
4. **Publishes merged policy** to OPA

#### Merge Logic:
- If no existing policy file exists, uses generated policy only
- If existing policy already contains RBAC rules, uses existing policy
- Otherwise, merges existing policy with new RBAC rules

### Manual Testing

You can test the policy manually using the provided test script:

```bash
node apps/main-service/src/policy-admin/test-policy-admin.js
```

Or test individual components:

```bash
# Test policy loading
curl -X PUT http://localhost:8181/v1/policies/policy-admin -H "Content-Type: text/plain" --data-binary @config/opa/authz.rego

# Test policy evaluation
curl -X POST http://localhost:8181/v1/data/policy_admin/allow -H "Content-Type: application/json" -d '{"input": {"http": {"method": "GET", "path": "users"}, "subject": {"perms": ["user:read"]}}}'
```

### Health Check
```http
GET /policy/health
```

## Integration with Keycloak

The OPA service works with Keycloak to:

1. **Sync roles and permissions** from Keycloak to OPA
2. **Evaluate access** based on user permissions
3. **Cache policy decisions** for performance

### Flow:
1. User authenticates with Keycloak
2. User permissions are extracted from JWT token
3. OPA evaluates access based on permissions and resource
4. Access granted/denied based on policy rules
