#!/bin/bash

# Start OPA with policy file
echo "Starting OPA with policy file..."

# Stop existing OPA container if running
docker stop opa 2>/dev/null || true
docker rm opa 2>/dev/null || true

# Start OPA with policy file
docker run -d \
  --name opa \
  -p 8181:8181 \
  -v $(pwd)/config/opa:/policies \
  openpolicyagent/opa:latest \
  run --server --addr :8181 /policies/authz.rego

echo "✅ OPA started with policy file!"
echo "Policy file: config/opa/authz.rego"
echo "OPA URL: http://localhost:8181"
