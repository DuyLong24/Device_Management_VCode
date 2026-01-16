# Policy Admin API Test

## 🔧 Test Policy Merging

### 1. Test Publish Policy (Merge)
```bash
# Publish policy để merge existing + RBAC rules
curl -X POST "http://localhost:3000/policy/publish" \
  -H "Content-Type: application/json" \
  -d '{
    "createdBy": "test-user"
  }'
```

**Expected Response:**
```json
{
  "hash": "abc123...",
  "version": {
    "id": "...",
    "hash": "abc123...",
    "snapshot": {...},
    "createdBy": "test-user",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Test Get Merged Policy
```bash
# Xem policy được merge (chưa publish)
curl -X GET "http://localhost:3000/policy/debug/opa/policy/merged"
```

**Expected Response:**
```rego
package authz

# Your existing policy here...

# ========================================
# RBAC Policy Rules (Auto-generated)
# ========================================

package policy_admin

# Default deny
default allow = false

# Allow if user has required permission for the resource
allow {
    # ... RBAC logic
}
```

### 3. Test Get Current Policy
```bash
# Xem policy hiện tại trong OPA
curl -X GET "http://localhost:3000/policy/debug/opa/policy/current"
```

### 4. Test OPA Health
```bash
# Kiểm tra OPA server
curl -X GET "http://localhost:3000/policy/debug/opa/health"
```

### 5. Test OPA Data
```bash
# Xem data trong OPA
curl -X GET "http://localhost:3000/policy/debug/opa/data"
```

### 6. Test OPA Policies
```bash
# Xem tất cả policies trong OPA
curl -X GET "http://localhost:3000/policy/debug/opa/policies"
```

## 🚨 Troubleshooting

### Error 400 - Bad Request
**Symptoms:**
```
AxiosError {message: 'Request failed with status code 400'}
```

**Causes:**
1. Wrong API endpoint format
2. Invalid policy syntax
3. Missing required fields

**Solutions:**
1. Check OPA API documentation
2. Validate policy syntax
3. Check request body format

### Error 404 - Not Found
**Symptoms:**
```
Policy not found
```

**Causes:**
1. Policy not published yet
2. Wrong policy ID
3. OPA server not running

**Solutions:**
1. Publish policy first
2. Check policy ID
3. Start OPA server

### Error 500 - Internal Server Error
**Symptoms:**
```
Failed to publish to OPA
```

**Causes:**
1. OPA server error
2. Network issues
3. Invalid data format

**Solutions:**
1. Check OPA server logs
2. Check network connectivity
3. Validate data format

## 📋 Debug Checklist

### Before Publishing
- [ ] OPA server is running
- [ ] Policy file exists (`config/opa/authz.rego` or `config/opa/policy.rego`)
- [ ] Permissions and roles are configured
- [ ] Data is ready to publish

### After Publishing
- [ ] Check OPA health: `GET /policy/debug/opa/health`
- [ ] Check current policy: `GET /policy/debug/opa/policy/current`
- [ ] Check merged policy: `GET /policy/debug/opa/policy/merged`
- [ ] Check OPA data: `GET /policy/debug/opa/data`
- [ ] Test policy evaluation: `POST /policy/simulate`

### Policy Validation
- [ ] Policy syntax is correct
- [ ] Package names are consistent
- [ ] No duplicate rules
- [ ] All required functions defined

## 🔍 Debug Commands

### Direct OPA API Test
```bash
# Test OPA health
curl -X GET "http://localhost:8181/health"

# Test policy evaluation
curl -X POST "http://localhost:8181/v1/data/policy_admin/allow" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "http": {"method": "GET", "path": "/users"},
      "subject": {
        "user_id": "user123",
        "roles": ["admin"],
        "perms": ["user:get"]
      }
    }
  }'

# Get all policies
curl -X GET "http://localhost:8181/v1/policies"

# Get specific policy
curl -X GET "http://localhost:8181/v1/policies/policy-admin"

# Get all data
curl -X GET "http://localhost:8181/v1/data"
```

### Policy Syntax Check
```bash
# Validate policy syntax
curl -X POST "http://localhost:8181/v1/check" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "data.policy_admin.allow",
    "modules": [{
      "path": "policy_admin.rego",
      "raw": "package policy_admin\n\ndefault allow = false\n\nallow {\n  input.subject.roles[_] == \"admin\"\n}"
    }]
  }'
```

## 📊 Expected Logs

### Successful Publish
```
📄 Loaded existing policy from file
📝 Generated new policy rules
🔗 Merged existing policy with new RBAC rules
✅ Policy merged successfully
✅ Data published successfully to OPA
✅ Merged policy published successfully to OPA
```

### Already Merged Policy
```
📄 Loaded existing policy from file
📝 Generated new policy rules
ℹ️ Existing policy already contains RBAC rules, using existing policy
✅ Policy merged successfully
✅ Data published successfully to OPA
✅ Merged policy published successfully to OPA
```

### No Existing Policy
```
📄 No existing policy file found, starting fresh
📝 Generated new policy rules
ℹ️ No existing policy, using generated policy only
✅ Policy merged successfully
✅ Data published successfully to OPA
✅ Merged policy published successfully to OPA
```

## 🎯 Test Scenarios

### Scenario 1: First Time Publish
1. No existing policy file
2. Publish policy
3. Verify RBAC rules are added

### Scenario 2: Update Existing Policy
1. Existing policy with RBAC rules
2. Publish policy
3. Verify existing policy is preserved

### Scenario 3: Add New Rules
1. Existing policy without RBAC rules
2. Publish policy
3. Verify RBAC rules are merged

### Scenario 4: Policy Evaluation
1. Publish policy
2. Test with different permissions
3. Verify access control works

## 📝 Notes

- Policy merging preserves existing rules
- RBAC rules are added as separate package
- Policy ID is `policy-admin`
- Package name is `policy_admin`
- Data is published to `/v1/data/app`
- Policy is published to `/v1/policies/policy-admin`
