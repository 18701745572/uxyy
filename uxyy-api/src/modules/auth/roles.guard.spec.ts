import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, ROLES_KEY } from './roles.guard';

function mockContext(overrides: {
  handlerRoles?: string[];
  classRoles?: string[];
  user?: any;
}) {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
    if (key === ROLES_KEY) {
      return overrides.handlerRoles ?? overrides.classRoles ?? undefined;
    }
    return undefined;
  });

  const req = { user: overrides.user };

  return {
    reflector,
    context: {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(req),
      }),
    } as any,
  };
}

describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    guard = new RolesGuard(new Reflector());
  });

  it('should allow when no roles metadata is set', () => {
    const { reflector, context } = mockContext({});
    guard = new RolesGuard(reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow when roles array is empty', () => {
    const { reflector, context } = mockContext({ handlerRoles: [] });
    guard = new RolesGuard(reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow when user role is in required roles', () => {
    const { reflector, context } = mockContext({
      handlerRoles: ['boss', 'finance'],
      user: { userId: 1, enterpriseId: 1, role: 'boss' },
    });
    guard = new RolesGuard(reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when user has no role', () => {
    const { reflector, context } = mockContext({
      handlerRoles: ['boss'],
      user: { userId: 1 },
    });
    guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user is missing', () => {
    const { reflector, context } = mockContext({
      handlerRoles: ['boss'],
      user: undefined,
    });
    guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when role not in required list', () => {
    const { reflector, context } = mockContext({
      handlerRoles: ['boss', 'finance'],
      user: { userId: 1, role: 'sales' },
    });
    guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should prefer handler-level roles over class-level', () => {
    const { reflector, context } = mockContext({
      handlerRoles: ['boss'],
      classRoles: ['admin'],
      user: { userId: 1, role: 'boss' },
    });
    guard = new RolesGuard(reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow enterprise owner role alias (owner → boss)', () => {
    const { reflector, context } = mockContext({
      handlerRoles: ['boss'],
      user: { userId: 1, enterpriseId: 1, role: 'owner' },
    });
    guard = new RolesGuard(reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should check error message mentions required roles', () => {
    const { reflector, context } = mockContext({
      handlerRoles: ['boss', 'finance'],
      user: { userId: 1, role: 'sales' },
    });
    guard = new RolesGuard(reflector);
    try {
      guard.canActivate(context);
      fail('expected ForbiddenException');
    } catch (e) {
      const msg = (e as ForbiddenException).message;
      expect(msg).toContain('boss');
      expect(msg).toContain('finance');
      expect(msg).toContain('sales');
    }
  });
});
