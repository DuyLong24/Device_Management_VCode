export interface AuthPayload {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  tokenType?: 'access' | 'refresh';
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface KeycloakTokenPayload {
  sub: string;
  email_verified: boolean;
  preferred_username: string;
  email: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [key: string]: {
      roles: string[];
    };
  };
  permissions?: string[];
  // JWT standard claims
  iss?: string; // Issuer
  aud?: string | string[]; // Audience
  exp?: number; // Expiration time (Unix timestamp)
  nbf?: number; // Not before (Unix timestamp)
  iat?: number; // Issued at (Unix timestamp)
  jti?: string; // JWT ID
  typ?: string; // Token type
  azp?: string; // Authorized party
  session_state?: string; // Keycloak session state
  scope?: string; // OAuth2 scopes
}

export interface AuthStrategy {
  validateToken(token: string): Promise<AuthPayload>;
  login?(credentials: any): Promise<TokenResponse>;
  logout?(token: string): Promise<void>;
  refresh?(refreshToken: string): Promise<TokenResponse>;
}
