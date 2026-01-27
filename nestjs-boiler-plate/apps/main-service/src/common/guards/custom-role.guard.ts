import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { META_ROLES } from 'nest-keycloak-connect';

@Injectable()
export class CustomRoleGuard implements CanActivate {
    private readonly logger = new Logger(CustomRoleGuard.name);

    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const rolesMeta = this.reflector.get<string[] | { roles: string[] }>(META_ROLES, context.getHandler());
        const roles = Array.isArray(rolesMeta) ? rolesMeta : rolesMeta?.roles;

        if (!roles || roles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            this.logger.warn('User not found in request. AuthGuard might not have run or failed.');
            return false;
        }
        const realmRoles = user.realm_access?.roles || [];
        const normalizedUserRoles = realmRoles.map((r: string) => r.toLowerCase());
        const normalizedRequiredRoles = roles.map((r: string) => r.toLowerCase());

        const hasRole = normalizedUserRoles.some((userRole: string) =>
            normalizedRequiredRoles.includes(userRole)
        );

        if (!hasRole) {
            this.logger.warn(`Access Denied. User: ${user.preferred_username}, Required: [${roles}], Has: [${realmRoles}]`);
        } else {
            this.logger.verbose(`Access Granted. User: ${user.preferred_username}, Role matched.`);
        }

        return hasRole;
    }
}
