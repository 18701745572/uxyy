import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { and, count, eq, type InferSelectModel } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { DRIZZLE_DB } from '../database/database.constants';
import type { AppDrizzleDb } from '../database/database.module';
import { resolveJwtRefreshSecret } from './jwt-access-secret';
import {
  ASSIGNABLE_ENTERPRISE_MEMBER_ROLES,
  assertPersistEnterpriseRole,
  canonicalEnterpriseRoleForApi,
  type UxyyRoleCode,
} from './role-permissions';

const ASSIGN_ROLE_SET = new Set<string>(ASSIGNABLE_ENTERPRISE_MEMBER_ROLES);

type UserRow = InferSelectModel<typeof schema.users>;

function jwtExpiresIn(value: string): NonNullable<JwtSignOptions['expiresIn']> {
  return value as NonNullable<JwtSignOptions['expiresIn']>;
}

function hashInvitationToken(raw: string): string {
  return createHash('sha256').update(raw.trim(), 'utf8').digest('hex');
}

function maskCnPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length === 11 && /^1\d{10}$/.test(d)) {
    return `${d.slice(0, 3)}****${d.slice(-4)}`;
  }
  return '***';
}

export interface CreateInvitationResponse {
  joinRelativePath: string;
  expiresAt: string;
}

/** 与其它 Auth 会话响应一致：`access_token` / `refresh_token` */
export type InvitationAuthBundle = {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  user: { id: number; phone: string; nickname: string | null };
  enterprise: { id: number };
};

@Injectable()
export class EnterpriseInvitationsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private normalizeAssignableRole(roleRaw: string): UxyyRoleCode {
    let code: UxyyRoleCode;
    try {
      code = assertPersistEnterpriseRole(roleRaw);
    } catch {
      throw new BadRequestException('无效的企业角色代码');
    }
    if (!ASSIGN_ROLE_SET.has(code)) {
      throw new BadRequestException(
        `仅支持成员角色：${[...ASSIGN_ROLE_SET].join(', ')}（不可分配 boss）`,
      );
    }
    return code;
  }

  private async assertSeatAvailable(tx: AppDrizzleDb, enterpriseId: number) {
    const [enterprise] = await tx
      .select()
      .from(schema.enterprises)
      .where(eq(schema.enterprises.id, enterpriseId))
      .limit(1);

    if (!enterprise) throw new NotFoundException('企业不存在');

    const maxUsers =
      enterprise.maxUsers != null && enterprise.maxUsers > 0
        ? enterprise.maxUsers
        : 3;

    const [cntRow] = await tx
      .select({ c: count() })
      .from(schema.userEnterprises)
      .where(eq(schema.userEnterprises.enterpriseId, enterpriseId));

    const currentCount = Number(cntRow?.c ?? 0);
    if (currentCount >= maxUsers) {
      throw new BadRequestException(
        `企业成员已达上限（${maxUsers}），请升级套餐后再添加`,
      );
    }
  }

  private invitationExpiresMs(): number {
    const raw =
      this.config.get<string>('ENTERPRISE_INVITE_EXPIRES_DAYS') ?? '7';
    const days = Number.parseInt(raw.replace(/_/g, ''), 10);
    const d = Number.isFinite(days) && days > 0 ? days : 7;
    return d * 86_400_000;
  }

  private async signAuthBundle(opts: {
    userRow: UserRow;
    enterpriseId: number;
    persistRoleCode: string;
  }): Promise<InvitationAuthBundle> {
    const { userRow, enterpriseId, persistRoleCode } = opts;

    const accessToken = await this.jwt.signAsync({
      sub: String(userRow.id),
      enterpriseId,
      role: canonicalEnterpriseRoleForApi(persistRoleCode),
    });

    const refreshSecret = resolveJwtRefreshSecret(this.config);
    const refreshExpiresIn =
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    const refreshToken = await this.jwt.signAsync(
      { sub: String(userRow.id), type: 'refresh' },
      { secret: refreshSecret, expiresIn: jwtExpiresIn(refreshExpiresIn) },
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      user: {
        id: userRow.id,
        phone: userRow.phone,
        nickname: userRow.nickname ?? null,
      },
      enterprise: { id: enterpriseId },
    };
  }

  async createInvitation(
    enterpriseId: number,
    inviterUserId: number,
    phoneRaw: string,
    roleRaw: string,
  ): Promise<CreateInvitationResponse> {
    const role = this.normalizeAssignableRole(roleRaw);
    const inviteePhone = phoneRaw.trim();
    if (!/^1\d{10}$/.test(inviteePhone)) {
      throw new BadRequestException('请输入中国大陆 11 位手机号');
    }

    const [enterprise] = await this.db
      .select()
      .from(schema.enterprises)
      .where(eq(schema.enterprises.id, enterpriseId))
      .limit(1);

    if (!enterprise) throw new NotFoundException('企业不存在');

    const [targetUser] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phone, inviteePhone))
      .limit(1);

    if (targetUser && targetUser.id === enterprise.ownerId) {
      throw new ConflictException('该企业主手机号已拥有本企业');
    }

    if (targetUser) {
      const [alreadyMember] = await this.db
        .select({ id: schema.userEnterprises.id })
        .from(schema.userEnterprises)
        .where(
          and(
            eq(schema.userEnterprises.enterpriseId, enterpriseId),
            eq(schema.userEnterprises.userId, targetUser.id),
          ),
        )
        .limit(1);

      if (alreadyMember) {
        throw new ConflictException('该成员已在企业中');
      }
    }

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = hashInvitationToken(rawToken);
    const now = Date.now();
    const expiresAt = new Date(now + this.invitationExpiresMs());

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.enterpriseInvitations)
        .set({ status: 'revoked' })
        .where(
          and(
            eq(schema.enterpriseInvitations.enterpriseId, enterpriseId),
            eq(schema.enterpriseInvitations.inviteePhone, inviteePhone),
            eq(schema.enterpriseInvitations.status, 'pending'),
          ),
        );

      await tx.insert(schema.enterpriseInvitations).values({
        enterpriseId,
        inviteePhone,
        presetRole: role,
        inviterUserId,
        tokenHash,
        status: 'pending',
        expiresAt,
      });
    });

    const joinRelativePath = `/join?t=${encodeURIComponent(rawToken)}`;

    return {
      joinRelativePath,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async preview(tokenRaw: string | undefined) {
    const token = (tokenRaw ?? '').trim();
    if (token.length < 16) {
      return { valid: false as const };
    }

    const tokenHash = hashInvitationToken(token);
    const [row] = await this.db
      .select({
        id: schema.enterpriseInvitations.id,
        enterpriseId: schema.enterpriseInvitations.enterpriseId,
        inviteePhone: schema.enterpriseInvitations.inviteePhone,
        presetRole: schema.enterpriseInvitations.presetRole,
        status: schema.enterpriseInvitations.status,
        expiresAt: schema.enterpriseInvitations.expiresAt,
        enterpriseName: schema.enterprises.name,
      })
      .from(schema.enterpriseInvitations)
      .innerJoin(
        schema.enterprises,
        eq(schema.enterpriseInvitations.enterpriseId, schema.enterprises.id),
      )
      .where(eq(schema.enterpriseInvitations.tokenHash, tokenHash))
      .limit(1);

    if (
      !row ||
      row.status !== 'pending' ||
      !(row.expiresAt instanceof Date) ||
      row.expiresAt.getTime() <= Date.now()
    ) {
      return { valid: false as const };
    }

    return {
      valid: true as const,
      enterpriseName: row.enterpriseName,
      inviteePhoneMasked: maskCnPhone(row.inviteePhone),
      presetRole:
        canonicalEnterpriseRoleForApi(row.presetRole) ?? row.presetRole,
      expiresAt:
        row.expiresAt instanceof Date
          ? row.expiresAt.toISOString()
          : String(row.expiresAt),
    };
  }

  async acceptInvitation(
    userId: number,
    tokenRaw: string,
  ): Promise<InvitationAuthBundle> {
    const token = tokenRaw.trim();
    if (!token.length) throw new BadRequestException('缺少邀请令牌');

    const tokenHash = hashInvitationToken(token);
    const [invitation] = await this.db
      .select({
        invitation: schema.enterpriseInvitations,
        enterprise: schema.enterprises,
      })
      .from(schema.enterpriseInvitations)
      .innerJoin(
        schema.enterprises,
        eq(schema.enterpriseInvitations.enterpriseId, schema.enterprises.id),
      )
      .where(eq(schema.enterpriseInvitations.tokenHash, tokenHash))
      .limit(1);

    if (!invitation) {
      throw new BadRequestException('邀请无效或已失效');
    }

    const row = invitation.invitation;
    if (row.status !== 'pending') {
      throw new BadRequestException('该邀请不可用');
    }

    const exp =
      row.expiresAt instanceof Date ? row.expiresAt : new Date(row.expiresAt);
    if (exp.getTime() <= Date.now()) {
      throw new BadRequestException('邀请已过期');
    }

    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) throw new NotFoundException('用户不存在');

    if (user.phone.trim() !== row.inviteePhone) {
      throw new ForbiddenException(
        '请使用邀请所含手机号对应的账号登录后再接受邀请',
      );
    }

    if (user.status !== 'active') {
      throw new ForbiddenException('账号不可用');
    }

    if (user.id === invitation.enterprise.ownerId) {
      throw new ConflictException('企业主已通过注册拥有该企业');
    }

    const enterpriseId = row.enterpriseId;
    const [existingMembership] = await this.db
      .select({ id: schema.userEnterprises.id })
      .from(schema.userEnterprises)
      .where(
        and(
          eq(schema.userEnterprises.enterpriseId, enterpriseId),
          eq(schema.userEnterprises.userId, user.id),
        ),
      )
      .limit(1);

    if (existingMembership) {
      throw new ConflictException('该成员已在企业中');
    }

    await this.db.transaction(async (tx) => {
      await this.assertSeatAvailable(tx, enterpriseId);

      await tx
        .update(schema.userEnterprises)
        .set({ isDefault: false })
        .where(eq(schema.userEnterprises.userId, user.id));

      await tx.insert(schema.userEnterprises).values({
        userId: user.id,
        enterpriseId,
        role: assertPersistEnterpriseRole(row.presetRole),
        isDefault: true,
      });

      await tx
        .update(schema.enterpriseInvitations)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
          acceptedUserId: user.id,
        })
        .where(eq(schema.enterpriseInvitations.id, row.id));
    });

    return this.signAuthBundle({
      userRow: user,
      enterpriseId,
      persistRoleCode: row.presetRole,
    });
  }

  async registerViaInvitation(opts: {
    invitationToken: string;
    password: string;
    nickname?: string;
  }): Promise<InvitationAuthBundle> {
    const token = opts.invitationToken.trim();
    if (!token.length) throw new BadRequestException('缺少邀请令牌');

    const password = opts.password;
    if (!password || password.length < 8) {
      throw new BadRequestException('密码至少 8 位');
    }

    const tokenHash = hashInvitationToken(token);
    const [invitation] = await this.db
      .select({
        invitation: schema.enterpriseInvitations,
        enterprise: schema.enterprises,
      })
      .from(schema.enterpriseInvitations)
      .innerJoin(
        schema.enterprises,
        eq(schema.enterpriseInvitations.enterpriseId, schema.enterprises.id),
      )
      .where(eq(schema.enterpriseInvitations.tokenHash, tokenHash))
      .limit(1);

    if (!invitation) throw new BadRequestException('邀请无效或已失效');

    const row = invitation.invitation;
    if (row.status !== 'pending') throw new BadRequestException('该邀请不可用');

    const exp =
      row.expiresAt instanceof Date ? row.expiresAt : new Date(row.expiresAt);
    if (exp.getTime() <= Date.now()) {
      throw new BadRequestException('邀请已过期');
    }

    const inviteePhone = row.inviteePhone;

    const [existingUser] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phone, inviteePhone))
      .limit(1);

    if (existingUser) {
      throw new ConflictException(
        '该手机号已注册，请登录后在企业邀请页接受邀请',
      );
    }

    const enterpriseId = row.enterpriseId;

    const newUser = await this.db.transaction(async (tx) => {
      await this.assertSeatAvailable(tx, enterpriseId);

      const passwordHash = await bcrypt.hash(password, 10);
      const [inserted] = await tx
        .insert(schema.users)
        .values({
          phone: inviteePhone,
          passwordHash,
          nickname: opts.nickname?.trim() ? opts.nickname.trim() : null,
          status: 'active',
        })
        .returning();

      if (!inserted) throw new ConflictException('用户创建失败');

      if (inserted.id === invitation.enterprise.ownerId) {
        throw new ConflictException('企业主已通过注册拥有该企业');
      }

      await tx
        .update(schema.userEnterprises)
        .set({ isDefault: false })
        .where(eq(schema.userEnterprises.userId, inserted.id));

      await tx.insert(schema.userEnterprises).values({
        userId: inserted.id,
        enterpriseId,
        role: assertPersistEnterpriseRole(row.presetRole),
        isDefault: true,
      });

      await tx
        .update(schema.enterpriseInvitations)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
          acceptedUserId: inserted.id,
        })
        .where(eq(schema.enterpriseInvitations.id, row.id));

      return inserted;
    });

    return this.signAuthBundle({
      userRow: newUser,
      enterpriseId,
      persistRoleCode: row.presetRole,
    });
  }
}
