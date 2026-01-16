import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PUBLIC_KEY = 'isPublic';
export const Public = () => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
  if (descriptor) {
    Reflect.defineMetadata(PUBLIC_KEY, true, descriptor.value);
  } else {
    Reflect.defineMetadata(PUBLIC_KEY, true, target);
  }
};

@Injectable()
export class OpaAuthorizationGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // console.log(request.headers);
    // // Check if the request has been authorized by OPA through Envoy
    // const authResult = request.headers['x-auth-result'];

    // if (!authResult) {
    //   // If no auth result header, it means the request didn't go through Envoy/OPA
    //   throw new UnauthorizedException('Request must be authorized through API Gateway');
    // }

    // if (authResult !== 'allowed') {
    //   throw new ForbiddenException('Access denied by authorization policy');
    // }

    // // Additional validation - ensure we have user context from OPA
    // const authUser = request.headers['x-auth-user'];
    // const userRole = request.headers['x-user-roles'];

    // if (!authUser) {
    //   throw new UnauthorizedException('User context missing from authorization');
    // }

    // Log authorization success for debugging
    // console.log(`OPA Authorization Success: User ${authUser} with role ${userRole} accessing ${request.method} ${request.path}`);

    return true;
  }
}
