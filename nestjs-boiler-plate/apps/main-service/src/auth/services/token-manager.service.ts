import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenResponse } from '../interfaces/auth.interface';

@Injectable()
export class TokenManagerService {
  private readonly logger = new Logger(TokenManagerService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const keycloakBaseUrl = this.configService.get<string>('KEYCLOAK_BASE_URL');
      const realm = this.configService.get<string>('KEYCLOAK_REALM');
      const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID');
      const clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET');

      if (!keycloakBaseUrl || !realm || !clientId || !clientSecret) {
        throw new Error('Missing Keycloak configuration for token refresh');
      }

      const tokenUrl = `${keycloakBaseUrl}/realms/${realm}/protocol/openid-connect/token`;

      this.logger.debug(`Refreshing token at: ${tokenUrl}`);

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Token refresh failed: ${response.status} ${response.statusText}`, {
          error: errorText,
          status: response.status
        });
        throw new UnauthorizedException(`Token refresh failed: ${response.statusText}`);
      }

      const tokenData = await response.json();

      this.logger.debug('Token refresh successful');

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken, // Use new refresh token if provided
        expiresIn: tokenData.expires_in,
        tokenType: tokenData.token_type || 'Bearer',
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Token refresh failed', {
        error: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      });
      throw new UnauthorizedException(`Token refresh failed: ${errorMessage}`);
    }
  }

  /**
   * Logout and revoke tokens
   */
  async revokeToken(token: string, tokenType: 'access_token' | 'refresh_token' = 'access_token'): Promise<void> {
    try {
      const keycloakBaseUrl = this.configService.get<string>('KEYCLOAK_BASE_URL');
      const realm = this.configService.get<string>('KEYCLOAK_REALM');
      const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID');
      const clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET');

      if (!keycloakBaseUrl || !realm || !clientId || !clientSecret) {
        throw new Error('Missing Keycloak configuration for token revocation');
      }

      const revokeUrl = `${keycloakBaseUrl}/realms/${realm}/protocol/openid-connect/revoke`;

      this.logger.debug(`Revoking token at: ${revokeUrl}`);

      const response = await fetch(revokeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          token: token,
          token_type_hint: tokenType,
          client_id: clientId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`Token revocation failed: ${response.status} ${response.statusText}`, {
          error: errorText,
          status: response.status
        });
        // Don't throw error for revocation failures as token might already be expired
        return;
      }

      this.logger.debug('Token revocation successful');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Token revocation failed', {
        error: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      });
      // Don't throw error for revocation failures
    }
  }

  /**
   * Check if token is expired (with 30 second buffer)
   */
  isTokenExpired(exp: number, bufferSeconds: number = 30): boolean {
    const now = Math.floor(Date.now() / 1000);
    return exp < (now + bufferSeconds);
  }

  /**
   * Get token expiration info
   */
  getTokenExpirationInfo(exp: number): { isExpired: boolean; expiresIn: number; expiresAt: Date } {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = exp - now;
    const isExpired = expiresIn <= 0;
    const expiresAt = new Date(exp * 1000);

    return {
      isExpired,
      expiresIn,
      expiresAt,
    };
  }
}
