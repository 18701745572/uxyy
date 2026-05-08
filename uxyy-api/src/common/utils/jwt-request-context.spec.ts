import { UnauthorizedException } from '@nestjs/common';
import type { Express } from 'express';
import {
  jwtUserIdFromRequest,
  requireJwtUserId,
} from './jwt-request-context';

describe('jwt-request-context', () => {
  it('jwtUserIdFromRequest reads Express.UserPayload.userId', () => {
    expect(
      jwtUserIdFromRequest({
        user: { userId: 42, enterpriseId: 1, role: 'boss' },
      } as Express.Request),
    ).toBe(42);
  });

  it('jwtUserIdFromRequest returns undefined when userId absent', () => {
    expect(
      jwtUserIdFromRequest({
        user: { enterpriseId: 1 },
      } as Express.Request),
    ).toBeUndefined();
  });

  it('requireJwtUserId throws when userId absent', () => {
    expect(() =>
      requireJwtUserId({
        user: {},
      } as Express.Request),
    ).toThrow(UnauthorizedException);
  });

  it('requireJwtUserId returns id when valid', () => {
    expect(
      requireJwtUserId({
        user: { userId: 99 },
      } as Express.Request),
    ).toBe(99);
  });
});
