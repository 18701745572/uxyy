import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import type { CreateSupplierDto, UpdateSupplierDto } from '../dto/supplier.dto';

function requireEnterpriseId(enterpriseId: number | undefined): number {
  if (enterpriseId == null || Number.isNaN(enterpriseId)) {
    throw new ForbiddenException('当前会话未绑定企业，无法访问供应商数据');
  }
  return enterpriseId;
}

function mapRow(row: typeof schema.suppliers.$inferSelect) {
  return {
    id: row.id,
    enterpriseId: row.enterpriseId,
    name: row.name,
    contactName: row.contactName ?? null,
    phone: row.phone ?? null,
    address: row.address ?? null,
    status: row.status ?? 'active',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class SuppliersService {
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
      .from(schema.suppliers)
      .where(eq(schema.suppliers.enterpriseId, eid));

    const total = Number(totalRows?.c ?? 0);

    const rows = await this.db
      .select()
      .from(schema.suppliers)
      .where(eq(schema.suppliers.enterpriseId, eid))
      .orderBy(desc(schema.suppliers.updatedAt))
      .limit(params.pageSize)
      .offset(offset);

    return {
      items: rows.map(mapRow),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async create(enterpriseId: number | undefined, dto: CreateSupplierDto) {
    const eid = requireEnterpriseId(enterpriseId);
    const [inserted] = await this.db
      .insert(schema.suppliers)
      .values({
        enterpriseId: eid,
        name: dto.name,
        contactName: dto.contactName ?? null,
        phone: dto.phone ?? null,
        address: dto.address ?? null,
        status: dto.status ?? 'active',
      })
      .returning();

    if (!inserted) throw new NotFoundException('创建失败');
    return mapRow(inserted);
  }

  async findOne(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const [row] = await this.db
      .select()
      .from(schema.suppliers)
      .where(
        and(
          eq(schema.suppliers.id, id),
          eq(schema.suppliers.enterpriseId, eid),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('供应商不存在');
    return mapRow(row);
  }

  async update(
    id: number,
    enterpriseId: number | undefined,
    dto: UpdateSupplierDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    await this.findOne(id, enterpriseId);

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.contactName !== undefined)
      patch.contactName = dto.contactName || null;
    if (dto.phone !== undefined) patch.phone = dto.phone || null;
    if (dto.address !== undefined) patch.address = dto.address || null;
    if (dto.status !== undefined) patch.status = dto.status;

    const [updated] = await this.db
      .update(schema.suppliers)
      .set(patch)
      .where(
        and(
          eq(schema.suppliers.id, id),
          eq(schema.suppliers.enterpriseId, eid),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException('供应商不存在');
    return mapRow(updated);
  }

  async remove(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    await this.findOne(id, enterpriseId);

    const [deleted] = await this.db
      .delete(schema.suppliers)
      .where(
        and(
          eq(schema.suppliers.id, id),
          eq(schema.suppliers.enterpriseId, eid),
        ),
      )
      .returning({ id: schema.suppliers.id });

    if (!deleted) throw new NotFoundException('供应商不存在');
    return { ok: true, id: deleted.id, enterpriseId: eid };
  }
}
