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
