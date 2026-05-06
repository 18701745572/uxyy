import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'uxyy_roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const roles: string[] = requiredRoles;

    const request = context.switchToHttp().getRequest<Express.Request>();
    const user = request.user as Express.UserPayload | undefined;

    if (!user || typeof user.role !== 'string') {
      throw new ForbiddenException('当前用户无角色信息');
    }

    if (!roles.includes(user.role)) {
      throw new ForbiddenException(`角色权限不足，需要: ${roles.join(' 或 ')}`);
    }

    return true;
  }
}
