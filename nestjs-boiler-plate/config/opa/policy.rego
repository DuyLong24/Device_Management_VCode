package envoy.authz

# Default deny all requests
default allow = false


# Allow the request if JWT is valid and user has permission
allow = response if {
    token_is_valid
    
    # Extract user info and role from JWT payload
    [_, payload, _] := jwt_decode
    
    # Check if user has permission for the requested resource using authz.rego
    allow_permission(payload, input.attributes.request.http.method, input.attributes.request.http.path)
    # Prepare headers for Envoy
    response = {
        "allowed": true,
        "headers": {
            "x-user-id": payload.sub,
            "x-auth-result": "allowed",
            "x-user-name": payload.preferred_username,
            "x-auth-user": payload.preferred_username,
            "x-user-roles": concat(",", payload.realm_access.roles),
            "x-user-info": base64.encode(json.marshal(payload))
        }
    }
}



# Basic info response
default info = {"token_present": false}

# Detailed info response
info = {
    "token_present": true,
    "key_found": jwk != null,
    "token_verified": is_verified == true,
    "token_details": jwt_decode[1]
} if {
    jwt_decode
}
