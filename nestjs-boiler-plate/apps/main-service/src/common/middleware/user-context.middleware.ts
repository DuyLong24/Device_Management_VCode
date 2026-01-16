import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';

export interface UserContext {
  userId?: string;
  role?: string;
  permissions?: string[];
  tenantId?: string;
}

@Injectable()
export class UserContextMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) { }

  use(req: Request, res: Response, next: NextFunction) {
    try {
      let userContext: UserContext = {};

      // Priority 1: Use headers from Envoy/OPA (most trusted source)
      if (req.headers['x-auth-result'] === 'allowed') {
        // Request has been authorized by OPA through Envoy
        userContext = {
          userId: req.headers['x-auth-user'] as string || req.headers['x-user-id'] as string,
          role: req.headers['x-user-role'] as string || 'guest',
          permissions: req.headers['x-user-permissions']
            ? (req.headers['x-user-permissions'] as string).split(',').map(p => p.trim())
            : [],
          tenantId: req.headers['x-tenant-id'] as string || 'default',
        };
      } else {
        // Priority 2: Fallback to JWT token for direct access (development/testing)
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          try {
            const decoded = this.jwtService.decode(token) as any;
            if (decoded) {
              userContext = {
                userId: decoded.sub || decoded.userId,
                role: decoded.role || 'guest',
                permissions: decoded.permissions || [],
                tenantId: decoded.tenantId || 'default',
              };
            }
          } catch (error) {
            console.warn('Failed to decode JWT token:', error.message);
          }
        }

        // Priority 3: Check for existing headers from other sources
        if (req.headers['x-user-id']) {
          userContext.userId = req.headers['x-user-id'] as string;
        }
        if (req.headers['x-user-role']) {
          userContext.role = req.headers['x-user-role'] as string;
        }
        if (req.headers['x-user-permissions']) {
          const permissions = req.headers['x-user-permissions'] as string;
          userContext.permissions = permissions.split(',').map(p => p.trim());
        }
        if (req.headers['x-tenant-id']) {
          userContext.tenantId = req.headers['x-tenant-id'] as string;
        }
      }

      // Add request ID for tracing if not present
      if (!req.headers['x-request-id']) {
        req.headers['x-request-id'] = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      // Log authorization context for debugging
      if (req.headers['x-auth-result']) {
        console.log(`Request authorized by OPA: ${req.method} ${req.path} by user ${userContext.userId} with role ${userContext.role}`);
      }

      // Attach user context to request for use in controllers
      (req as any).userContext = userContext;

      next();
    } catch (error) {
      console.error('UserContextMiddleware error:', error);
      next();
    }
  }
}
