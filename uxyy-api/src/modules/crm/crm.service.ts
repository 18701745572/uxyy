import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { count, desc, eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { DRIZZLE_DB } from '../database/database.constants';
import type { AppDrizzleDb } from '../database/database.module';
import type { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

function requireEnterpriseId(enterpriseId: number | undefined): number {
  if (enterpriseId == null || Number.isNaN(enterpriseId)) {
    throw new ForbiddenException('当前会话未绑定企业，无法访问客户数据');
  }
  return enterpriseId;
}

function mapRow(row: typeof schema.customers.$inferSelect) {
  return {
    id: row.id,
    enterpriseId: row.enterpriseId,
    name: row.name,
    phone: row.phone ?? null,
    remark: row.remark ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class CrmService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  async findPage(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    const [totalRows] = await this.db
      .select({ c: count() })
      .from(schema.customers)
      .where(eq(schema.customers.enterpriseId, eid));

    const total = Number(totalRows?.c ?? 0);

    const rows = await this.db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.enterpriseId, eid))
      .orderBy(desc(schema.customers.updatedAt))
      .limit(params.pageSize)
      .offset(offset);

    return {
      items: rows.map(mapRow),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async create(enterpriseId: number | undefined, dto: CreateCustomerDto) {
    const eid = requireEnterpriseId(enterpriseId);
    const [inserted] = await this.db
      .insert(schema.customers)
      .values({
        enterpriseId: eid,
        name: dto.name,
        phone: dto.phone ?? null,
        remark: dto.remark ?? null,
      })
      .returning();

    if (!inserted) {
      throw new NotFoundException('创建失败');
    }
    return mapRow(inserted);
  }

  async findOne(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const [row] = await this.db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, id))
      .limit(1);

    if (!row || row.enterpriseId !== eid) {
      throw new NotFoundException('客户不存在');
    }
    return mapRow(row);
  }

  async update(
    id: number,
    enterpriseId: number | undefined,
    dto: UpdateCustomerDto,
  ) {
    await this.findOne(id, enterpriseId);
    const eid = requireEnterpriseId(enterpriseId);

    const patch: {
      updatedAt: Date;
      name?: string;
      phone?: string | null;
      remark?: string | null;
    } = { updatedAt: new Date() };
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.phone !== undefined) patch.phone = dto.phone || null;
    if (dto.remark !== undefined) patch.remark = dto.remark || null;

    const [updated] = await this.db
      .update(schema.customers)
      .set(patch)
      .where(eq(schema.customers.id, id))
      .returning();

    if (!updated || updated.enterpriseId !== eid) {
      throw new NotFoundException('客户不存在');
    }
    return mapRow(updated);
  }

  async remove(id: number, enterpriseId: number | undefined) {
    await this.findOne(id, enterpriseId);
    const eid = requireEnterpriseId(enterpriseId);

    const [deleted] = await this.db
      .delete(schema.customers)
      .where(eq(schema.customers.id, id))
      .returning({ id: schema.customers.id });

    if (!deleted) {
      throw new NotFoundException('客户不存在');
    }
    return { ok: true, id: deleted.id, enterpriseId: eid };
  }
}
