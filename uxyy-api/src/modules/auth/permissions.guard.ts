import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
} from '../../common/decorators/permissions.decorator';
import { roleHasAnyPermission } from './role-permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Express.Request>();
    const user = request.user as Express.UserPayload | undefined;

    if (!user?.userId) {
      throw new ForbiddenException('未认证');
    }

    if (!roleHasAnyPermission(user.role, required)) {
      throw new ForbiddenException(
        `缺少权限，需要其一: ${required.join(' | ')}`,
      );
    }

    return true;
  }
}
