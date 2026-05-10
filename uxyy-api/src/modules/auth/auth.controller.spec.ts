import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UxyyRole } from './role-permissions';

function mockAuth(): Partial<AuthService> {
  return {
    login: jest
      .fn()
      .mockResolvedValue({ access_token: 'at', refresh_token: 'rt' }),
    register: jest
      .fn()
      .mockResolvedValue({ access_token: 'at', refresh_token: 'rt' }),
    refreshToken: jest
      .fn()
      .mockResolvedValue({ access_token: 'at', refresh_token: 'rt' }),
    resetPassword: jest.fn().mockResolvedValue({ success: true }),
    getProfile: jest.fn().mockResolvedValue({ id: 1, phone: '13800138000' }),
    listEnterprises: jest.fn().mockResolvedValue([]),
    switchEnterprise: jest.fn().mockResolvedValue({ access_token: 'at' }),
    createApprovalFlow: jest.fn().mockResolvedValue({ flowId: 1 }),
    listApprovalFlows: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    getApprovalFlow: jest.fn().mockResolvedValue({ flowId: 1 }),
    submitApproval: jest.fn().mockResolvedValue({ approvalId: 1 }),
    listApprovals: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    getApproval: jest.fn().mockResolvedValue({ approvalId: 1 }),
    actionApproval: jest.fn().mockResolvedValue({ status: 'approved' }),
  };
}

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    user: { userId: 1, enterpriseId: 10, role: 'boss' },
    ...overrides,
  } as any;
}

describe('AuthController', () => {
  let controller: AuthController;
  let auth: Partial<AuthService>;

  beforeEach(async () => {
    auth = mockAuth();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: auth }, Reflector],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  // ── login ──

  describe('POST /auth/login', () => {
    it('should call auth.login with phone and password', async () => {
      const dto = { phone: '13800138000', password: 'Dev12345!' };
      await controller.login(dto);
      expect(auth.login).toHaveBeenCalledWith('13800138000', 'Dev12345!');
    });
  });

  // ── register ──

  describe('POST /auth/register', () => {
    it('should call auth.register with dto', async () => {
      const dto = {
        phone: '13800138000',
        password: 'Dev12345!',
        enterpriseName: 'Co',
      };
      await controller.register(dto);
      expect(auth.register).toHaveBeenCalledWith(dto);
    });
  });

  // ── refresh ──

  describe('POST /auth/refresh', () => {
    it('should call auth.refreshToken with refresh_token', async () => {
      const dto = { refresh_token: 'old-refresh' };
      await controller.refreshToken(dto);
      expect(auth.refreshToken).toHaveBeenCalledWith('old-refresh');
    });
  });

  // ── resetPassword ──

  describe('POST /auth/reset-password', () => {
    it('should call auth.resetPassword with dto', async () => {
      const dto = { phone: '138', oldPassword: 'old', newPassword: 'new' };
      await controller.resetPassword(dto);
      expect(auth.resetPassword).toHaveBeenCalledWith(dto);
    });
  });

  // ── permissions ──

  describe('GET /auth/permissions', () => {
    it('should return catalog, valid role codes and presets for boss', () => {
      const res = controller.authPermissions(
        mockReq({ user: { userId: 1, enterpriseId: 10, role: UxyyRole.BOSS } }),
      );
      expect(res.roleRaw).toBe('boss');
      expect(res.canonicalRole).toBe('boss');
      expect(res.permissions.length).toBeGreaterThan(0);
      expect(res.permissionCatalog.length).toBeGreaterThan(0);
      expect(res.validRoleCodes).toEqual(
        expect.arrayContaining(Object.values(UxyyRole)),
      );
      expect(res.presets.length).toBe(Object.values(UxyyRole).length);
    });

    it('should normalize historical JWT owner alias to canonical boss string', () => {
      const res = controller.authPermissions(
        mockReq({ user: { userId: 1, enterpriseId: 10, role: 'owner' } }),
      );
      expect(res.roleRaw).toBe('boss');
      expect(res.canonicalRole).toBe('boss');
    });

    it('should throw ForbiddenException when role is missing', () => {
      expect(() =>
        controller.authPermissions(
          mockReq({ user: { userId: 1, enterpriseId: 10 } }),
        ),
      ).toThrow(ForbiddenException);
    });
  });

  // ── profile ──

  describe('GET /auth/profile', () => {
    it('should call auth.getProfile with userId from req', async () => {
      await controller.profile(mockReq());
      expect(auth.getProfile).toHaveBeenCalledWith(1);
    });

    it('should throw UnauthorizedException when user is missing on request', () => {
      expect(() => controller.profile(mockReq({ user: undefined }))).toThrow(
        UnauthorizedException,
      );
      expect(auth.getProfile).not.toHaveBeenCalled();
    });
  });

  // ── enterprises ──

  describe('GET /auth/enterprises', () => {
    it('should call auth.listEnterprises with userId from req', async () => {
      await controller.listEnterprises(mockReq());
      expect(auth.listEnterprises).toHaveBeenCalledWith(1);
    });

    it('should throw UnauthorizedException when user is missing on request', () => {
      expect(() => controller.listEnterprises(mockReq({ user: undefined }))).toThrow(
        UnauthorizedException,
      );
      expect(auth.listEnterprises).not.toHaveBeenCalled();
    });
  });

  // ── switchEnterprise ──

  describe('PUT /auth/switch-enterprise/:id', () => {
    it('should call auth.switchEnterprise with userId and enterpriseId', async () => {
      await controller.switchEnterprise(mockReq(), '5');
      expect(auth.switchEnterprise).toHaveBeenCalledWith(1, 5);
    });
  });

  // ── approval flows ──

  describe('POST /auth/approval-flows', () => {
    it('should call auth.createApprovalFlow with dto and enterpriseId', async () => {
      const dto = {
        name: 'Test',
        type: 'purchase',
        steps: [{ step: 1, role: 'boss' }],
      };
      await controller.createApprovalFlow(mockReq(), dto);
      expect(auth.createApprovalFlow).toHaveBeenCalledWith(dto, 10);
    });

    it('should throw ForbiddenException if no enterpriseId', () => {
      expect(() =>
        controller.createApprovalFlow(mockReq({ user: { userId: 1 } }), {
          name: 'T',
          type: 'purchase',
          steps: [],
        }),
      ).toThrow(ForbiddenException);
    });
  });

  describe('GET /auth/approval-flows', () => {
    it('should call auth.listApprovalFlows with enterpriseId and query', async () => {
      const query = { page: 1, pageSize: 10, type: 'purchase' };
      await controller.listApprovalFlows(mockReq(), query);
      expect(auth.listApprovalFlows).toHaveBeenCalledWith(10, query);
    });

    it('should use empty query by default', async () => {
      await controller.listApprovalFlows(mockReq());
      expect(auth.listApprovalFlows).toHaveBeenCalledWith(10, {});
    });
  });

  describe('GET /auth/approval-flows/:id', () => {
    it('should call auth.getApprovalFlow with parsed id and enterpriseId', async () => {
      await controller.getApprovalFlow(mockReq(), '3');
      expect(auth.getApprovalFlow).toHaveBeenCalledWith(3, 10);
    });
  });

  // ── approvals ──

  describe('POST /auth/approvals', () => {
    it('should call auth.submitApproval with dto and userId', async () => {
      const dto = {
        flowId: 1,
        businessType: 'purchase_order',
        businessId: 5001,
        title: 'Test',
      };
      await controller.submitApproval(mockReq(), dto);
      expect(auth.submitApproval).toHaveBeenCalledWith(dto, 1);
    });
  });

  describe('GET /auth/approvals', () => {
    it('should call auth.listApprovals with enterpriseId and query', async () => {
      const query = { page: 1, pageSize: 10, status: 'pending' };
      await controller.listApprovals(mockReq(), query);
      expect(auth.listApprovals).toHaveBeenCalledWith(10, query);
    });
  });

  describe('GET /auth/approvals/:id', () => {
    it('should call auth.getApproval with parsed id and enterpriseId', async () => {
      await controller.getApproval(mockReq(), '7');
      expect(auth.getApproval).toHaveBeenCalledWith(7, 10);
    });
  });

  describe('PUT /auth/approvals/:id/action', () => {
    it('should call auth.actionApproval with id, userId, role, dto', async () => {
      const dto = { action: 'approve', comment: 'OK' };
      await controller.actionApproval(mockReq(), '3', dto);
      expect(auth.actionApproval).toHaveBeenCalledWith(3, 1, 'boss', dto);
    });

    it('should throw ForbiddenException if no user context', () => {
      expect(() =>
        controller.actionApproval(mockReq({ user: null }), '3', {
          action: 'approve',
        }),
      ).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if no role', () => {
      expect(() =>
        controller.actionApproval(mockReq({ user: { userId: 1 } }), '3', {
          action: 'approve',
        }),
      ).toThrow(ForbiddenException);
    });
  });
});
