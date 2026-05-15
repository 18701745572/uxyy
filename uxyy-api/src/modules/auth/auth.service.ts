import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { and, count, desc, eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { DRIZZLE_DB } from '../database/database.constants';
import type { AppDrizzleDb } from '../database/database.module';
import { ApprovalFlowService } from '../oa/services/approval-flow.service';
import { resolveJwtRefreshSecret } from './jwt-access-secret';
import {
  assertPersistEnterpriseRole,
  canonicalEnterpriseRoleForApi,
  UxyyRole,
} from './role-permissions';

function jwtExpiresIn(value: string): NonNullable<JwtSignOptions['expiresIn']> {
  return value as NonNullable<JwtSignOptions['expiresIn']>;
}

export interface RegisterDto {
  phone: string;
  password: string;
  nickname?: string;
  enterpriseName?: string;
}

export interface RefreshTokenDto {
  refresh_token: string;
}

export interface ResetPasswordDto {
  phone: string;
  oldPassword: string;
  newPassword: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => ApprovalFlowService))
    private readonly approvalFlows: ApprovalFlowService,
  ) {}

  // ========== 登录 ==========
  async login(phone: string, plainPassword: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phone, phone))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'banned') {
      throw new ForbiddenException('Account is banned');
    }

    const passwordHash = user.passwordHash;
    if (typeof passwordHash !== 'string' || passwordHash.length === 0) {
      throw new BadRequestException('User has no password hash');
    }

    const match = await bcrypt.compare(plainPassword, passwordHash);
    if (!match) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const memberships = await this.db
      .select()
      .from(schema.userEnterprises)
      .where(eq(schema.userEnterprises.userId, user.id));

    const membership =
      memberships.find((m) => m.isDefault === true) ?? memberships[0];
    const enterpriseId = membership?.enterpriseId;

    const accessToken = await this.jwt.signAsync({
      sub: String(user.id),
      enterpriseId,
      role: canonicalEnterpriseRoleForApi(membership?.role),
      nickname: user.nickname,
      phone: user.phone,
    });

    const refreshSecret = resolveJwtRefreshSecret(this.config);
    const refreshExpiresIn =
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    const refreshToken = await this.jwt.signAsync(
      { sub: String(user.id), type: 'refresh' },
      { secret: refreshSecret, expiresIn: jwtExpiresIn(refreshExpiresIn) },
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer' as const,
      user: { id: user.id, phone: user.phone, nickname: user.nickname },
      enterprise: enterpriseId != null ? { id: enterpriseId } : null,
    };
  }

  // ========== 注册 ==========
  async register(dto: RegisterDto) {
    // 检查手机号是否已存在
    const [existing] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phone, dto.phone))
      .limit(1);

    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    // 密码加密
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 创建用户
    const [user] = await this.db
      .insert(schema.users)
      .values({
        phone: dto.phone,
        passwordHash,
        nickname: dto.nickname ?? null,
        status: 'active',
      })
      .returning();

    let enterpriseId: number | null = null;

    // 如果提供了企业名称，创建企业
    if (dto.enterpriseName) {
      const [enterprise] = await this.db
        .insert(schema.enterprises)
        .values({
          ownerId: user.id,
          name: dto.enterpriseName,
          status: 'active',
        })
        .returning();

      enterpriseId = enterprise.id;

      // 创建用户-企业关联
      await this.db.insert(schema.userEnterprises).values({
        userId: user.id,
        enterpriseId: enterprise.id,
        role: assertPersistEnterpriseRole(UxyyRole.BOSS),
        isDefault: true,
      });
    }

    // 生成 Token
    const accessToken = await this.jwt.signAsync({
      sub: String(user.id),
      enterpriseId,
      role: enterpriseId != null ? UxyyRole.BOSS : undefined,
      nickname: user.nickname,
      phone: user.phone,
    });

    const refreshSecret = resolveJwtRefreshSecret(this.config);
    const refreshExpiresIn =
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    const refreshToken = await this.jwt.signAsync(
      { sub: String(user.id), type: 'refresh' },
      { secret: refreshSecret, expiresIn: jwtExpiresIn(refreshExpiresIn) },
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer' as const,
      user: { id: user.id, phone: user.phone, nickname: user.nickname },
      enterprise: enterpriseId != null ? { id: enterpriseId } : null,
    };
  }

  // ========== Token 刷新 ==========
  async refreshToken(refreshToken: string) {
    try {
      const secret = resolveJwtRefreshSecret(this.config);
      const payload = await this.jwt.verifyAsync<{ sub: string; type: string }>(
        refreshToken,
        { secret },
      );

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const userId = Number(payload.sub);
      if (Number.isNaN(userId)) {
        throw new UnauthorizedException('Invalid token');
      }

      // 检查用户是否存在
      const [user] = await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('User not found or inactive');
      }

      // 获取企业信息
      const memberships = await this.db
        .select()
        .from(schema.userEnterprises)
        .where(eq(schema.userEnterprises.userId, user.id));

      const membership =
        memberships.find((m) => m.isDefault === true) ?? memberships[0];
      const enterpriseId = membership?.enterpriseId;

      // 生成新的 Access Token
      const accessToken = await this.jwt.signAsync({
        sub: String(user.id),
        enterpriseId,
        role: canonicalEnterpriseRoleForApi(membership?.role),
      });

      const expiresInRaw =
        this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
      const newRefreshToken = await this.jwt.signAsync(
        { sub: String(user.id), type: 'refresh' },
        { secret, expiresIn: jwtExpiresIn(expiresInRaw) },
      );

      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        token_type: 'Bearer' as const,
      };
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ========== 密码重置 ==========
  async resetPassword(dto: ResetPasswordDto) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phone, dto.phone))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 验证旧密码
    const match = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!match) {
      throw new UnauthorizedException('Invalid old password');
    }

    // 加密新密码
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    // 更新密码
    await this.db
      .update(schema.users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(schema.users.id, user.id));

    return { success: true, message: 'Password reset successfully' };
  }

  // ========== 获取当前用户信息 ==========

  /** 当前用户所属企业列表（与前端 EnterpriseDto 对齐） */
  async listEnterprises(userId: number) {
    const rows = await this.db
      .select({
        id: schema.enterprises.id,
        name: schema.enterprises.name,
        industry: schema.enterprises.industry,
        role: schema.userEnterprises.role,
        isDefault: schema.userEnterprises.isDefault,
      })
      .from(schema.userEnterprises)
      .innerJoin(
        schema.enterprises,
        eq(schema.userEnterprises.enterpriseId, schema.enterprises.id),
      )
      .where(eq(schema.userEnterprises.userId, userId));

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      industry: r.industry ?? null,
      role: canonicalEnterpriseRoleForApi(r.role) ?? '',
      isDefault: Boolean(r.isDefault),
    }));
  }

  async getProfile(userId: number) {
    const [user] = await this.db
      .select({
        id: schema.users.id,
        phone: schema.users.phone,
        nickname: schema.users.nickname,
        avatar: schema.users.avatar,
        status: schema.users.status,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const enterprises = await this.listEnterprises(userId);

    return {
      ...user,
      enterprises,
    };
  }

  // ========== 切换默认企业 ==========
  async switchEnterprise(userId: number, enterpriseId: number) {
    // 检查用户是否属于该企业
    const [membership] = await this.db
      .select()
      .from(schema.userEnterprises)
      .where(
        and(
          eq(schema.userEnterprises.userId, userId),
          eq(schema.userEnterprises.enterpriseId, enterpriseId),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new NotFoundException('Enterprise membership not found');
    }

    // 先将所有企业设为非默认
    await this.db
      .update(schema.userEnterprises)
      .set({ isDefault: false })
      .where(eq(schema.userEnterprises.userId, userId));

    // 将指定企业设为默认
    await this.db
      .update(schema.userEnterprises)
      .set({ isDefault: true })
      .where(
        and(
          eq(schema.userEnterprises.userId, userId),
          eq(schema.userEnterprises.enterpriseId, enterpriseId),
        ),
      );

    // 获取用户信息以包含在 token 中
    const [user] = await this.db
      .select({
        nickname: schema.users.nickname,
        phone: schema.users.phone,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    // 生成新的 Token
    const accessToken = await this.jwt.signAsync({
      sub: String(userId),
      enterpriseId,
      role: canonicalEnterpriseRoleForApi(membership.role),
      nickname: user?.nickname,
      phone: user?.phone,
    });

    const secret = resolveJwtRefreshSecret(this.config);
    const expiresInRaw =
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    const refreshToken = await this.jwt.signAsync(
      { sub: String(userId), type: 'refresh' },
      { secret, expiresIn: jwtExpiresIn(expiresInRaw) },
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer' as const,
    };
  }

  // ========== 审批流程管理 ==========

  async createApprovalFlow(
    dto: {
      name: string;
      type: string;
      steps: { step: number; role: string; condition?: object }[];
    },
    enterpriseId: number,
  ) {
    let stepsValidated: typeof dto.steps;
    try {
      stepsValidated = dto.steps.map((s) => ({
        step: s.step,
        role: assertPersistEnterpriseRole(s.role),
        condition: s.condition,
      }));
    } catch (err) {
      if (err instanceof TypeError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const [flow] = await this.db
      .insert(schema.approvalFlows)
      .values({
        enterpriseId,
        name: dto.name,
        type: dto.type as typeof schema.approvalFlows.$inferSelect.type,
        steps: stepsValidated,
        status: 'active',
      })
      .returning();

    if (!flow) throw new BadRequestException('创建审批流程失败');

    return {
      flowId: flow.id,
      name: flow.name,
      status: flow.status,
      createdAt: flow.createdAt?.toISOString(),
    };
  }

  async listApprovalFlows(
    enterpriseId: number,
    query: { page?: number; pageSize?: number; type?: string },
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const conditions = [eq(schema.approvalFlows.enterpriseId, enterpriseId)];
    if (query.type) {
      conditions.push(
        eq(
          schema.approvalFlows.type,
          query.type as typeof schema.approvalFlows.$inferSelect.type,
        ),
      );
    }

    const [totalRow] = await this.db
      .select({ c: count() })
      .from(schema.approvalFlows)
      .where(and(...conditions));

    const rows = await this.db
      .select()
      .from(schema.approvalFlows)
      .where(and(...conditions))
      .orderBy(desc(schema.approvalFlows.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      items: rows.map((r) => ({
        flowId: r.id,
        enterpriseId: r.enterpriseId,
        name: r.name,
        type: r.type,
        steps: r.steps,
        status: r.status,
        createdAt: r.createdAt?.toISOString(),
      })),
      total: Number(totalRow?.c ?? 0),
      page,
      pageSize,
    };
  }

  async getApprovalFlow(flowId: number, enterpriseId: number) {
    const [row] = await this.db
      .select()
      .from(schema.approvalFlows)
      .where(
        and(
          eq(schema.approvalFlows.id, flowId),
          eq(schema.approvalFlows.enterpriseId, enterpriseId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('审批流程不存在');

    return {
      flowId: row.id,
      enterpriseId: row.enterpriseId,
      name: row.name,
      type: row.type,
      steps: row.steps,
      status: row.status,
      createdAt: row.createdAt?.toISOString(),
    };
  }

  // ========== 审批单管理 ==========

  async submitApproval(
    dto: {
      flowId: number;
      businessType: string;
      businessId: number;
      title: string;
      remark?: string;
    },
    userId: number,
  ) {
    const [flow] = await this.db
      .select()
      .from(schema.approvalFlows)
      .where(eq(schema.approvalFlows.id, dto.flowId))
      .limit(1);

    if (!flow || flow.status !== 'active') {
      throw new NotFoundException('审批流程不存在或已停用');
    }

    const [record] = await this.db
      .insert(schema.approvalRecords)
      .values({
        flowId: dto.flowId,
        businessType: dto.businessType,
        businessId: dto.businessId,
        title: dto.title,
        remark: dto.remark,
        status: 'pending',
        currentStep: 1,
        submittedBy: userId,
      })
      .returning();

    if (!record) throw new BadRequestException('提交审批失败');

    return {
      approvalId: record.id,
      status: record.status,
      currentStep: record.currentStep,
      submittedAt: record.createdAt?.toISOString(),
    };
  }

  async listApprovals(
    enterpriseId: number,
    query: { page?: number; pageSize?: number; status?: string },
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const flowIds = await this.db
      .select({ id: schema.approvalFlows.id })
      .from(schema.approvalFlows)
      .where(eq(schema.approvalFlows.enterpriseId, enterpriseId));

    const flowIdList = flowIds.map((f) => f.id);
    if (flowIdList.length === 0) {
      return { items: [], total: 0, page, pageSize };
    }

    const conditions = [
      and(...flowIdList.map((id) => eq(schema.approvalRecords.flowId, id))),
    ];
    if (query.status) {
      conditions.push(
        eq(
          schema.approvalRecords.status,
          query.status as typeof schema.approvalRecords.$inferSelect.status,
        ),
      );
    }

    const [totalRow] = await this.db
      .select({ c: count() })
      .from(schema.approvalRecords)
      .where(and(...conditions));

    const rows = await this.db
      .select()
      .from(schema.approvalRecords)
      .where(and(...conditions))
      .orderBy(desc(schema.approvalRecords.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      items: rows.map((r) => ({
        approvalId: r.id,
        flowId: r.flowId,
        businessType: r.businessType,
        businessId: r.businessId,
        title: r.title,
        status: r.status,
        currentStep: r.currentStep,
        submittedBy: r.submittedBy,
        approvedBy: r.approvedBy ?? undefined,
        comment: r.comment ?? undefined,
        approvedAt: r.approvedAt?.toISOString(),
        createdAt: r.createdAt?.toISOString(),
      })),
      total: Number(totalRow?.c ?? 0),
      page,
      pageSize,
    };
  }

  async getApproval(approvalId: number, enterpriseId: number) {
    const [record] = await this.db
      .select()
      .from(schema.approvalRecords)
      .where(eq(schema.approvalRecords.id, approvalId))
      .limit(1);

    if (!record) throw new NotFoundException('审批单不存在');

    const [flow] = await this.db
      .select()
      .from(schema.approvalFlows)
      .where(eq(schema.approvalFlows.id, record.flowId))
      .limit(1);

    if (!flow || flow.enterpriseId !== enterpriseId) {
      throw new NotFoundException('审批单不存在');
    }

    return {
      approvalId: record.id,
      flowId: record.flowId,
      businessType: record.businessType,
      businessId: record.businessId,
      title: record.title,
      status: record.status,
      currentStep: record.currentStep,
      submittedBy: record.submittedBy,
      approvedBy: record.approvedBy ?? undefined,
      comment: record.comment ?? undefined,
      approvedAt: record.approvedAt?.toISOString(),
      createdAt: record.createdAt?.toISOString(),
    };
  }

  async actionApproval(
    approvalId: number,
    userId: number,
    userRole: string,
    dto: { action: string; comment?: string },
  ) {
    return this.approvalFlows.processLegacyAuthAction(
      approvalId,
      userId,
      userRole,
      dto,
    );
  }
}
