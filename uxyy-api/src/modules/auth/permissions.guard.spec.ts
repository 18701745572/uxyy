import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { Permission } from './role-permissions';

function mockContext(overrides: {
  handlerPerms?: string[];
  classPerms?: string[];
  user?: any;
}) {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
    if (key === PERMISSIONS_KEY) {
      return overrides.handlerPerms ?? overrides.classPerms ?? undefined;
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

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;

  beforeEach(() => {
    guard = new PermissionsGuard(new Reflector());
  });

  it('allows when no permissions metadata', () => {
    const { reflector, context } = mockContext({});
    guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows when user has one of required permissions (finance)', () => {
    const { reflector, context } = mockContext({
      handlerPerms: [Permission.FIN_WRITE],
      user: { userId: 1, enterpriseId: 1, role: 'finance' },
    });
    guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies sales for finance-only permission', () => {
    const { reflector, context } = mockContext({
      handlerPerms: [Permission.FIN_VOUCHER],
      user: { userId: 1, role: 'sales' },
    });
    guard = new PermissionsGuard(reflector);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('owner alias has system backup permission', () => {
    const { reflector, context } = mockContext({
      handlerPerms: [Permission.SYS_BACKUP],
      user: { userId: 1, role: 'owner' },
    });
    guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('oa role can view audit logs export permission', () => {
    const { reflector, context } = mockContext({
      handlerPerms: [Permission.SYS_AUDIT_LOG],
      user: { userId: 1, role: 'oa' },
    });
    guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(context)).toBe(true);
  });
});
