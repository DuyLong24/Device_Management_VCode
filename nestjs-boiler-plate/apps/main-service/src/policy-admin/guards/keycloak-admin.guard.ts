import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class KeycloakAdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const logger = new Logger(KeycloakAdminGuard.name);
    logger.warn('KeyCloak Admin Guard đang được bật, cần phải thực hiện kiểm tra quyền admin');
    return true;
  }
}
