import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import type {
  CreateStocktakingDto,
  UpdateStocktakingItemDto,
} from '../dto/stocktaking.dto';
import { addStock, deductStock, writeInventoryLog } from './inventory-mutation';

function requireEnterpriseId(enterpriseId: number | undefined): number {
  if (enterpriseId == null || Number.isNaN(enterpriseId)) {
    throw new ForbiddenException('当前会话未绑定企业，无法操作盘点单');
  }
  return enterpriseId;
}

/** 前端与 @uxyy/shared 约定：`stocktakingNo`、`systemQty` / `difference` 等 */
function stocktakingNoFromId(id: number): string {
  return `ST${String(id).padStart(6, '0')}`;
}

function toStocktakingItemDto(
  row: typeof schema.stocktakingItems.$inferSelect,
  productName?: string | null,
) {
  const bookQty = Number(row.bookQty ?? 0);
  const actualQty =
    row.actualQty != null ? Number(row.actualQty) : bookQty;
  const difference =
    row.diffQty != null ? Number(row.diffQty) : actualQty - bookQty;
  return {
    id: row.id,
    stocktakingId: row.orderId,
    productId: row.productId,
    ...(productName ? { productName } : {}),
    systemQty: bookQty,
    actualQty,
    difference,
    ...(row.remark ? { remark: row.remark } : {}),
  };
}

function toStocktakingDto(
  row: typeof schema.stocktakingOrders.$inferSelect,
  items: ReturnType<typeof toStocktakingItemDto>[],
) {
  const status = row.status as 'draft' | 'confirmed';
  return {
    id: row.id,
    stocktakingNo: stocktakingNoFromId(row.id),
    warehouseId: row.warehouseId ?? 1,
    status,
    ...(row.remark ? { remark: row.remark } : {}),
    items,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class StocktakingService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  async findPage(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    status?: string;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.stocktakingOrders.enterpriseId, eid),
    ];
    if (params.status) {
      conditions.push(eq(schema.stocktakingOrders.status, params.status));
    }

    const where = and(...conditions);

    const [totalRows] = await this.db
      .select({ c: count() })
      .from(schema.stocktakingOrders)
      .where(where);

    const total = Number(totalRows?.c ?? 0);

    const rows = await this.db
      .select()
      .from(schema.stocktakingOrders)
      .where(where)
      .orderBy(desc(schema.stocktakingOrders.createdAt))
      .limit(params.pageSize)
      .offset(offset);

    return {
      items: rows.map((r) => toStocktakingDto(r, [])),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async findOne(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const [row] = await this.db
      .select()
      .from(schema.stocktakingOrders)
      .where(
        and(
          eq(schema.stocktakingOrders.id, id),
          eq(schema.stocktakingOrders.enterpriseId, eid),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('盘点单不存在');

    const joined = await this.db
      .select({
        item: schema.stocktakingItems,
        productName: schema.products.name,
      })
      .from(schema.stocktakingItems)
      .leftJoin(
        schema.products,
        eq(schema.stocktakingItems.productId, schema.products.id),
      )
      .where(eq(schema.stocktakingItems.orderId, id))
      .orderBy(asc(schema.stocktakingItems.id));

    return toStocktakingDto(
      row,
      joined.map((j) =>
        toStocktakingItemDto(j.item, j.productName ?? undefined),
      ),
    );
  }

  async create(
    enterpriseId: number | undefined,
    dto: CreateStocktakingDto,
    userId: number,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    const warehouseId = dto.warehouseId ?? 1;

    const [order] = await this.db
      .insert(schema.stocktakingOrders)
      .values({
        enterpriseId: eid,
        warehouseId,
        status: 'draft',
        remark: dto.remark ?? null,
        createdBy: userId,
      })
      .returning();

    if (!order) throw new NotFoundException('创建失败');

    // Build item list: specified products or all SKU rows under this warehouse
    let productIds = dto.productIds;
    if (!productIds || productIds.length === 0) {
      const allInventory = await this.db
        .selectDistinct({ productId: schema.inventory.productId })
        .from(schema.inventory)
        .where(
          and(
            eq(schema.inventory.enterpriseId, eid),
            eq(schema.inventory.warehouseId, warehouseId),
          ),
        );
      productIds = allInventory.map((r) => r.productId);

      if (productIds.length === 0) {
        throw new BadRequestException(
          '该仓库暂无库存记录，无法按「盘点全部」创建；请先入库或改为勾选具体商品。',
        );
      }
    }

    // Snapshot current stock as bookQty（按所选仓库）
    const itemValues = [];
    for (const pid of productIds) {
      const [inv] = await this.db
        .select({ quantity: schema.inventory.quantity })
        .from(schema.inventory)
        .where(
          and(
            eq(schema.inventory.enterpriseId, eid),
            eq(schema.inventory.productId, pid),
            eq(schema.inventory.warehouseId, warehouseId),
          ),
        )
        .limit(1);

      itemValues.push({
        orderId: order.id,
        productId: pid,
        bookQty: inv?.quantity ?? '0',
      });
    }

    if (itemValues.length > 0) {
      await this.db.insert(schema.stocktakingItems).values(itemValues);
    }

    return this.findOne(order.id, enterpriseId);
  }

  async updateItem(
    orderId: number,
    itemId: number,
    enterpriseId: number | undefined,
    dto: UpdateStocktakingItemDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    // Verify order is draft
    const [order] = await this.db
      .select({ status: schema.stocktakingOrders.status })
      .from(schema.stocktakingOrders)
      .where(
        and(
          eq(schema.stocktakingOrders.id, orderId),
          eq(schema.stocktakingOrders.enterpriseId, eid),
        ),
      )
      .limit(1);

    if (!order) throw new NotFoundException('盘点单不存在');
    if (order.status !== 'draft') {
      throw new BadRequestException('仅草稿状态的盘点单可修改明细');
    }

    const [existingItem] = await this.db
      .select({ bookQty: schema.stocktakingItems.bookQty })
      .from(schema.stocktakingItems)
      .where(
        and(
          eq(schema.stocktakingItems.id, itemId),
          eq(schema.stocktakingItems.orderId, orderId),
        ),
      )
      .limit(1);

    if (!existingItem) throw new NotFoundException('盘点明细不存在');

    const book = Number(existingItem.bookQty ?? 0);
    const diff = dto.actualQty - book;

    await this.db
      .update(schema.stocktakingItems)
      .set({
        actualQty: dto.actualQty.toFixed(2),
        diffQty: diff.toFixed(2),
        remark: dto.remark ?? null,
      })
      .where(
        and(
          eq(schema.stocktakingItems.id, itemId),
          eq(schema.stocktakingItems.orderId, orderId),
        ),
      );

    return this.findOne(orderId, enterpriseId);
  }

  async confirm(id: number, enterpriseId: number | undefined, userId: number) {
    const eid = requireEnterpriseId(enterpriseId);

    await this.db.transaction(async (tx) => {
      // Lock order
      const lockResult = await tx.execute(
        sql`SELECT id, status FROM stocktaking_orders WHERE id = ${id} AND enterprise_id = ${eid} FOR UPDATE LIMIT 1`,
      );
      const orderLocked = lockResult.rows[0] as
        | { id: number; status: string }
        | undefined;
      if (!orderLocked) throw new NotFoundException('盘点单不存在');
      if (orderLocked.status !== 'draft') {
        throw new BadRequestException('仅草稿状态的盘点单可确认');
      }

      const items = await tx
        .select()
        .from(schema.stocktakingItems)
        .where(eq(schema.stocktakingItems.orderId, id));

      for (const item of items) {
        const act =
          item.actualQty != null
            ? Number(item.actualQty)
            : Number(item.bookQty);
        const book = Number(item.bookQty);
        const diff = act - book;

        if (diff !== 0) {
          const result =
            diff > 0
              ? await addStock(tx, eid, item.productId, diff)
              : await deductStock(tx, eid, item.productId, Math.abs(diff));

          await writeInventoryLog(tx, {
            enterpriseId: eid,
            productId: item.productId,
            type: 'check',
            quantity: Math.abs(diff),
            beforeQty: result.beforeQty,
            afterQty: result.afterQty,
            sourceType: 'stocktaking',
            sourceId: id,
            createdBy: userId,
          });
        }

        await tx
          .update(schema.stocktakingItems)
          .set({
            actualQty: act.toFixed(2),
            diffQty: diff.toFixed(2),
          })
          .where(eq(schema.stocktakingItems.id, item.id));
      }

      await tx
        .update(schema.stocktakingOrders)
        .set({
          status: 'confirmed',
          confirmedBy: userId,
          confirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.stocktakingOrders.id, id));
    });

    return this.findOne(id, enterpriseId);
  }

  async cancel(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);

    const [order] = await this.db
      .select({ status: schema.stocktakingOrders.status })
      .from(schema.stocktakingOrders)
      .where(
        and(
          eq(schema.stocktakingOrders.id, id),
          eq(schema.stocktakingOrders.enterpriseId, eid),
        ),
      )
      .limit(1);

    if (!order) throw new NotFoundException('盘点单不存在');
    if (order.status !== 'draft') {
      throw new BadRequestException('仅草稿状态的盘点单可作废');
    }

    await this.db
      .update(schema.stocktakingOrders)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(schema.stocktakingOrders.id, id));

    return { ok: true, orderId: id };
  }
}
