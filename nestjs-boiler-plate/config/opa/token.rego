
package envoy.authz

# Configure JWKS for JWT verification
jwks := {
    "keys": [{
        "kid": "p5H5_vwu7LNbf3dVeVnhmaRNy2ONGzsYaa_9M3L4KJQ",
        "kty": "RSA",
        "alg": "RS256",
        "use": "sig",
        "n": "u50M_rDJUqnyLCwsJvsxPXLiEuZ7m_MBZ6GxnVq0s7EdD9WM-_gBh0Pag3Qpc8kq3i64Y1VawikTkAEho1ERAy85OY-saJz-NIwV-Xi664VGV8pVzerHyrVHrge-GVaT1svEP0PKxgWPAnZgtQxpBifrkVJSK-kmDp1-7ABQrQXA3xjd_o7udXelKV8kwxiQrHRamYHNE4QOS0nwqmD9dgscGX95UfM8azp-j8CALrFkK8BgMGTymUDiL7RkOmMGPpvr-m1aTkhI6w39Q7636q0cqNZzJYbqAQ1DoE1IV_pxBjF38kTetWphzceR57h6mzaV61vufnRgOGoo2TUBTQ",
        "e": "AQAB",
        "x5c": [
            "MIICmzCCAYMCBgGYfo439DANBgkqhkiG9w0BAQsFADARMQ8wDQYDVQQDDAZtYXN0ZXIwHhcNMjUwODA2MDg0MzI2WhcNMzUwODA2MDg0NTA2WjARMQ8wDQYDVQQDDAZtYXN0ZXIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC7nQz+sMlSqfIsLCwm+zE9cuIS5nub8wFnobGdWrSzsR0P1Yz7+AGHQ9qDdClzySreLrhjVVrCKROQASGjUREDLzk5j6xonP40jBX5eLrrhUZXylXN6sfKtUeuB74ZVpPWy8Q/Q8rGBY8CdmC1DGkGJ+uRUlIr6SYOnX7sAFCtBcDfGN3+ju51d6UpXyTDGJCsdFqZgc0ThA5LSfCqYP12CxwZf3lR8zxrOn6PwIAusWQrwGAwZPKZQOIvtGQ6YwY+m+v6bVpOSEjrDf1DvrfqrRyo1nMlhuoBDUOgTUhX+nEGMXfyRN61amHNx5HnuHqbNpXrW+5+dGA4aijZNQFNAgMBAAEwDQYJKoZIhvcNAQELBQADggEBALXMgsRCskiS11zAHjyGlgZwK0ZRdR5PEbs1uqRgrQPhD3MU3CVMWSpkOEPeJa4uUDVUpDfxNx0nZabb1F2+NxmUNqbJF+0emBoMyexdn26L48tOONgiEd/8q8kzt+NjIOBn2bQefE6xEegRJvqmq/SJcfYPwhXiwqKv7q5TpHs1i1tCCiUXRHT3ptsrw+MUqKRHmiy16PY1f/hDiUkKUNLpsOTVbJk7rbM0Ui8qOOTUqUWYgEOvDIdz9gZp0sTajPppkDXlChRf7p7LS+2KT5hsp5ihAzbSUCzvNIrKVAGkzvDtJHLuxajjpQ76v6SLjTYGFLbMR209e0FqdIdEgxE="
        ],
        "x5t": "iCtW6N8AL24sNA48gp92fDdQbYw",
        "x5t#S256": "vJ8PLw1aILZrdUzF8vdeXR0S8dggs1gWt5arWHgYja0"
    }]
}

# Expected issuer and audience
expected_issuer := "https://keycloak.glorin.bfd.vn/realms/master"
expected_audience := "glorin"

# Extract the Bearer token from the Authorization header
token = t if {
    auth_header := input.attributes.request.http.headers["authorization"]
    startswith(auth_header, "Bearer ")
    t := substring(auth_header, count("Bearer "), -1)
}

# Decode JWT token if present
jwt_decode = [header, payload, sig] if {
    [header, payload, sig] := io.jwt.decode(token)
}

# Find matching key from JWKS
jwk = key if {
    # Get the token header
    [header, _, _] := jwt_decode
    
    # Find key with matching kid
    key := jwks.keys[_]
    key.kid == header.kid
}

# Format the certificate from the JWK
cert = certificate if {
    key := jwk
    certificate := sprintf("-----BEGIN CERTIFICATE-----\n%s\n-----END CERTIFICATE-----", [key.x5c[0]])
}

# Verify JWT with certificate
is_verified = verified if {
    certificate := cert
    verified := io.jwt.verify_rs256(token, certificate)
}

# JWT validation
token_is_valid if {
    # Verify signature
    is_verified == true
    
    # Get payload
    [_, payload, _] := jwt_decode
    
    # Validate expiration
    payload.exp > time.now_ns() / 1000000000
    
    # Validate issuer
    payload.iss == expected_issuer
    
    # Validate audience
    payload.azp == expected_audience
}
