import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

// Mock bcrypt before any imports that use it
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashed'),
  compare: jest.fn().mockResolvedValue(true),
}));

import bcrypt from 'bcrypt';
import { DRIZZLE_DB } from '../database/database.constants';
import { AuthService } from './auth.service';
import type {
  RegisterDto,
  RefreshTokenDto,
  ResetPasswordDto,
} from './auth.service';

// ---------- helpers ----------

type MockDb = Record<string, jest.Mock> & {
  __queue: (result: any) => void;
  __reset: () => void;
};

function mockDb(): MockDb {
  const results: any[] = [];

  const chain: Record<string, jest.Mock> = {} as any;

  chain.select = jest.fn().mockReturnValue(chain);
  chain.from = jest.fn().mockReturnValue(chain);

  // where() returns a Promise so it works as a terminal method.
  // The Promise has chain methods attached so .limit() etc. still work.
  chain.where = jest.fn().mockImplementation(() => {
    const promise = Promise.resolve(results.shift() ?? []);
    (promise as any).limit = jest.fn().mockReturnValue(promise);
    (promise as any).offset = jest.fn().mockReturnValue(promise);
    (promise as any).orderBy = jest.fn().mockReturnValue(promise);
    return promise;
  });

  chain.limit = jest.fn().mockReturnValue(Promise.resolve([]));
  chain.offset = jest.fn().mockReturnValue(chain);
  chain.orderBy = jest.fn().mockReturnValue(chain);
  chain.innerJoin = jest.fn().mockReturnValue(chain);
  chain.insert = jest.fn().mockReturnValue(chain);
  chain.values = jest.fn().mockReturnValue(chain);
  chain.returning = jest
    .fn()
    .mockImplementation(() => Promise.resolve(results.shift() ?? []));
  chain.update = jest.fn().mockReturnValue(chain);
  chain.set = jest.fn().mockReturnValue(chain);
  chain.delete = jest.fn().mockReturnValue(chain);

  const out = chain as unknown as MockDb;
  out.__queue = (r: any) => {
    results.push(r);
  };
  out.__reset = () => {
    results.length = 0;
  };
  return out;
}

function mockConfig(): Partial<ConfigService> {
  const store: Record<string, string> = {
    JWT_ACCESS_EXPIRES_IN: '2h',
    JWT_REFRESH_EXPIRES_IN: '7d',
    JWT_REFRESH_SECRET: 'refresh-dev-secret',
  };
  return {
    get: jest.fn((key: string) => store[key]),
    getOrThrow: jest.fn((key: string) => {
      const v = store[key];
      if (!v) throw new Error(`missing ${key}`);
      return v;
    }),
  };
}

function mockJwt(): Partial<JwtService> {
  return {
    signAsync: jest.fn().mockResolvedValue('mock-access-token'),
    verifyAsync: jest.fn().mockResolvedValue({ sub: '1', type: 'refresh' }),
  };
}

// ---------- suite ----------

describe('AuthService', () => {
  let service: AuthService;
  let db: MockDb;
  let jwt: Partial<JwtService>;
  let config: Partial<ConfigService>;

  beforeEach(async () => {
    db = mockDb();
    jwt = mockJwt();
    config = mockConfig();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DRIZZLE_DB, useValue: db },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    db.__reset();
  });

  // ── login ──

  describe('login', () => {
    it('should return tokens on valid credentials', async () => {
      db.__queue([
        {
          id: 1,
          phone: '13800138000',
          passwordHash: '$2b$10$hashed',
          status: 'active',
          nickname: '张三',
        },
      ]);
      db.__queue([
        { userId: 1, enterpriseId: 1, role: 'boss', isDefault: true },
      ]);

      const result = await service.login('13800138000', 'Dev12345!');

      expect(result.access_token).toBe('mock-access-token');
      expect(result.refresh_token).toBe('mock-access-token');
      expect(result.token_type).toBe('Bearer');
      expect(result.user.id).toBe(1);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      db.__queue([]);

      await expect(service.login('13800138000', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password mismatch', async () => {
      db.__queue([
        {
          id: 1,
          phone: '13800138000',
          passwordHash: '$2b$10$hashed',
          status: 'active',
        },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(service.login('13800138000', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException if user is banned', async () => {
      db.__queue([
        {
          id: 1,
          phone: '13800138000',
          passwordHash: '$2b$10$hashed',
          status: 'banned',
        },
      ]);

      await expect(service.login('13800138000', 'Dev12345!')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should sign access token with role', async () => {
      db.__queue([
        {
          id: 2,
          phone: '13800138001',
          passwordHash: '$2b$10$hashed',
          status: 'active',
          nickname: '李四',
        },
      ]);
      db.__queue([
        { userId: 2, enterpriseId: 5, role: 'finance', isDefault: true },
      ]);

      await service.login('13800138001', 'Dev12345!');

      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: '2', enterpriseId: 5, role: 'finance' }),
      );
    });
  });

  // ── register ──

  describe('register', () => {
    const dto: RegisterDto = {
      phone: '13800138000',
      password: 'Dev12345!',
      enterpriseName: 'New Co',
    };

    it('should create user, enterprise, membership and return tokens', async () => {
      db.__queue([]); // no existing user
      db.__queue([{ id: 1, phone: '13800138000' }]); // user insert returning
      db.__queue([{ id: 10 }]); // enterprise insert returning

      const result = await service.register(dto);

      expect(result.access_token).toBe('mock-access-token');
      expect(result.refresh_token).toBe('mock-access-token');
      expect(result.user.id).toBe(1);
      expect(result.enterprise).toEqual({ id: 10 });
    });

    it('should throw ConflictException if phone already registered', async () => {
      db.__queue([{ id: 1 }]);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should register without enterpriseName', async () => {
      const noEnterpriseDto: RegisterDto = {
        phone: '13800138000',
        password: 'Dev12345!',
      };
      db.__queue([]);
      db.__queue([{ id: 1, phone: '13800138000' }]);

      const result = await service.register(noEnterpriseDto);

      expect(result.enterprise).toBeNull();
    });
  });

  // ── refreshToken ──

  describe('refreshToken', () => {
    it('should return new access and refresh tokens', async () => {
      db.__queue([{ id: 1, status: 'active' }]); // user check
      db.__queue([
        { userId: 1, enterpriseId: 1, role: 'boss', isDefault: true },
      ]); // memberships

      const result = await service.refreshToken('old-refresh-token');

      expect(result.access_token).toBe('mock-access-token');
      expect(result.refresh_token).toBe('mock-access-token');
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      (jwt.verifyAsync as jest.Mock).mockRejectedValueOnce(
        new Error('jwt expired'),
      );

      await expect(service.refreshToken('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user inactive', async () => {
      db.__queue([{ id: 1, status: 'banned' }]);

      await expect(service.refreshToken('ok-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if payload type is not refresh', async () => {
      (jwt.verifyAsync as jest.Mock).mockResolvedValueOnce({
        sub: '1',
        type: 'access',
      });

      await expect(
        service.refreshToken('access-token-as-refresh'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── getProfile ──

  describe('getProfile', () => {
    it('should return user with enterprises', async () => {
      db.__queue([
        {
          id: 1,
          phone: '13800138000',
          nickname: '张三',
          avatar: null,
          status: 'active',
          createdAt: new Date(),
        },
      ]);
      db.__queue([
        { id: 1, name: 'Co A', role: 'boss', isDefault: true },
        { id: 2, name: 'Co B', role: 'sales', isDefault: false },
      ]);

      const result = await service.getProfile(1);

      expect(result.phone).toBe('13800138000');
      expect(result.enterprises).toHaveLength(2);
    });

    it('should throw NotFoundException if user not found', async () => {
      db.__queue([]);

      await expect(service.getProfile(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── switchEnterprise ──

  describe('switchEnterprise', () => {
    it('should update default enterprise and return new tokens', async () => {
      db.__queue([{ userId: 1, enterpriseId: 2, role: 'sales' }]); // membership

      const result = await service.switchEnterprise(1, 2);

      expect(result.access_token).toBe('mock-access-token');
      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: '1', enterpriseId: 2, role: 'sales' }),
      );
    });

    it('should throw NotFoundException if not a member', async () => {
      db.__queue([]);

      await expect(service.switchEnterprise(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── resetPassword ──

  describe('resetPassword', () => {
    it('should update password on valid old password', async () => {
      db.__queue([
        {
          id: 1,
          phone: '13800138000',
          passwordHash: '$2b$10$old',
          status: 'active',
        },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const dto: ResetPasswordDto = {
        phone: '13800138000',
        oldPassword: 'Old12345!',
        newPassword: 'New12345!',
      };
      const result = await service.resetPassword(dto);

      expect(result.success).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith('New12345!', 10);
    });

    it('should throw UnauthorizedException if old password wrong', async () => {
      db.__queue([{ id: 1, phone: '13800138000', passwordHash: '$2b$10$old' }]);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.resetPassword({
          phone: '13800138000',
          oldPassword: 'wrong',
          newPassword: 'new',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── Approval Flows ──

  describe('createApprovalFlow', () => {
    const dto = {
      name: '采购审批',
      type: 'purchase',
      steps: [{ step: 1, role: 'boss' }],
    };

    it('should create an approval flow', async () => {
      db.__queue([
        {
          id: 1,
          name: '采购审批',
          status: 'active',
          createdAt: new Date('2024-01-15'),
        },
      ]);

      const result = await service.createApprovalFlow(dto, 1);

      expect(result.flowId).toBe(1);
      expect(result.name).toBe('采购审批');
      expect(result.status).toBe('active');
    });

    it('should throw if insert fails', async () => {
      db.__queue([]);

      await expect(service.createApprovalFlow(dto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listApprovalFlows', () => {
    it('should return paginated flows', async () => {
      db.__queue([{ c: '2' }]); // total
      db.__queue([
        {
          id: 1,
          enterpriseId: 1,
          name: '采购审批',
          type: 'purchase',
          steps: [{ step: 1, role: 'boss' }],
          status: 'active',
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 2,
          enterpriseId: 1,
          name: '报销审批',
          type: 'reimbursement',
          steps: [{ step: 1, role: 'finance' }],
          status: 'active',
          createdAt: new Date('2024-02-01'),
        },
      ]);

      const result = await service.listApprovalFlows(1, {});

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should return empty when no flows', async () => {
      db.__queue([{ c: '0' }]);
      db.__queue([]);

      const result = await service.listApprovalFlows(1, {});

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getApprovalFlow', () => {
    it('should return flow by id', async () => {
      db.__queue([
        {
          id: 1,
          enterpriseId: 1,
          name: '采购审批',
          type: 'purchase',
          steps: [],
          status: 'active',
          createdAt: new Date(),
        },
      ]);

      const result = await service.getApprovalFlow(1, 1);

      expect(result.flowId).toBe(1);
    });

    it('should throw NotFoundException for wrong enterprise', async () => {
      db.__queue([]);

      await expect(service.getApprovalFlow(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── Approval Records ──

  describe('submitApproval', () => {
    const dto = {
      flowId: 1,
      businessType: 'purchase_order',
      businessId: 5001,
      title: 'Test',
    };

    it('should submit an approval', async () => {
      db.__queue([{ id: 1, status: 'active' }]); // flow check
      db.__queue([
        {
          id: 100,
          status: 'pending',
          currentStep: 1,
          createdAt: new Date('2024-01-15'),
        },
      ]);

      const result = await service.submitApproval(dto, 2);

      expect(result.approvalId).toBe(100);
      expect(result.status).toBe('pending');
    });

    it('should throw if flow is inactive', async () => {
      db.__queue([{ id: 1, status: 'inactive' }]);

      await expect(service.submitApproval(dto, 2)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('actionApproval', () => {
    const pendingRecord = {
      id: 100,
      flowId: 1,
      businessType: 'purchase_order',
      businessId: 5001,
      title: 'Test',
      status: 'pending',
      currentStep: 1,
      submittedBy: 2,
      approvedBy: null,
      comment: null,
      approvedAt: null,
      createdAt: new Date(),
    };

    it('should approve and move to completed when last step', async () => {
      db.__queue([pendingRecord]); // record
      db.__queue([
        { id: 1, status: 'active', steps: [{ step: 1, role: 'boss' }] },
      ]); // flow

      const result = await service.actionApproval(100, 1, 'boss', {
        action: 'approve',
        comment: 'OK',
      });

      expect(result.status).toBe('approved');
      expect(result.nextStep).toBeNull();
    });

    it('should approve and move to next step when multistep', async () => {
      db.__queue([pendingRecord]);
      db.__queue([
        {
          id: 1,
          status: 'active',
          steps: [
            { step: 1, role: 'boss' },
            { step: 2, role: 'finance' },
          ],
        },
      ]);

      const result = await service.actionApproval(100, 1, 'boss', {
        action: 'approve',
      });

      expect(result.status).toBe('pending');
      expect(result.nextStep).toBe(2);
    });

    it('should reject', async () => {
      db.__queue([pendingRecord]);
      db.__queue([
        { id: 1, status: 'active', steps: [{ step: 1, role: 'boss' }] },
      ]);

      const result = await service.actionApproval(100, 1, 'boss', {
        action: 'reject',
      });

      expect(result.status).toBe('rejected');
    });

    it('should throw ForbiddenException for wrong role', async () => {
      db.__queue([pendingRecord]);
      db.__queue([
        { id: 1, status: 'active', steps: [{ step: 1, role: 'boss' }] },
      ]);

      await expect(
        service.actionApproval(100, 1, 'sales', { action: 'approve' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if record status is not pending', async () => {
      db.__queue([{ ...pendingRecord, status: 'approved' }]);

      await expect(
        service.actionApproval(100, 1, 'boss', { action: 'approve' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
