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

function mapOrderRow(
  row: typeof schema.stocktakingOrders.$inferSelect,
  items: ReturnType<typeof mapItemRow>[] = [],
) {
  return {
    id: row.id,
    enterpriseId: row.enterpriseId,
    warehouseId: row.warehouseId ?? 1,
    status: row.status,
    remark: row.remark ?? null,
    createdBy: row.createdBy,
    confirmedBy: row.confirmedBy ?? null,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items,
  };
}

function mapItemRow(row: typeof schema.stocktakingItems.$inferSelect) {
  return {
    id: row.id,
    orderId: row.orderId,
    productId: row.productId,
    bookQty: row.bookQty,
    actualQty: row.actualQty ?? null,
    diffQty: row.diffQty ?? null,
    remark: row.remark ?? null,
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
      items: rows.map((r) => mapOrderRow(r)),
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

    const items = await this.db
      .select()
      .from(schema.stocktakingItems)
      .where(eq(schema.stocktakingItems.orderId, id))
      .orderBy(asc(schema.stocktakingItems.id));

    return mapOrderRow(row, items.map(mapItemRow));
  }

  async create(
    enterpriseId: number | undefined,
    dto: CreateStocktakingDto,
    userId: number,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    const [order] = await this.db
      .insert(schema.stocktakingOrders)
      .values({
        enterpriseId: eid,
        warehouseId: dto.warehouseId ?? 1,
        status: 'draft',
        remark: dto.remark ?? null,
        createdBy: userId,
      })
      .returning();

    if (!order) throw new NotFoundException('创建失败');

    // Build item list: specified products or all products with stock
    let productIds = dto.productIds;
    if (!productIds || productIds.length === 0) {
      const allInventory = await this.db
        .select({ productId: schema.inventory.productId })
        .from(schema.inventory)
        .where(eq(schema.inventory.enterpriseId, eid));
      productIds = allInventory.map((r) => r.productId);

      if (productIds.length === 0) {
        throw new BadRequestException('当前企业无库存记录，无法创建盘点单');
      }
    }

    // Snapshot current stock as bookQty
    const itemValues = [];
    for (const pid of productIds) {
      const [inv] = await this.db
        .select({ quantity: schema.inventory.quantity })
        .from(schema.inventory)
        .where(
          and(
            eq(schema.inventory.enterpriseId, eid),
            eq(schema.inventory.productId, pid),
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

    const [item] = await this.db
      .update(schema.stocktakingItems)
      .set({
        actualQty: dto.actualQty.toFixed(2),
        diffQty: dto.actualQty.toFixed(2), // will be recalculated on confirm
        remark: dto.remark ?? null,
      })
      .where(
        and(
          eq(schema.stocktakingItems.id, itemId),
          eq(schema.stocktakingItems.orderId, orderId),
        ),
      )
      .returning();

    if (!item) throw new NotFoundException('盘点明细不存在');
    return mapItemRow(item);
  }

  async confirm(id: number, enterpriseId: number | undefined, userId: number) {
    const eid = requireEnterpriseId(enterpriseId);

    return this.db.transaction(async (tx) => {
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

      let hasDiff = false;
      for (const item of items) {
        const act =
          item.actualQty != null
            ? Number(item.actualQty)
            : Number(item.bookQty);
        const book = Number(item.bookQty);
        const diff = act - book;

        if (diff !== 0) {
          hasDiff = true;
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

      return {
        ok: true,
        orderId: id,
        hasDiff,
      };
    });
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
