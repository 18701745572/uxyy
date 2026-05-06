import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { DRIZZLE_DB } from '../database/database.constants';
import type { AppDrizzleDb } from '../database/database.module';
import type { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import type { CreateFollowUpDto, UpdateFollowUpDto } from './dto/follow-up.dto';
import type {
  CreateOpportunityDto,
  UpdateOpportunityDto,
} from './dto/opportunity.dto';
import type {
  CreateCustomerCategoryDto,
  UpdateCustomerCategoryDto,
} from './dto/customer-category.dto';

function requireEnterpriseId(enterpriseId: number | undefined): number {
  if (enterpriseId == null || Number.isNaN(enterpriseId)) {
    throw new ForbiddenException('当前会话未绑定企业，无法访问客户数据');
  }
  return enterpriseId;
}

function mapCustomerRow(row: typeof schema.customers.$inferSelect) {
  return {
    id: row.id,
    enterpriseId: row.enterpriseId,
    name: row.name,
    phone: row.phone ?? null,
    contactPerson: row.contactPerson ?? null,
    address: row.address ?? null,
    type: row.type ?? 'enterprise',
    level: row.level ?? 'regular',
    industry: row.industry ?? null,
    tags: row.tags ?? null,
    source: row.source ?? 'manual',
    assignedTo: row.assignedTo ?? null,
    creditLimit: row.creditLimit ? Number(row.creditLimit) : null,
    remark: row.remark ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapFollowUpRow(row: typeof schema.followUpRecords.$inferSelect) {
  return {
    id: row.id,
    customerId: row.customerId,
    enterpriseId: row.enterpriseId,
    content: row.content,
    type: row.type ?? 'text',
    attachmentUrls: row.attachmentUrls ?? null,
    nextFollowUpAt: row.nextFollowUpAt?.toISOString() ?? null,
    createdBy: row.createdBy ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class CrmService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  // ─── Duplicate detection ────────────────────────────────────────

  async checkDuplicate(
    enterpriseId: number,
    name: string,
    phone?: string,
  ): Promise<number | null> {
    const conditions = [
      eq(schema.customers.enterpriseId, enterpriseId),
      eq(schema.customers.name, name),
      eq(schema.customers.isDeleted, false),
    ];
    if (phone) {
      conditions.push(eq(schema.customers.phone, phone));
    }

    const [existing] = await this.db
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(and(...conditions))
      .limit(1);

    return existing ? existing.id : null;
  }

  // ─── Customer CRUD ──────────────────────────────────────────────

  async findPage(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    type?: string;
    level?: string;
    industry?: string;
    search?: string;
    isDeleted?: boolean;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    const whereConditions = [
      eq(schema.customers.enterpriseId, eid),
      params.isDeleted
        ? eq(schema.customers.isDeleted, true)
        : eq(schema.customers.isDeleted, false),
    ];

    if (params.type) {
      whereConditions.push(eq(schema.customers.type, params.type));
    }
    if (params.level) {
      whereConditions.push(eq(schema.customers.level, params.level));
    }
    if (params.industry) {
      whereConditions.push(eq(schema.customers.industry, params.industry));
    }
    if (params.search) {
      const pattern = `%${params.search}%`;
      whereConditions.push(
        or(
          ilike(schema.customers.name, pattern),
          ilike(schema.customers.phone, pattern),
          ilike(schema.customers.contactPerson, pattern),
        )!,
      );
    }

    const where = and(...whereConditions);

    const [totalRows] = await this.db
      .select({ c: count() })
      .from(schema.customers)
      .where(where);

    const total = Number(totalRows?.c ?? 0);

    const rows = await this.db
      .select()
      .from(schema.customers)
      .where(where)
      .orderBy(desc(schema.customers.updatedAt))
      .limit(params.pageSize)
      .offset(offset);

    return {
      items: rows.map(mapCustomerRow),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async create(enterpriseId: number | undefined, dto: CreateCustomerDto) {
    const eid = requireEnterpriseId(enterpriseId);

    if (!dto.force) {
      const dupId = await this.checkDuplicate(eid, dto.name, dto.phone);
      if (dupId !== null) {
        throw new ConflictException({
          message: '疑似重复客户：同企业下已存在相同名称和电话的客户',
          duplicateCustomerId: dupId,
        });
      }
    }

    const [inserted] = await this.db
      .insert(schema.customers)
      .values({
        enterpriseId: eid,
        name: dto.name,
        phone: dto.phone ?? null,
        contactPerson: dto.contactPerson ?? null,
        address: dto.address ?? null,
        type: dto.type ?? 'enterprise',
        level: dto.level ?? 'regular',
        industry: dto.industry ?? null,
        tags: dto.tags ?? null,
        source: dto.source ?? 'manual',
        assignedTo: dto.assignedTo ?? null,
        creditLimit: dto.creditLimit != null ? String(dto.creditLimit) : null,
        remark: dto.remark ?? null,
      })
      .returning();

    if (!inserted) {
      throw new NotFoundException('创建失败');
    }
    return mapCustomerRow(inserted);
  }

  async findOne(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const [row] = await this.db
      .select()
      .from(schema.customers)
      .where(
        and(eq(schema.customers.id, id), eq(schema.customers.isDeleted, false)),
      )
      .limit(1);

    if (!row || row.enterpriseId !== eid) {
      throw new NotFoundException('客户不存在');
    }
    return mapCustomerRow(row);
  }

  async update(
    id: number,
    enterpriseId: number | undefined,
    dto: UpdateCustomerDto,
  ) {
    await this.findOne(id, enterpriseId);
    const eid = requireEnterpriseId(enterpriseId);

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.phone !== undefined) patch.phone = dto.phone || null;
    if (dto.contactPerson !== undefined)
      patch.contactPerson = dto.contactPerson || null;
    if (dto.address !== undefined) patch.address = dto.address || null;
    if (dto.type !== undefined) patch.type = dto.type;
    if (dto.level !== undefined) patch.level = dto.level;
    if (dto.industry !== undefined) patch.industry = dto.industry || null;
    if (dto.tags !== undefined) patch.tags = dto.tags || null;
    if (dto.source !== undefined) patch.source = dto.source;
    if (dto.assignedTo !== undefined) patch.assignedTo = dto.assignedTo || null;
    if (dto.creditLimit !== undefined)
      patch.creditLimit =
        dto.creditLimit != null ? String(dto.creditLimit) : null;
    if (dto.remark !== undefined) patch.remark = dto.remark || null;

    const [updated] = await this.db
      .update(schema.customers)
      .set(patch)
      .where(eq(schema.customers.id, id))
      .returning();

    if (!updated || updated.enterpriseId !== eid) {
      throw new NotFoundException('客户不存在');
    }
    return mapCustomerRow(updated);
  }

  async remove(id: number, enterpriseId: number | undefined) {
    await this.findOne(id, enterpriseId);
    const eid = requireEnterpriseId(enterpriseId);

    const [deleted] = await this.db
      .update(schema.customers)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(
        and(
          eq(schema.customers.id, id),
          eq(schema.customers.enterpriseId, eid),
        ),
      )
      .returning({ id: schema.customers.id });

    if (!deleted) {
      throw new NotFoundException('客户不存在');
    }
    return { ok: true, id: deleted.id, enterpriseId: eid };
  }

  // ─── Follow-up records ──────────────────────────────────────────

  async findFollowUps(params: {
    customerId: number;
    enterpriseId?: number;
    page: number;
    pageSize: number;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    const where = and(
      eq(schema.followUpRecords.customerId, params.customerId),
      eq(schema.followUpRecords.enterpriseId, eid),
    );

    const [totalRows] = await this.db
      .select({ c: count() })
      .from(schema.followUpRecords)
      .where(where);

    const total = Number(totalRows?.c ?? 0);

    const rows = await this.db
      .select()
      .from(schema.followUpRecords)
      .where(where)
      .orderBy(desc(schema.followUpRecords.createdAt))
      .limit(params.pageSize)
      .offset(offset);

    return {
      items: rows.map(mapFollowUpRow),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async createFollowUp(
    customerId: number,
    enterpriseId: number | undefined,
    userId: number | undefined,
    dto: CreateFollowUpDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    await this.findOne(customerId, eid);

    const [inserted] = await this.db
      .insert(schema.followUpRecords)
      .values({
        customerId,
        enterpriseId: eid,
        content: dto.content,
        type: dto.type ?? 'text',
        attachmentUrls: dto.attachmentUrls ?? null,
        nextFollowUpAt: dto.nextFollowUpAt
          ? new Date(dto.nextFollowUpAt)
          : null,
        createdBy: userId ?? null,
      })
      .returning();

    if (!inserted) {
      throw new NotFoundException('创建跟进记录失败');
    }
    return mapFollowUpRow(inserted);
  }

  async updateFollowUp(
    id: number,
    customerId: number,
    enterpriseId: number | undefined,
    dto: UpdateFollowUpDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    const [existing] = await this.db
      .select()
      .from(schema.followUpRecords)
      .where(
        and(
          eq(schema.followUpRecords.id, id),
          eq(schema.followUpRecords.customerId, customerId),
          eq(schema.followUpRecords.enterpriseId, eid),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('跟进记录不存在');
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.content !== undefined) patch.content = dto.content;
    if (dto.type !== undefined) patch.type = dto.type;
    if (dto.attachmentUrls !== undefined)
      patch.attachmentUrls = dto.attachmentUrls || null;
    if (dto.nextFollowUpAt !== undefined)
      patch.nextFollowUpAt = dto.nextFollowUpAt
        ? new Date(dto.nextFollowUpAt)
        : null;

    const [updated] = await this.db
      .update(schema.followUpRecords)
      .set(patch)
      .where(eq(schema.followUpRecords.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException('跟进记录不存在');
    }
    return mapFollowUpRow(updated);
  }

  async removeFollowUp(
    id: number,
    customerId: number,
    enterpriseId: number | undefined,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    const [deleted] = await this.db
      .delete(schema.followUpRecords)
      .where(
        and(
          eq(schema.followUpRecords.id, id),
          eq(schema.followUpRecords.customerId, customerId),
          eq(schema.followUpRecords.enterpriseId, eid),
        ),
      )
      .returning({ id: schema.followUpRecords.id });

    if (!deleted) {
      throw new NotFoundException('跟进记录不存在');
    }
    return { ok: true, id: deleted.id };
  }

  // ─── Stats ──────────────────────────────────────────────────────

  async getCustomerStats(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    await this.findOne(id, eid);

    const [followUpCountRow] = await this.db
      .select({ c: count() })
      .from(schema.followUpRecords)
      .where(
        and(
          eq(schema.followUpRecords.customerId, id),
          eq(schema.followUpRecords.enterpriseId, eid),
        ),
      );

    const [lastFollowUpRow] = await this.db
      .select({ lastAt: schema.followUpRecords.createdAt })
      .from(schema.followUpRecords)
      .where(
        and(
          eq(schema.followUpRecords.customerId, id),
          eq(schema.followUpRecords.enterpriseId, eid),
        ),
      )
      .orderBy(desc(schema.followUpRecords.createdAt))
      .limit(1);

    const followUpCount = Number(followUpCountRow?.c ?? 0);
    const lastFollowUpAt = lastFollowUpRow?.lastAt?.toISOString() ?? null;
    let daysSinceLastFollowUp: number | null = null;
    if (lastFollowUpAt) {
      daysSinceLastFollowUp = Math.floor(
        (Date.now() - new Date(lastFollowUpAt).getTime()) /
          (1000 * 60 * 60 * 24),
      );
    }

    return {
      customerId: id,
      followUpCount,
      lastFollowUpAt,
      daysSinceLastFollowUp,
    };
  }

  // ─── Opportunities ──────────────────────────────────────────────

  async findOpportunities(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    customerId?: number;
    status?: string;
    assignedTo?: number;
    search?: string;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    const whereConditions = [
      eq(schema.opportunities.enterpriseId, eid),
      eq(schema.opportunities.isDeleted, false),
    ];

    if (params.customerId) {
      whereConditions.push(
        eq(schema.opportunities.customerId, params.customerId),
      );
    }
    if (params.status) {
      whereConditions.push(eq(schema.opportunities.status, params.status));
    }
    if (params.assignedTo) {
      whereConditions.push(
        eq(schema.opportunities.assignedTo, params.assignedTo),
      );
    }
    if (params.search) {
      const pattern = `%${params.search}%`;
      whereConditions.push(ilike(schema.opportunities.name, pattern));
    }

    const where = and(...whereConditions);

    const [totalRows] = await this.db
      .select({ c: count() })
      .from(schema.opportunities)
      .where(where);

    const total = Number(totalRows?.c ?? 0);

    const rows = await this.db
      .select({
        opportunity: schema.opportunities,
        customerName: schema.customers.name,
      })
      .from(schema.opportunities)
      .leftJoin(
        schema.customers,
        eq(schema.opportunities.customerId, schema.customers.id),
      )
      .where(where)
      .orderBy(desc(schema.opportunities.updatedAt))
      .limit(params.pageSize)
      .offset(offset);

    return {
      items: rows.map(({ opportunity, customerName }) => ({
        id: opportunity.id,
        enterpriseId: opportunity.enterpriseId,
        customerId: opportunity.customerId,
        customerName: customerName ?? null,
        name: opportunity.name,
        description: opportunity.description ?? null,
        status: opportunity.status,
        estimatedAmount: opportunity.estimatedAmount
          ? Number(opportunity.estimatedAmount)
          : null,
        actualAmount: opportunity.actualAmount
          ? Number(opportunity.actualAmount)
          : null,
        expectedCloseAt: opportunity.expectedCloseAt?.toISOString() ?? null,
        actualCloseAt: opportunity.actualCloseAt?.toISOString() ?? null,
        assignedTo: opportunity.assignedTo ?? null,
        probability: opportunity.probability ?? 0,
        remark: opportunity.remark ?? null,
        createdAt: opportunity.createdAt.toISOString(),
        updatedAt: opportunity.updatedAt.toISOString(),
      })),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async createOpportunity(
    enterpriseId: number | undefined,
    dto: CreateOpportunityDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    await this.findOne(dto.customerId, eid);

    const [inserted] = await this.db
      .insert(schema.opportunities)
      .values({
        enterpriseId: eid,
        customerId: dto.customerId,
        name: dto.name,
        description: dto.description ?? null,
        status: dto.status ?? 'potential',
        estimatedAmount:
          dto.estimatedAmount != null ? String(dto.estimatedAmount) : null,
        actualAmount:
          dto.actualAmount != null ? String(dto.actualAmount) : null,
        expectedCloseAt: dto.expectedCloseAt
          ? new Date(dto.expectedCloseAt)
          : null,
        actualCloseAt: dto.actualCloseAt ? new Date(dto.actualCloseAt) : null,
        assignedTo: dto.assignedTo ?? null,
        probability: dto.probability ?? 0,
        remark: dto.remark ?? null,
      })
      .returning();

    if (!inserted) {
      throw new NotFoundException('创建商机失败');
    }

    return {
      id: inserted.id,
      enterpriseId: inserted.enterpriseId,
      customerId: inserted.customerId,
      name: inserted.name,
      description: inserted.description ?? null,
      status: inserted.status,
      estimatedAmount: inserted.estimatedAmount
        ? Number(inserted.estimatedAmount)
        : null,
      actualAmount: inserted.actualAmount
        ? Number(inserted.actualAmount)
        : null,
      expectedCloseAt: inserted.expectedCloseAt?.toISOString() ?? null,
      actualCloseAt: inserted.actualCloseAt?.toISOString() ?? null,
      assignedTo: inserted.assignedTo ?? null,
      probability: inserted.probability ?? 0,
      remark: inserted.remark ?? null,
      createdAt: inserted.createdAt.toISOString(),
      updatedAt: inserted.updatedAt.toISOString(),
    };
  }

  async findOneOpportunity(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const [row] = await this.db
      .select({
        opportunity: schema.opportunities,
        customerName: schema.customers.name,
      })
      .from(schema.opportunities)
      .leftJoin(
        schema.customers,
        eq(schema.opportunities.customerId, schema.customers.id),
      )
      .where(
        and(
          eq(schema.opportunities.id, id),
          eq(schema.opportunities.isDeleted, false),
        ),
      )
      .limit(1);

    if (!row || row.opportunity.enterpriseId !== eid) {
      throw new NotFoundException('商机不存在');
    }

    const { opportunity, customerName } = row;
    return {
      id: opportunity.id,
      enterpriseId: opportunity.enterpriseId,
      customerId: opportunity.customerId,
      customerName: customerName ?? null,
      name: opportunity.name,
      description: opportunity.description ?? null,
      status: opportunity.status,
      estimatedAmount: opportunity.estimatedAmount
        ? Number(opportunity.estimatedAmount)
        : null,
      actualAmount: opportunity.actualAmount
        ? Number(opportunity.actualAmount)
        : null,
      expectedCloseAt: opportunity.expectedCloseAt?.toISOString() ?? null,
      actualCloseAt: opportunity.actualCloseAt?.toISOString() ?? null,
      assignedTo: opportunity.assignedTo ?? null,
      probability: opportunity.probability ?? 0,
      remark: opportunity.remark ?? null,
      createdAt: opportunity.createdAt.toISOString(),
      updatedAt: opportunity.updatedAt.toISOString(),
    };
  }

  async updateOpportunity(
    id: number,
    enterpriseId: number | undefined,
    dto: UpdateOpportunityDto,
  ) {
    await this.findOneOpportunity(id, enterpriseId);
    const eid = requireEnterpriseId(enterpriseId);

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.description !== undefined)
      patch.description = dto.description || null;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.estimatedAmount !== undefined) {
      patch.estimatedAmount =
        dto.estimatedAmount != null ? String(dto.estimatedAmount) : null;
    }
    if (dto.actualAmount !== undefined) {
      patch.actualAmount =
        dto.actualAmount != null ? String(dto.actualAmount) : null;
    }
    if (dto.expectedCloseAt !== undefined) {
      patch.expectedCloseAt = dto.expectedCloseAt
        ? new Date(dto.expectedCloseAt)
        : null;
    }
    if (dto.actualCloseAt !== undefined) {
      patch.actualCloseAt = dto.actualCloseAt
        ? new Date(dto.actualCloseAt)
        : null;
    }
    if (dto.assignedTo !== undefined) patch.assignedTo = dto.assignedTo || null;
    if (dto.probability !== undefined) patch.probability = dto.probability;
    if (dto.remark !== undefined) patch.remark = dto.remark || null;

    const [updated] = await this.db
      .update(schema.opportunities)
      .set(patch)
      .where(eq(schema.opportunities.id, id))
      .returning();

    if (!updated || updated.enterpriseId !== eid) {
      throw new NotFoundException('商机不存在');
    }

    return {
      id: updated.id,
      enterpriseId: updated.enterpriseId,
      customerId: updated.customerId,
      name: updated.name,
      description: updated.description ?? null,
      status: updated.status,
      estimatedAmount: updated.estimatedAmount
        ? Number(updated.estimatedAmount)
        : null,
      actualAmount: updated.actualAmount ? Number(updated.actualAmount) : null,
      expectedCloseAt: updated.expectedCloseAt?.toISOString() ?? null,
      actualCloseAt: updated.actualCloseAt?.toISOString() ?? null,
      assignedTo: updated.assignedTo ?? null,
      probability: updated.probability ?? 0,
      remark: updated.remark ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async removeOpportunity(id: number, enterpriseId: number | undefined) {
    await this.findOneOpportunity(id, enterpriseId);
    const eid = requireEnterpriseId(enterpriseId);

    const [deleted] = await this.db
      .update(schema.opportunities)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(
        and(
          eq(schema.opportunities.id, id),
          eq(schema.opportunities.enterpriseId, eid),
        ),
      )
      .returning({ id: schema.opportunities.id });

    if (!deleted) {
      throw new NotFoundException('商机不存在');
    }
    return { ok: true, id: deleted.id, enterpriseId: eid };
  }

  // ─── Customer Categories ────────────────────────────────────────

  async findCategories(params: { enterpriseId?: number; type?: string }) {
    const eid = requireEnterpriseId(params.enterpriseId);

    const whereConditions = [
      eq(schema.customerCategories.enterpriseId, eid),
      eq(schema.customerCategories.isDeleted, false),
    ];

    if (params.type) {
      whereConditions.push(eq(schema.customerCategories.type, params.type));
    }

    const where = and(...whereConditions);

    const rows = await this.db
      .select()
      .from(schema.customerCategories)
      .where(where)
      .orderBy(asc(schema.customerCategories.sortOrder));

    return rows.map((row) => ({
      id: row.id,
      enterpriseId: row.enterpriseId,
      name: row.name,
      type: row.type,
      description: row.description ?? null,
      color: row.color ?? '#1890ff',
      sortOrder: row.sortOrder ?? 0,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async createCategory(
    enterpriseId: number | undefined,
    dto: CreateCustomerCategoryDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    const [inserted] = await this.db
      .insert(schema.customerCategories)
      .values({
        enterpriseId: eid,
        name: dto.name,
        type: dto.type ?? 'custom',
        description: dto.description ?? null,
        color: dto.color ?? '#1890ff',
        sortOrder: dto.sortOrder ?? 0,
      })
      .returning();

    if (!inserted) {
      throw new NotFoundException('创建客户分类失败');
    }

    return {
      id: inserted.id,
      enterpriseId: inserted.enterpriseId,
      name: inserted.name,
      type: inserted.type,
      description: inserted.description ?? null,
      color: inserted.color ?? '#1890ff',
      sortOrder: inserted.sortOrder ?? 0,
      createdAt: inserted.createdAt.toISOString(),
      updatedAt: inserted.updatedAt.toISOString(),
    };
  }

  async findOneCategory(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const [row] = await this.db
      .select()
      .from(schema.customerCategories)
      .where(
        and(
          eq(schema.customerCategories.id, id),
          eq(schema.customerCategories.isDeleted, false),
        ),
      )
      .limit(1);

    if (!row || row.enterpriseId !== eid) {
      throw new NotFoundException('客户分类不存在');
    }

    return {
      id: row.id,
      enterpriseId: row.enterpriseId,
      name: row.name,
      type: row.type,
      description: row.description ?? null,
      color: row.color ?? '#1890ff',
      sortOrder: row.sortOrder ?? 0,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async updateCategory(
    id: number,
    enterpriseId: number | undefined,
    dto: UpdateCustomerCategoryDto,
  ) {
    await this.findOneCategory(id, enterpriseId);
    const eid = requireEnterpriseId(enterpriseId);

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.type !== undefined) patch.type = dto.type;
    if (dto.description !== undefined)
      patch.description = dto.description || null;
    if (dto.color !== undefined) patch.color = dto.color;
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;

    const [updated] = await this.db
      .update(schema.customerCategories)
      .set(patch)
      .where(eq(schema.customerCategories.id, id))
      .returning();

    if (!updated || updated.enterpriseId !== eid) {
      throw new NotFoundException('客户分类不存在');
    }

    return {
      id: updated.id,
      enterpriseId: updated.enterpriseId,
      name: updated.name,
      type: updated.type,
      description: updated.description ?? null,
      color: updated.color ?? '#1890ff',
      sortOrder: updated.sortOrder ?? 0,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async removeCategory(id: number, enterpriseId: number | undefined) {
    await this.findOneCategory(id, enterpriseId);
    const eid = requireEnterpriseId(enterpriseId);

    const [deleted] = await this.db
      .update(schema.customerCategories)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(
        and(
          eq(schema.customerCategories.id, id),
          eq(schema.customerCategories.enterpriseId, eid),
        ),
      )
      .returning({ id: schema.customerCategories.id });

    if (!deleted) {
      throw new NotFoundException('客户分类不存在');
    }

    await this.db
      .delete(schema.customerCategoryRelations)
      .where(eq(schema.customerCategoryRelations.categoryId, id));

    return { ok: true, id: deleted.id, enterpriseId: eid };
  }

  // ─── Customer Category Relations ────────────────────────────────

  async assignCustomerToCategory(
    customerId: number,
    categoryId: number,
    enterpriseId: number | undefined,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    await this.findOne(customerId, eid);
    await this.findOneCategory(categoryId, eid);

    const [existing] = await this.db
      .select()
      .from(schema.customerCategoryRelations)
      .where(
        and(
          eq(schema.customerCategoryRelations.customerId, customerId),
          eq(schema.customerCategoryRelations.categoryId, categoryId),
        ),
      )
      .limit(1);

    if (existing) {
      return { ok: true, message: '客户已在该分类中' };
    }

    await this.db.insert(schema.customerCategoryRelations).values({
      customerId,
      categoryId,
    });

    return { ok: true, message: '分配成功' };
  }

  async removeCustomerFromCategory(
    customerId: number,
    categoryId: number,
    enterpriseId: number | undefined,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    await this.findOne(customerId, eid);
    await this.findOneCategory(categoryId, eid);

    await this.db
      .delete(schema.customerCategoryRelations)
      .where(
        and(
          eq(schema.customerCategoryRelations.customerId, customerId),
          eq(schema.customerCategoryRelations.categoryId, categoryId),
        ),
      );

    return { ok: true, message: '移除成功' };
  }

  async getCustomerCategories(
    customerId: number,
    enterpriseId: number | undefined,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    await this.findOne(customerId, eid);

    const rows = await this.db
      .select({
        category: schema.customerCategories,
      })
      .from(schema.customerCategoryRelations)
      .innerJoin(
        schema.customerCategories,
        eq(
          schema.customerCategoryRelations.categoryId,
          schema.customerCategories.id,
        ),
      )
      .where(
        and(
          eq(schema.customerCategoryRelations.customerId, customerId),
          eq(schema.customerCategories.enterpriseId, eid),
          eq(schema.customerCategories.isDeleted, false),
        ),
      );

    return rows.map(({ category }) => ({
      id: category.id,
      name: category.name,
      type: category.type,
      color: category.color ?? '#1890ff',
    }));
  }

  async getOverviewStats(enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);

    const [totalRow] = await this.db
      .select({ c: count() })
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.enterpriseId, eid),
          eq(schema.customers.isDeleted, false),
        ),
      );

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [newThisMonthRow] = await this.db
      .select({ c: count() })
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.enterpriseId, eid),
          eq(schema.customers.isDeleted, false),
          sql`${schema.customers.createdAt} >= ${monthStart}`,
        ),
      );

    const typeDistribution = await this.db
      .select({ type: schema.customers.type, c: count() })
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.enterpriseId, eid),
          eq(schema.customers.isDeleted, false),
        ),
      )
      .groupBy(schema.customers.type);

    const levelDistribution = await this.db
      .select({ level: schema.customers.level, c: count() })
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.enterpriseId, eid),
          eq(schema.customers.isDeleted, false),
        ),
      )
      .groupBy(schema.customers.level);

    return {
      totalCustomers: Number(totalRow?.c ?? 0),
      newThisMonth: Number(newThisMonthRow?.c ?? 0),
      typeDistribution: typeDistribution.map((r) => ({
        type: r.type ?? 'enterprise',
        count: Number(r.c),
      })),
      levelDistribution: levelDistribution.map((r) => ({
        level: r.level ?? 'regular',
        count: Number(r.c),
      })),
    };
  }
}
