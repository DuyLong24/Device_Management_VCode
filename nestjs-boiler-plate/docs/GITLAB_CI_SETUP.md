# GitLab CI/CD Setup Guide

## Prerequisites

1. GitLab account with Docker registry enabled
2. Server with Docker and Docker Compose installed
3. Traefik proxy running on your server

## GitLab CI/CD Variables

Add these variables in your GitLab project settings (`Settings > CI/CD > Variables`):

### Registry Variables (Auto-created)
- `CI_REGISTRY_IMAGE` - Your GitLab container registry URL
- `CI_REGISTRY_USER` - GitLab registry username
- `CI_REGISTRY_PASSWORD` - GitLab registry password

### Server Connection Variables
- `SSH_PRIVATE_KEY` - SSH private key for server access
- `STAGING_SERVER_HOST` - Staging server IP/hostname
- `STAGING_SERVER_USER` - SSH username for staging server
- `PRODUCTION_SERVER_HOST` - Production server IP/hostname  
- `PRODUCTION_SERVER_USER` - SSH username for production server

### Application Environment Variables
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT secret key
- `JWT_EXPIRES_IN` - JWT expiration time (e.g., "24h")
- `KEYCLOAK_BASE_URL` - Keycloak server URL
- `KEYCLOAK_REALM` - Keycloak realm name
- `KEYCLOAK_CLIENT_ID` - Keycloak client ID
- `KEYCLOAK_CLIENT_SECRET` - Keycloak client secret

## Server Setup

### 1. Copy files to your server

```bash
# Copy production files to your server
scp docker-compose.prod.yml user@your-server:/path/to/project/
scp deploy-prod.sh user@your-server:/path/to/project/
scp .env.example user@your-server:/path/to/project/
```

### 2. Configure environment

```bash
# On your server
cd /path/to/project
cp .env.example .env
nano .env  # Edit with your actual values
chmod +x deploy-prod.sh
```

### 3. Create uploads directory

```bash
# Create uploads directory
sudo mkdir -p /containers/data/api.nestjs.template.bfd.vn
sudo chown -R 1001:1001 /containers/data/api.nestjs.template.bfd.vn
```

## Pipeline Workflow

### Branches
- `main` - Production deployments
- `develop` - Staging deployments
- `feature/*` - Feature branches (tests only)

### Stages
1. **Test** - Runs on all branches
   - Linting with ESLint
   - Unit tests with Jest
   - End-to-end tests
   - Security scanning (optional)

2. **Build** - Runs on `main` and `develop`
   - Builds Docker image
   - Pushes to GitLab Container Registry

3. **Deploy** - Manual deployment
   - Staging: From `develop` branch
   - Production: From `main` branch

## Manual Deployment

### From GitLab UI
1. Go to `CI/CD > Pipelines`
2. Click on your pipeline
3. Click the play button on the deploy job

### From Command Line
```bash
# Trigger pipeline
git push origin main

# Or trigger manual deployment
curl -X POST \
  --form token=$CI_JOB_TOKEN \
  --form ref=main \
  https://gitlab.com/api/v4/projects/$CI_PROJECT_ID/trigger/pipeline
```

## Local Development

### Build and test locally
```bash
# Install dependencies
npm install

# Run tests
npm run test
npm run test:e2e

# Build for production
npm run build

# Build Docker image locally
docker build -t nestjs-template .

# Run with docker-compose (development)
docker-compose up -d
```

## Monitoring

### Check deployment status
```bash
# On your server
cd /path/to/project
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

### Health check
```bash
# Check application health
curl -f https://api.nestjs.template.bfd.vn/health || echo "Health check failed"
```

## Troubleshooting

### Common Issues

1. **Container not starting**
   ```bash
   docker-compose -f docker-compose.prod.yml logs api_nestjs_template
   ```

2. **Image pull failed**
   ```bash
   docker login registry.gitlab.com
   docker pull $CI_REGISTRY_IMAGE:latest
   ```

3. **Permission denied on uploads**
   ```bash
   sudo chown -R 1001:1001 /containers/data/api.nestjs.template.bfd.vn
   ```

4. **Traefik not routing**
   - Check if Traefik can reach the container
   - Verify domain DNS points to server
   - Check Traefik dashboard for routes

### Rollback
```bash
# Rollback to previous version
cd /path/to/project
docker-compose -f docker-compose.prod.yml down
docker pull $CI_REGISTRY_IMAGE:previous-tag
# Update docker-compose.prod.yml with previous tag
docker-compose -f docker-compose.prod.yml up -d
```

## Security Notes

- Keep SSH private keys secure
- Use environment variables for secrets
- Regular security updates for base images
- Monitor container logs for suspicious activity
- Use HTTPS only in production
