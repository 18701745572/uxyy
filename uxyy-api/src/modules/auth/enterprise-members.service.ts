import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { and, count, eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { DRIZZLE_DB } from '../database/database.constants';
import type { AppDrizzleDb } from '../database/database.module';
import {
  ASSIGNABLE_ENTERPRISE_MEMBER_ROLES,
  assertPersistEnterpriseRole,
  type UxyyRoleCode,
} from './role-permissions';

const ASSIGN_ROLE_SET = new Set<string>(ASSIGNABLE_ENTERPRISE_MEMBER_ROLES);

export type EnterpriseMemberRow = {
  userId: number;
  phone: string | null;
  nickname: string | null;
  role: string;
  isDefault: boolean;
  isOwner: boolean;
};

@Injectable()
export class EnterpriseMembersService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

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

  async listMembers(enterpriseId: number): Promise<EnterpriseMemberRow[]> {
    const [enterprise] = await this.db
      .select({
        ownerId: schema.enterprises.ownerId,
      })
      .from(schema.enterprises)
      .where(eq(schema.enterprises.id, enterpriseId))
      .limit(1);

    if (!enterprise) {
      throw new NotFoundException('企业不存在');
    }

    const rows = await this.db
      .select({
        userId: schema.users.id,
        phone: schema.users.phone,
        nickname: schema.users.nickname,
        role: schema.userEnterprises.role,
        isDefault: schema.userEnterprises.isDefault,
      })
      .from(schema.userEnterprises)
      .innerJoin(
        schema.users,
        eq(schema.users.id, schema.userEnterprises.userId),
      )
      .where(eq(schema.userEnterprises.enterpriseId, enterpriseId));

    const ownerId = enterprise.ownerId;
    return rows.map((r) => ({
      userId: r.userId,
      phone: r.phone ?? null,
      nickname: r.nickname ?? null,
      role: r.role,
      isDefault: Boolean(r.isDefault),
      isOwner: r.userId === ownerId,
    }));
  }

  async addMember(
    enterpriseId: number,
    phoneRaw: string,
    roleRaw: string,
  ): Promise<EnterpriseMemberRow> {
    const role = this.normalizeAssignableRole(roleRaw);

    const [enterprise] = await this.db
      .select()
      .from(schema.enterprises)
      .where(eq(schema.enterprises.id, enterpriseId))
      .limit(1);

    if (!enterprise) throw new NotFoundException('企业不存在');

    const maxUsers =
      enterprise.maxUsers != null && enterprise.maxUsers > 0
        ? enterprise.maxUsers
        : 3;

    const [cntRow] = await this.db
      .select({ c: count() })
      .from(schema.userEnterprises)
      .where(eq(schema.userEnterprises.enterpriseId, enterpriseId));

    const currentCount = Number(cntRow?.c ?? 0);
    if (currentCount >= maxUsers) {
      throw new BadRequestException(
        `企业成员已达上限（${maxUsers}），请升级套餐后再添加`,
      );
    }

    const phone = phoneRaw.trim();

    const [targetUser] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phone, phone))
      .limit(1);

    if (!targetUser) {
      throw new NotFoundException(
        '该手机号尚未在本平台注册，请先让用户完成注册后再加入企业',
      );
    }

    if (targetUser.id === enterprise.ownerId) {
      throw new ConflictException('企业主已默认拥有该企业，无需重复添加');
    }

    const [existing] = await this.db
      .select({ id: schema.userEnterprises.id })
      .from(schema.userEnterprises)
      .where(
        and(
          eq(schema.userEnterprises.enterpriseId, enterpriseId),
          eq(schema.userEnterprises.userId, targetUser.id),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException('该成员已在企业中');
    }

    await this.db.insert(schema.userEnterprises).values({
      userId: targetUser.id,
      enterpriseId,
      role,
      isDefault: false,
    });

    return {
      userId: targetUser.id,
      phone: targetUser.phone,
      nickname: targetUser.nickname ?? null,
      role,
      isDefault: false,
      isOwner: false,
    };
  }

  async updateMemberRole(
    enterpriseId: number,
    memberUserId: number,
    roleRaw: string,
  ): Promise<{ userId: number; role: string }> {
    const role = this.normalizeAssignableRole(roleRaw);

    const [enterprise] = await this.db
      .select({ ownerId: schema.enterprises.ownerId })
      .from(schema.enterprises)
      .where(eq(schema.enterprises.id, enterpriseId))
      .limit(1);

    if (!enterprise) throw new NotFoundException('企业不存在');
    if (memberUserId === enterprise.ownerId) {
      throw new BadRequestException('不可变更企业主在本企业的角色');
    }

    const [membership] = await this.db
      .select()
      .from(schema.userEnterprises)
      .where(
        and(
          eq(schema.userEnterprises.enterpriseId, enterpriseId),
          eq(schema.userEnterprises.userId, memberUserId),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new NotFoundException('未找到该企业成员');
    }

    await this.db
      .update(schema.userEnterprises)
      .set({ role })
      .where(
        and(
          eq(schema.userEnterprises.enterpriseId, enterpriseId),
          eq(schema.userEnterprises.userId, memberUserId),
        ),
      );

    return { userId: memberUserId, role };
  }

  async removeMember(
    enterpriseId: number,
    memberUserId: number,
  ): Promise<{ userId: number }> {
    const [enterprise] = await this.db
      .select({ ownerId: schema.enterprises.ownerId })
      .from(schema.enterprises)
      .where(eq(schema.enterprises.id, enterpriseId))
      .limit(1);

    if (!enterprise) throw new NotFoundException('企业不存在');

    if (memberUserId === enterprise.ownerId) {
      throw new BadRequestException('不可移除企业主；请先完成企业转让再操作');
    }

    const deleted = await this.db
      .delete(schema.userEnterprises)
      .where(
        and(
          eq(schema.userEnterprises.enterpriseId, enterpriseId),
          eq(schema.userEnterprises.userId, memberUserId),
        ),
      )
      .returning({ id: schema.userEnterprises.id });

    if (deleted.length === 0) {
      throw new NotFoundException('未找到该企业成员');
    }

    return { userId: memberUserId };
  }
}
