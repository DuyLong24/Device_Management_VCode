#!/bin/bash

# Load policy using OPA CLI
echo "Loading policy using OPA CLI..."

# Check if OPA CLI is available
if ! command -v opa &> /dev/null; then
    echo "❌ OPA CLI not found. Please install OPA CLI first."
    echo "Download from: https://www.openpolicyagent.org/docs/latest/#running-opa"
    exit 1
fi

# Load the policy
echo "Loading policy from config/opa/authz.rego..."
opa eval --data config/opa/authz.rego "data.authz.allow" --input '{"http": {"method": "GET", "path": "/test"}, "subject": {"perms": ["test:read"]}}'

echo "✅ Policy loaded successfully!"
