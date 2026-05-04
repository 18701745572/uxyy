import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { count, desc, eq, and, like } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { DRIZZLE_DB } from '../database/database.constants';
import type { AppDrizzleDb } from '../database/database.module';

function requireEnterpriseId(enterpriseId: number | undefined): number {
  if (enterpriseId == null || Number.isNaN(enterpriseId)) {
    throw new ForbiddenException('当前会话未绑定企业，无法访问客户数据');
  }
  return enterpriseId;
}

export interface CreateCustomerDto {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  remark?: string;
  tags?: string[];
}

export interface UpdateCustomerDto {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  remark?: string;
  tags?: string[];
}

export interface CreateLeadDto {
  customerId: number;
  title: string;
  amount?: number;
  stage?: string;
  expectedCloseDate?: string;
  remark?: string;
}

export interface CreateFollowUpDto {
  customerId: number;
  content: string;
  type?: string;
}

@Injectable()
export class CrmService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  // ========== 客户管理 ==========
  async findCustomersPage(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    keyword?: string;
    tag?: string;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    let whereClause = eq(schema.customers.enterpriseId, eid);

    if (params.keyword) {
      whereClause = and(
        whereClause,
        like(schema.customers.name, `%${params.keyword}%`),
      )!;
    }

    const [totalRows] = await this.db
      .select({ c: count() })
      .from(schema.customers)
      .where(whereClause);

    const total = Number(totalRows?.c ?? 0);

    const rows = await this.db
      .select()
      .from(schema.customers)
      .where(whereClause)
      .orderBy(desc(schema.customers.updatedAt))
      .limit(params.pageSize)
      .offset(offset);

    return {
      list: rows.map((r) => ({
        id: r.id,
        enterpriseId: r.enterpriseId,
        name: r.name,
        phone: r.phone,
        remark: r.remark,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async getCustomerById(enterpriseId: number | undefined, customerId: number) {
    const eid = requireEnterpriseId(enterpriseId);

    const [customer] = await this.db
      .select()
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.id, customerId),
          eq(schema.customers.enterpriseId, eid),
        ),
      )
      .limit(1);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return {
      id: customer.id,
      enterpriseId: customer.enterpriseId,
      name: customer.name,
      phone: customer.phone,
      remark: customer.remark,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  }

  async createCustomer(
    enterpriseId: number | undefined,
    dto: CreateCustomerDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    const [customer] = await this.db
      .insert(schema.customers)
      .values({
        enterpriseId: eid,
        name: dto.name,
        phone: dto.phone ?? null,
        remark: dto.remark ?? null,
      })
      .returning();

    return customer;
  }

  async updateCustomer(
    enterpriseId: number | undefined,
    customerId: number,
    dto: UpdateCustomerDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    const [existing] = await this.db
      .select()
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.id, customerId),
          eq(schema.customers.enterpriseId, eid),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    const [updated] = await this.db
      .update(schema.customers)
      .set({
        name: dto.name ?? existing.name,
        phone: dto.phone ?? existing.phone,
        remark: dto.remark ?? existing.remark,
        updatedAt: new Date(),
      })
      .where(eq(schema.customers.id, customerId))
      .returning();

    return updated;
  }

  async deleteCustomer(enterpriseId: number | undefined, customerId: number) {
    const eid = requireEnterpriseId(enterpriseId);

    const [existing] = await this.db
      .select()
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.id, customerId),
          eq(schema.customers.enterpriseId, eid),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    await this.db
      .delete(schema.customers)
      .where(eq(schema.customers.id, customerId));

    return { success: true };
  }

  // ========== 商机管理 ==========
  async findLeadsPage(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    customerId?: number;
    stage?: string;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    // 简化实现，实际应该查询 leads 表
    return {
      list: [],
      total: 0,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  // ========== 跟进记录 ==========
  async findFollowUps(params: {
    enterpriseId?: number;
    customerId: number;
    page: number;
    pageSize: number;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);

    // 简化实现，实际应该查询 follow_ups 表
    return {
      list: [],
      total: 0,
      page: params.page,
      pageSize: params.pageSize,
    };
  }
}
