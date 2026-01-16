package envoy.authz

import future.keywords

# Function to check if user has permission for the requested resource
allow_permission(payload, method, path) if {
    # Get user permissions from Keycloak JWT payload
    # Permissions are in resource_access.{client_id}.roles
    client_id := payload.azp  # Get client ID from azp (authorized party)
    user_roles := payload.resource_access[client_id].roles
    
    # Check if any role grants access to this resource
    some role
    role = user_roles[_]
    
    # Get permission resources from app data using the same format
    resources := data.app.permissions[role].resources
    
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