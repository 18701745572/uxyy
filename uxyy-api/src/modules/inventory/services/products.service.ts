import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, like, or } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import type {
  CreateCategoryDto,
  CreateProductDto,
  UpdateCategoryDto,
  UpdateProductDto,
} from '../dto/product.dto';

function requireEnterpriseId(enterpriseId: number | undefined): number {
  if (enterpriseId == null || Number.isNaN(enterpriseId)) {
    throw new ForbiddenException('当前会话未绑定企业，无法访问商品数据');
  }
  return enterpriseId;
}

function mapProductRow(
  row: typeof schema.products.$inferSelect & {
    stockQty?: string | null;
  },
) {
  return {
    id: row.id,
    enterpriseId: row.enterpriseId,
    code: row.code,
    name: row.name,
    spec: row.spec ?? null,
    unit: row.unit ?? null,
    unitPrice: row.unitPrice,
    costPrice: row.costPrice ?? null,
    minStock: row.minStock ?? null,
    maxStock: row.maxStock ?? null,
    categoryId: row.categoryId ?? null,
    status: row.status ?? 'active',
    currentStock: row.stockQty ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

interface CategoryNode {
  id: number;
  enterpriseId: number;
  name: string;
  parentId: number | null;
  sortOrder: number;
  children: CategoryNode[];
  createdAt: string;
}

function mapCategoryRow(
  row: typeof schema.productCategories.$inferSelect,
  children: CategoryNode[] = [],
): CategoryNode {
  return {
    id: row.id,
    enterpriseId: row.enterpriseId,
    name: row.name,
    parentId: row.parentId ?? null,
    sortOrder: row.sortOrder ?? 0,
    children,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class ProductsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  async findPage(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    categoryId?: number;
    keyword?: string;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.products.enterpriseId, eid),
    ];
    if (params.categoryId) {
      conditions.push(eq(schema.products.categoryId, params.categoryId));
    }
    if (params.keyword) {
      const kw = `%${params.keyword}%`;
      conditions.push(
        or(
          like(schema.products.name, kw),
          like(schema.products.code, kw),
          like(schema.products.spec, kw),
        )!,
      );
    }

    const where = and(...conditions);

    const [totalRows] = await this.db
      .select({ c: count() })
      .from(schema.products)
      .where(where);

    const total = Number(totalRows?.c ?? 0);

    const rows = await this.db
      .select({
        product: schema.products,
        stockQty: schema.inventory.quantity,
      })
      .from(schema.products)
      .leftJoin(
        schema.inventory,
        and(
          eq(schema.products.id, schema.inventory.productId),
          eq(schema.inventory.enterpriseId, eid),
        ),
      )
      .where(where)
      .orderBy(desc(schema.products.updatedAt))
      .limit(params.pageSize)
      .offset(offset);

    return {
      items: rows.map((r) =>
        mapProductRow({ ...r.product, stockQty: r.stockQty }),
      ),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async create(enterpriseId: number | undefined, dto: CreateProductDto) {
    const eid = requireEnterpriseId(enterpriseId);
    const [inserted] = await this.db
      .insert(schema.products)
      .values({
        enterpriseId: eid,
        code: dto.code,
        name: dto.name,
        spec: dto.spec ?? null,
        unit: dto.unit ?? '件',
        unitPrice: dto.unitPrice.toFixed(2),
        costPrice: dto.costPrice != null ? dto.costPrice.toFixed(2) : null,
        minStock: dto.minStock != null ? dto.minStock.toFixed(2) : null,
        maxStock: dto.maxStock != null ? dto.maxStock.toFixed(2) : null,
        categoryId: dto.categoryId ?? null,
        status: dto.status ?? 'active',
      })
      .returning();

    if (!inserted) throw new NotFoundException('创建失败');
    return mapProductRow(inserted);
  }

  async findOne(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const rows = await this.db
      .select({
        product: schema.products,
        stockQty: schema.inventory.quantity,
      })
      .from(schema.products)
      .leftJoin(
        schema.inventory,
        and(
          eq(schema.products.id, schema.inventory.productId),
          eq(schema.inventory.enterpriseId, eid),
        ),
      )
      .where(
        and(eq(schema.products.id, id), eq(schema.products.enterpriseId, eid)),
      )
      .limit(1);

    const row = rows[0];
    if (!row) throw new NotFoundException('商品不存在');
    return mapProductRow({ ...row.product, stockQty: row.stockQty });
  }

  async update(
    id: number,
    enterpriseId: number | undefined,
    dto: UpdateProductDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    await this.findOne(id, enterpriseId);

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.code !== undefined) patch.code = dto.code;
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.spec !== undefined) patch.spec = dto.spec || null;
    if (dto.unit !== undefined) patch.unit = dto.unit || null;
    if (dto.unitPrice !== undefined) patch.unitPrice = dto.unitPrice.toFixed(2);
    if (dto.costPrice !== undefined)
      patch.costPrice = dto.costPrice != null ? dto.costPrice.toFixed(2) : null;
    if (dto.minStock !== undefined)
      patch.minStock = dto.minStock != null ? dto.minStock.toFixed(2) : null;
    if (dto.maxStock !== undefined)
      patch.maxStock = dto.maxStock != null ? dto.maxStock.toFixed(2) : null;
    if (dto.categoryId !== undefined) patch.categoryId = dto.categoryId || null;
    if (dto.status !== undefined) patch.status = dto.status;

    const [updated] = await this.db
      .update(schema.products)
      .set(patch)
      .where(
        and(eq(schema.products.id, id), eq(schema.products.enterpriseId, eid)),
      )
      .returning();

    if (!updated) throw new NotFoundException('商品不存在');
    return mapProductRow(updated);
  }

  async remove(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    await this.findOne(id, enterpriseId);

    const [deleted] = await this.db
      .delete(schema.products)
      .where(
        and(eq(schema.products.id, id), eq(schema.products.enterpriseId, eid)),
      )
      .returning({ id: schema.products.id });

    if (!deleted) throw new NotFoundException('商品不存在');
    return { ok: true, id: deleted.id, enterpriseId: eid };
  }

  // Category CRUD

  async findCategories(enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const rows = await this.db
      .select()
      .from(schema.productCategories)
      .where(eq(schema.productCategories.enterpriseId, eid))
      .orderBy(asc(schema.productCategories.sortOrder));

    const byParent = new Map<number | null, typeof rows>();
    for (const r of rows) {
      const list = byParent.get(r.parentId) ?? [];
      list.push(r);
      byParent.set(r.parentId, list);
    }

    function buildTree(
      parentId: number | null,
    ): ReturnType<typeof mapCategoryRow>[] {
      const children = byParent.get(parentId) ?? [];
      return children.map((r) => mapCategoryRow(r, buildTree(r.id)));
    }

    return { items: buildTree(null) };
  }

  async createCategory(
    enterpriseId: number | undefined,
    dto: CreateCategoryDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    const [inserted] = await this.db
      .insert(schema.productCategories)
      .values({
        enterpriseId: eid,
        name: dto.name,
        parentId: dto.parentId ?? null,
        sortOrder: dto.sortOrder ?? 0,
      })
      .returning();

    if (!inserted) throw new NotFoundException('创建失败');
    return mapCategoryRow(inserted);
  }

  async updateCategory(
    id: number,
    enterpriseId: number | undefined,
    dto: UpdateCategoryDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.parentId !== undefined) patch.parentId = dto.parentId || null;
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;

    const [updated] = await this.db
      .update(schema.productCategories)
      .set(patch)
      .where(
        and(
          eq(schema.productCategories.id, id),
          eq(schema.productCategories.enterpriseId, eid),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException('分类不存在');
    return mapCategoryRow(updated);
  }

  async removeCategory(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);

    const [deleted] = await this.db
      .delete(schema.productCategories)
      .where(
        and(
          eq(schema.productCategories.id, id),
          eq(schema.productCategories.enterpriseId, eid),
        ),
      )
      .returning({ id: schema.productCategories.id });

    if (!deleted) throw new NotFoundException('分类不存在');
    return { ok: true, id: deleted.id, enterpriseId: eid };
  }
}
