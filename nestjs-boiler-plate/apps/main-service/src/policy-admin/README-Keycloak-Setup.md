# Keycloak Setup for Policy Admin

## Prerequisites

1. Keycloak server running (version 21+ recommended)
2. MongoDB database
3. Node.js application with Policy Admin module

## Configuration

### 1. Environment Variables

Copy the environment variables from `env.example` to your `.env` file:

```bash
# Keycloak Configuration
KEYCLOAK_BASE_URL=http://localhost:8081
KEYCLOAK_REALM=demo
KEYCLOAK_CLIENT_ID=your-api
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin
```

### 2. Keycloak Setup

#### Step 1: Create Realm
1. Login to Keycloak Admin Console
2. Create a new realm (e.g., "demo")
3. Set it as the active realm

#### Step 2: Create Client
1. Go to Clients → Create
2. Set Client ID: `your-api` (or whatever you configured)
3. Set Client Protocol: `openid-connect`
4. Set Access Type: `confidential`
5. Enable:
   - Standard Flow
   - Direct Access Grants
   - Service Accounts
   - Authorization Services

#### Step 3: Configure Client
1. Go to Settings tab
2. Set Valid Redirect URIs: `http://localhost:3000/*`
3. Set Web Origins: `http://localhost:3000`
4. Save

#### Step 4: Get Client Secret
1. Go to Credentials tab
2. Copy the Secret (you'll need this for your application)

### 3. Troubleshooting

#### Common Issues:

1. **404 Error on Protocol Mapper**
   - The client might not exist
   - Check if the client ID is correct
   - Ensure the client has authorization services enabled

2. **Authentication Failed**
   - Verify admin username/password
   - Check if admin user has proper permissions
   - Ensure you're using the correct realm

3. **Client Not Found**
   - The application will attempt to create the client automatically
   - Check logs for creation status
   - Verify client configuration in Keycloak

#### Debug Mode

The service now includes detailed logging. Check console output for:
- Client creation attempts
- Protocol mapper setup
- Role synchronization status
- Detailed error messages

### 4. Testing

1. Start your application
2. Call the sync endpoint: `POST /policy/sync/keycloak`
3. Check Keycloak Admin Console to verify:
   - Client exists
   - Roles are created
   - Protocol mappers are configured

### 5. Manual Client Creation (if needed)

If automatic client creation fails, manually create the client in Keycloak:

```json
{
  "clientId": "your-api",
  "name": "your-api",
  "enabled": true,
  "publicClient": false,
  "standardFlowEnabled": true,
  "directAccessGrantsEnabled": true,
  "serviceAccountsEnabled": true,
  "authorizationServicesEnabled": true,
  "redirectUris": ["http://localhost:3000/*"],
  "webOrigins": ["http://localhost:3000"]
}
```
