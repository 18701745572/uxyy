import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { normalizeEnterpriseRole } from './role-permissions';

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

    const userCanonical = normalizeEnterpriseRole(user.role);
    if (!userCanonical) {
      throw new ForbiddenException('当前角色未配置或无效，请联系管理员');
    }

    const requiredCanonical = roles
      .map((r) => normalizeEnterpriseRole(r) ?? r)
      .filter(Boolean);

    if (!requiredCanonical.includes(userCanonical)) {
      throw new ForbiddenException(
        `角色权限不足，需要: ${requiredCanonical.join(' 或 ')}（当前: ${userCanonical}）`,
      );
    }

    return true;
  }
}
