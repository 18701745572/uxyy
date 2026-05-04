import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, like, sql } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { DRIZZLE_DB } from '../database/database.constants';
import type { AppDrizzleDb } from '../database/database.module';

export interface CreateOpportunityDto {
  customerId: number;
  name: string;
  amount: number;
  stage: 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  expectedCloseDate?: string;
  probability?: number;
  remark?: string;
}

@Injectable()
export class OpportunityService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  // ========== 创建商机 ==========
  async create(enterpriseId: number | undefined, dto: CreateOpportunityDto) {
    if (!enterpriseId) {
      throw new ForbiddenException('Enterprise context required');
    }

    // 验证客户是否存在
    const [customer] = await this.db
      .select()
      .from(schema.customers)
      .where(and(
        eq(schema.customers.id, dto.customerId),
        eq(schema.customers.enterpriseId, enterpriseId)
      ))
      .limit(1);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const [opportunity] = await this.db
      .insert(schema.opportunities)
      .values({
        enterpriseId,
        customerId: dto.customerId,
        name: dto.name,
        amount: String(dto.amount),
        stage: dto.stage,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null,
        probability: dto.probability ?? 0,
        remark: dto.remark ?? null,
      })
      .returning();

    return opportunity;
  }

  // ========== 获取商机列表 ==========
  async findAll(enterpriseId: number | undefined, options: { 
    page?: number; 
    pageSize?: number; 
    stage?: string;
    search?: string;
  } = {}) {
    if (!enterpriseId) {
      throw new ForbiddenException('Enterprise context required');
    }

    const { page = 1, pageSize = 20, stage, search } = options;
    const offset = (page - 1) * pageSize;

    let whereClause = eq(schema.opportunities.enterpriseId, enterpriseId);

    if (stage) {
      whereClause = and(whereClause, eq(schema.opportunities.stage, stage));
    }

    if (search) {
      whereClause = and(whereClause, like(schema.opportunities.name, `%${search}%`));
    }

    const [data, countResult] = await Promise.all([
      this.db
        .select({
          opportunity: schema.opportunities,
          customer: schema.customers,
        })
        .from(schema.opportunities)
        .leftJoin(schema.customers, eq(schema.opportunities.customerId, schema.customers.id))
        .where(whereClause)
        .orderBy(desc(schema.opportunities.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.opportunities)
        .where(whereClause),
    ]);

    return {
      data: data.map(({ opportunity, customer }) => ({
        id: opportunity.id,
        name: opportunity.name,
        amount: Number(opportunity.amount),
        stage: opportunity.stage,
        expectedCloseDate: opportunity.expectedCloseDate,
        probability: opportunity.probability,
        remark: opportunity.remark,
        customer: customer ? {
          id: customer.id,
          name: customer.name,
        } : null,
        createdAt: opportunity.createdAt,
        updatedAt: opportunity.updatedAt,
      })),
      pagination: {
        page,
        pageSize,
        total: countResult[0]?.count || 0,
      },
    };
  }

  // ========== 获取商机详情 ==========
  async findById(enterpriseId: number | undefined, id: number) {
    if (!enterpriseId) {
      throw new ForbiddenException('Enterprise context required');
    }

    const [result] = await this.db
      .select({
        opportunity: schema.opportunities,
        customer: schema.customers,
      })
      .from(schema.opportunities)
      .leftJoin(schema.customers, eq(schema.opportunities.customerId, schema.customers.id))
      .where(and(
        eq(schema.opportunities.id, id),
        eq(schema.opportunities.enterpriseId, enterpriseId)
      ))
      .limit(1);

    if (!result) {
      throw new NotFoundException('Opportunity not found');
    }

    const { opportunity, customer } = result;

    return {
      id: opportunity.id,
      name: opportunity.name,
      amount: Number(opportunity.amount),
      stage: opportunity.stage,
      expectedCloseDate: opportunity.expectedCloseDate,
      probability: opportunity.probability,
      remark: opportunity.remark,
      customer: customer ? {
        id: customer.id,
        name: customer.name,
      } : null,
      createdAt: opportunity.createdAt,
      updatedAt: opportunity.updatedAt,
    };
  }

  // ========== 更新商机 ==========
  async update(enterpriseId: number | undefined, id: number, dto: Partial<CreateOpportunityDto>) {
    if (!enterpriseId) {
      throw new ForbiddenException('Enterprise context required');
    }

    const [existing] = await this.db
      .select()
      .from(schema.opportunities)
      .where(and(
        eq(schema.opportunities.id, id),
        eq(schema.opportunities.enterpriseId, enterpriseId)
      ))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Opportunity not found');
    }

    const [updated] = await this.db
      .update(schema.opportunities)
      .set({
        name: dto.name ?? existing.name,
        amount: dto.amount !== undefined ? String(dto.amount) : existing.amount,
        stage: dto.stage ?? existing.stage,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : existing.expectedCloseDate,
        probability: dto.probability ?? existing.probability,
        remark: dto.remark ?? existing.remark,
        updatedAt: new Date(),
      })
      .where(eq(schema.opportunities.id, id))
      .returning();

    return updated;
  }

  // ========== 删除商机 ==========
  async delete(enterpriseId: number | undefined, id: number) {
    if (!enterpriseId) {
      throw new ForbiddenException('Enterprise context required');
    }

    const [existing] = await this.db
      .select()
      .from(schema.opportunities)
      .where(and(
        eq(schema.opportunities.id, id),
        eq(schema.opportunities.enterpriseId, enterpriseId)
      ))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Opportunity not found');
    }

    await this.db
      .delete(schema.opportunities)
      .where(eq(schema.opportunities.id, id));

    return { success: true };
  }

  // ========== 获取销售漏斗统计 ==========
  async getFunnelStats(enterpriseId: number | undefined) {
    if (!enterpriseId) {
      throw new ForbiddenException('Enterprise context required');
    }

    const stats = await this.db
      .select({
        stage: schema.opportunities.stage,
        count: sql<number>`count(*)::int`,
        totalAmount: sql<string>`coalesce(sum(${schema.opportunities.amount}), '0')`,
      })
      .from(schema.opportunities)
      .where(eq(schema.opportunities.enterpriseId, enterpriseId))
      .groupBy(schema.opportunities.stage);

    return stats.map(s => ({
      stage: s.stage,
      count: s.count,
      totalAmount: Number(s.totalAmount),
    }));
  }
}
