import { UnauthorizedException } from '@nestjs/common';
import type { Express } from 'express';

/** 与 `JwtStrategy.validate` / `Express.UserPayload` 一致：用户主键为 `userId`。 */
export function jwtUserIdFromRequest(
  req: Express.Request,
): number | undefined {
  const u = req.user;
  if (!u || typeof u !== 'object') return undefined;
  const id = (u as Express.UserPayload).userId;
  return typeof id === 'number' && !Number.isNaN(id) ? id : undefined;
}

export function requireJwtUserId(req: Express.Request): number {
  const id = jwtUserIdFromRequest(req);
  if (id == null) {
    throw new UnauthorizedException('无法解析当前登录用户');
  }
  return id;
}
