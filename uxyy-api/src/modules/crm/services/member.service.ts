import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import * as schema from '../../../db/schema';

export interface CreateMemberLevelDto {
  name: string;
  code: string;
  minPoints: number;
  maxPoints?: number;
  discountRate?: string;
  description?: string;
  benefits?: string[];
  color?: string;
  sortOrder?: number;
  isDefault?: boolean;
}

export interface UpdateMemberLevelDto extends Partial<CreateMemberLevelDto> {}

export interface CreateCustomerMemberDto {
  customerId: number;
  memberNo?: string;
  levelId?: number;
  remark?: string;
}

export interface PointsOperationDto {
  customerId: number;
  points: number;
  type: 'earn' | 'redeem' | 'adjust' | 'expire';
  sourceType?: string;
  sourceId?: number;
  description?: string;
  createdBy?: number;
}

@Injectable()
export class MemberService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
  ) {}

  // ==================== 会员等级管理 ====================

  async findAllLevels(enterpriseId: number) {
    return this.db
      .select()
      .from(schema.memberLevels)
      .where(
        and(
          eq(schema.memberLevels.enterpriseId, enterpriseId),
          eq(schema.memberLevels.isDeleted, false),
        ),
      )
      .orderBy(schema.memberLevels.sortOrder);
  }

  async findLevelById(id: number, enterpriseId: number) {
    const [level] = await this.db
      .select()
      .from(schema.memberLevels)
      .where(
        and(
          eq(schema.memberLevels.id, id),
          eq(schema.memberLevels.enterpriseId, enterpriseId),
          eq(schema.memberLevels.isDeleted, false),
        ),
      );
    return level;
  }

  async createLevel(enterpriseId: number, dto: CreateMemberLevelDto) {
    // 如果设置为默认，取消其他默认等级
    if (dto.isDefault) {
      await this.db
        .update(schema.memberLevels)
        .set({ isDefault: false })
        .where(eq(schema.memberLevels.enterpriseId, enterpriseId));
    }

    const [level] = await this.db
      .insert(schema.memberLevels)
      .values({
        enterpriseId,
        ...dto,
      })
      .returning();

    return level;
  }

  async updateLevel(id: number, enterpriseId: number, dto: UpdateMemberLevelDto) {
    // 如果设置为默认，取消其他默认等级
    if (dto.isDefault) {
      await this.db
        .update(schema.memberLevels)
        .set({ isDefault: false })
        .where(
          and(
            eq(schema.memberLevels.enterpriseId, enterpriseId),
            sql`${schema.memberLevels.id} != ${id}`,
          ),
        );
    }

    const [level] = await this.db
      .update(schema.memberLevels)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.memberLevels.id, id),
          eq(schema.memberLevels.enterpriseId, enterpriseId),
        ),
      )
      .returning();

    return level;
  }

  async deleteLevel(id: number, enterpriseId: number) {
    const [level] = await this.db
      .update(schema.memberLevels)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(
        and(
          eq(schema.memberLevels.id, id),
          eq(schema.memberLevels.enterpriseId, enterpriseId),
        ),
      )
      .returning();

    return level;
  }

  // ==================== 客户会员管理 ====================

  async findAllMembers(enterpriseId: number, options?: { levelId?: number; keyword?: string }) {
    let query = this.db
      .select({
        member: schema.customerMembers,
        customer: schema.customers,
        level: schema.memberLevels,
      })
      .from(schema.customerMembers)
      .leftJoin(schema.customers, eq(schema.customerMembers.customerId, schema.customers.id))
      .leftJoin(schema.memberLevels, eq(schema.customerMembers.levelId, schema.memberLevels.id))
      .where(
        and(
          eq(schema.customerMembers.enterpriseId, enterpriseId),
          eq(schema.customerMembers.isDeleted, false),
        ),
      );

    if (options?.levelId) {
      query = query.where(eq(schema.customerMembers.levelId, options.levelId));
    }

    return query.orderBy(desc(schema.customerMembers.totalConsumption));
  }

  async findMemberByCustomerId(customerId: number, enterpriseId: number) {
    const [result] = await this.db
      .select({
        member: schema.customerMembers,
        customer: schema.customers,
        level: schema.memberLevels,
      })
      .from(schema.customerMembers)
      .leftJoin(schema.customers, eq(schema.customerMembers.customerId, schema.customers.id))
      .leftJoin(schema.memberLevels, eq(schema.customerMembers.levelId, schema.memberLevels.id))
      .where(
        and(
          eq(schema.customerMembers.customerId, customerId),
          eq(schema.customerMembers.enterpriseId, enterpriseId),
          eq(schema.customerMembers.isDeleted, false),
        ),
      );

    return result;
  }

  async createMember(enterpriseId: number, dto: CreateCustomerMemberDto) {
    // 检查客户是否存在
    const [customer] = await this.db
      .select()
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.id, dto.customerId),
          eq(schema.customers.enterpriseId, enterpriseId),
        ),
      );

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 获取默认等级
    let levelId = dto.levelId;
    if (!levelId) {
      const [defaultLevel] = await this.db
        .select()
        .from(schema.memberLevels)
        .where(
          and(
            eq(schema.memberLevels.enterpriseId, enterpriseId),
            eq(schema.memberLevels.isDefault, true),
            eq(schema.memberLevels.isDeleted, false),
          ),
        );
      levelId = defaultLevel?.id;
    }

    // 生成会员卡号
    const memberNo = dto.memberNo || await this.generateMemberNo(enterpriseId);

    const [member] = await this.db
      .insert(schema.customerMembers)
      .values({
        enterpriseId,
        customerId: dto.customerId,
        memberNo,
        levelId,
        remark: dto.remark,
      })
      .returning();

    return member;
  }

  async updateMember(customerId: number, enterpriseId: number, dto: Partial<CreateCustomerMemberDto>) {
    const [member] = await this.db
      .update(schema.customerMembers)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.customerMembers.customerId, customerId),
          eq(schema.customerMembers.enterpriseId, enterpriseId),
        ),
      )
      .returning();

    return member;
  }

  async deleteMember(customerId: number, enterpriseId: number) {
    const [member] = await this.db
      .update(schema.customerMembers)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(
        and(
          eq(schema.customerMembers.customerId, customerId),
          eq(schema.customerMembers.enterpriseId, enterpriseId),
        ),
      )
      .returning();

    return member;
  }

  // ==================== 积分管理 ====================

  async addPoints(enterpriseId: number, dto: PointsOperationDto) {
    // 获取会员信息
    const [member] = await this.db
      .select()
      .from(schema.customerMembers)
      .where(
        and(
          eq(schema.customerMembers.customerId, dto.customerId),
          eq(schema.customerMembers.enterpriseId, enterpriseId),
        ),
      );

    if (!member) {
      throw new NotFoundException('会员不存在');
    }

    const beforePoints = member.availablePoints;
    const afterPoints = beforePoints + dto.points;

    // 创建积分记录
    const [record] = await this.db
      .insert(schema.pointsRecords)
      .values({
        enterpriseId,
        ...dto,
        beforePoints,
        afterPoints,
      })
      .returning();

    // 更新会员积分
    const updateData: any = {
      availablePoints: afterPoints,
      updatedAt: new Date(),
    };

    if (dto.points > 0) {
      updateData.totalPoints = member.totalPoints + dto.points;
    } else {
      updateData.usedPoints = member.usedPoints + Math.abs(dto.points);
    }

    await this.db
      .update(schema.customerMembers)
      .set(updateData)
      .where(eq(schema.customerMembers.id, member.id));

    // 检查是否需要升级会员等级
    await this.checkAndUpgradeLevel(member.id, enterpriseId);

    return record;
  }

  async getPointsRecords(customerId: number, enterpriseId: number, options?: { type?: string; limit?: number }) {
    let query = this.db
      .select()
      .from(schema.pointsRecords)
      .where(
        and(
          eq(schema.pointsRecords.customerId, customerId),
          eq(schema.pointsRecords.enterpriseId, enterpriseId),
        ),
      );

    if (options?.type) {
      query = query.where(eq(schema.pointsRecords.type, options.type));
    }

    query = query.orderBy(desc(schema.pointsRecords.createdAt));

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return query;
  }

  // ==================== 辅助方法 ====================

  private async generateMemberNo(enterpriseId: number): Promise<string> {
    const prefix = 'M';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}${enterpriseId}${timestamp}${random}`;
  }

  private async checkAndUpgradeLevel(memberId: number, enterpriseId: number) {
    const [member] = await this.db
      .select()
      .from(schema.customerMembers)
      .where(eq(schema.customerMembers.id, memberId));

    if (!member) return;

    // 根据积分查找合适的等级
    const [newLevel] = await this.db
      .select()
      .from(schema.memberLevels)
      .where(
        and(
          eq(schema.memberLevels.enterpriseId, enterpriseId),
          eq(schema.memberLevels.isDeleted, false),
          sql`${schema.memberLevels.minPoints} <= ${member.totalPoints}`,
          sql`(${schema.memberLevels.maxPoints} IS NULL OR ${schema.memberLevels.maxPoints} >= ${member.totalPoints})`,
        ),
      )
      .orderBy(desc(schema.memberLevels.minPoints))
      .limit(1);

    if (newLevel && newLevel.id !== member.levelId) {
      await this.db
        .update(schema.customerMembers)
        .set({ levelId: newLevel.id, updatedAt: new Date() })
        .where(eq(schema.customerMembers.id, memberId));
    }
  }

  // 订单完成时更新会员消费统计
  async updateMemberConsumption(
    customerId: number,
    enterpriseId: number,
    orderAmount: number,
    pointsEarned: number,
  ) {
    const memberInfo = await this.findMemberByCustomerId(customerId, enterpriseId);

    if (!memberInfo) {
      // 自动创建会员
      await this.createMember(enterpriseId, { customerId });
    }

    const [member] = await this.db
      .select()
      .from(schema.customerMembers)
      .where(
        and(
          eq(schema.customerMembers.customerId, customerId),
          eq(schema.customerMembers.enterpriseId, enterpriseId),
        ),
      );

    if (member) {
      await this.db
        .update(schema.customerMembers)
        .set({
          totalConsumption: sql`${schema.customerMembers.totalConsumption} + ${orderAmount}`,
          orderCount: sql`${schema.customerMembers.orderCount} + 1`,
          lastConsumptionAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.customerMembers.id, member.id));

      // 添加消费积分
      if (pointsEarned > 0) {
        await this.addPoints(enterpriseId, {
          customerId,
          points: pointsEarned,
          type: 'earn',
          sourceType: 'order',
          description: `消费获得积分：${orderAmount}元`,
        });
      }

      // 检查等级升级
      await this.checkAndUpgradeLevel(member.id, enterpriseId);
    }
  }
}
