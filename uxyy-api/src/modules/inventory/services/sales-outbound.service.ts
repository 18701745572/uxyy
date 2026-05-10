import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import { addStock, deductStock, writeInventoryLog } from './inventory-mutation';

function requireEnterpriseId(enterpriseId: number | undefined): number {
  if (enterpriseId == null || Number.isNaN(enterpriseId)) {
    throw new ForbiddenException('当前会话未绑定企业，无法操作销售出库单');
  }
  return enterpriseId;
}

function genOrderNo(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hex = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0')
    .toUpperCase();
  return `CK${y}${m}${d}${hex}`;
}

function mapOrderRow(
  row: typeof schema.salesOutboundOrders.$inferSelect,
  items: ReturnType<typeof mapItemRow>[] = [],
) {
  return {
    id: row.id,
    enterpriseId: row.enterpriseId,
    orderId: row.orderId,
    orderNo: row.orderNo,
    customerId: row.customerId,
    customerName: row.customerName,
    warehouseId: row.warehouseId,
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

function mapItemRow(row: typeof schema.salesOutboundItems.$inferSelect) {
  return {
    id: row.id,
    orderId: row.orderId,
    productId: row.productId,
    productName: row.productName,
    productCode: row.productCode,
    unit: row.unit ?? '件',
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    amount: row.amount,
    batchNo: row.batchNo ?? null,
  };
}

export interface CreateOutboundDto {
  orderId: number;
  customerId: number;
  customerName: string;
  warehouseId?: number;
  remark?: string;
  items: {
    productId: number;
    productName: string;
    productCode: string;
    unit: string;
    quantity: string;
    unitPrice: string;
    amount: string;
    batchNo?: string;
  }[];
}

@Injectable()
export class SalesOutboundService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  async findPage(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    status?: string;
    orderId?: number;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.salesOutboundOrders.enterpriseId, eid),
    ];
    if (params.status) {
      conditions.push(eq(schema.salesOutboundOrders.status, params.status));
    }
    if (params.orderId) {
      conditions.push(eq(schema.salesOutboundOrders.orderId, params.orderId));
    }

    const totalResult = await this.db
      .select({ count: count() })
      .from(schema.salesOutboundOrders)
      .where(and(...conditions));
    const total = totalResult[0]?.count ?? 0;

    const rows = await this.db
      .select()
      .from(schema.salesOutboundOrders)
      .where(and(...conditions))
      .orderBy(desc(schema.salesOutboundOrders.createdAt))
      .limit(params.pageSize)
      .offset(offset);

    const orderIds = rows.map((r) => r.id);
    const items = await this.db
      .select()
      .from(schema.salesOutboundItems)
      .where(inArray(schema.salesOutboundItems.orderId, orderIds));

    const itemsMap = new Map<number, typeof items>();
    items.forEach((item) => {
      const list = itemsMap.get(item.orderId) || [];
      list.push(item);
      itemsMap.set(item.orderId, list);
    });

    return {
      data: rows.map((row) =>
        mapOrderRow(row, (itemsMap.get(row.id) || []).map(mapItemRow)),
      ),
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.ceil(total / params.pageSize),
    };
  }

  async findById(enterpriseId: number | undefined, id: number) {
    const eid = requireEnterpriseId(enterpriseId);

    const row = await this.db
      .select()
      .from(schema.salesOutboundOrders)
      .where(and(eq(schema.salesOutboundOrders.id, id), eq(schema.salesOutboundOrders.enterpriseId, eid)))
      .limit(1);

    if (!row[0]) {
      throw new NotFoundException('出库单不存在');
    }

    const items = await this.db
      .select()
      .from(schema.salesOutboundItems)
      .where(eq(schema.salesOutboundItems.orderId, id));

    return mapOrderRow(row[0], items.map(mapItemRow));
  }

  async create(
    enterpriseId: number | undefined,
    userId: number,
    dto: CreateOutboundDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    const orderNo = genOrderNo();

    const [order] = await this.db
      .insert(schema.salesOutboundOrders)
      .values({
        enterpriseId: eid,
        orderId: dto.orderId,
        orderNo,
        customerId: dto.customerId,
        customerName: dto.customerName,
        warehouseId: dto.warehouseId ?? 1,
        remark: dto.remark,
        createdBy: userId,
      })
      .returning();

    const itemValues = dto.items.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
      batchNo: item.batchNo,
    }));

    if (itemValues.length > 0) {
      await this.db.insert(schema.salesOutboundItems).values(itemValues);
    }

    return this.findById(eid, order.id);
  }

  async confirm(enterpriseId: number | undefined, id: number, userId: number) {
    const eid = requireEnterpriseId(enterpriseId);

    const order = await this.findById(eid, id);

    if (order.status !== 'draft') {
      throw new BadRequestException('只能确认草稿状态的出库单');
    }

    const items = await this.db
      .select()
      .from(schema.salesOutboundItems)
      .where(eq(schema.salesOutboundItems.orderId, id));

    const stockChecks = await Promise.all(
      items.map(async (item) => {
        const stock = await this.db
          .select({ quantity: schema.inventory.quantity })
          .from(schema.inventory)
          .where(
            and(
              eq(schema.inventory.enterpriseId, eid),
              eq(schema.inventory.productId, item.productId),
            ),
          )
          .limit(1);

        const currentStock = parseFloat(stock[0]?.quantity ?? '0');
        const requiredQty = parseFloat(item.quantity);

        if (currentStock < requiredQty) {
          return { productName: item.productName, short: requiredQty - currentStock };
        }
        return null;
      }),
    );

    const shortages = stockChecks.filter((s) => s !== null);
    if (shortages.length > 0) {
      const msg = shortages
        .map((s) => `${s?.productName} 缺 ${s?.short} 件`)
        .join('；');
      throw new BadRequestException(`库存不足：${msg}`);
    }

    await this.db.transaction(async (tx) => {
      for (const item of items) {
        const qty = Number(item.quantity);
        const { beforeQty, afterQty } = await deductStock(tx, eid, item.productId, qty);

        await writeInventoryLog(tx, {
          enterpriseId: eid,
          productId: item.productId,
          type: 'out',
          quantity: -qty,
          beforeQty,
          afterQty,
          sourceType: 'sales_outbound',
          sourceId: id,
          createdBy: userId,
        });
      }

      await tx
        .update(schema.salesOutboundOrders)
        .set({
          status: 'confirmed',
          confirmedBy: userId,
          confirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.salesOutboundOrders.id, id));

      const salesOrder = await tx
        .select({
          id: schema.salesOrders.id,
          status: schema.salesOrders.status,
          items: sql`(SELECT json_agg(json_build_object('id', soi.id, 'product_id', soi.product_id, 'delivered_qty', soi.delivered_qty, 'quantity', soi.quantity)) FROM sales_order_items soi WHERE soi.order_id = sales_orders.id)`,
        })
        .from(schema.salesOrders)
        .where(eq(schema.salesOrders.id, order.orderId))
        .limit(1);

      if (salesOrder[0]) {
        const salesOrderItems = JSON.parse(salesOrder[0].items as string);
        const outboundItemMap = new Map(items.map((i) => [i.productId, i]));

        const updatedItems = salesOrderItems.map((soi: any) => {
          const outboundItem = outboundItemMap.get(soi.product_id);
          if (outboundItem) {
            const newDeliveredQty =
              parseFloat(soi.delivered_qty ?? '0') +
              parseFloat(outboundItem.quantity);
            return { id: soi.id, deliveredQty: newDeliveredQty.toString() };
          }
          return null;
        }).filter((i: any) => i !== null);

        for (const item of updatedItems) {
          await tx
            .update(schema.salesOrderItems)
            .set({ deliveredQty: item.deliveredQty })
            .where(eq(schema.salesOrderItems.id, item.id));
        }

        const isFullyDelivered = salesOrderItems.every((soi: any) => {
          const outboundItem = outboundItemMap.get(soi.product_id);
          if (!outboundItem) return parseFloat(soi.delivered_qty ?? '0') >= parseFloat(soi.quantity);
          const totalDelivered =
            parseFloat(soi.delivered_qty ?? '0') +
            parseFloat(outboundItem.quantity);
          return totalDelivered >= parseFloat(soi.quantity);
        });

        if (isFullyDelivered && salesOrder[0].status === 'approved') {
          await tx
            .update(schema.salesOrders)
            .set({
              status: 'completed',
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(schema.salesOrders.id, order.orderId));
        }
      }
    });

    return this.findById(eid, id);
  }

  async delete(enterpriseId: number | undefined, id: number) {
    const eid = requireEnterpriseId(enterpriseId);

    const order = await this.findById(eid, id);

    if (order.status !== 'draft') {
      throw new BadRequestException('只能删除草稿状态的出库单');
    }

    await this.db
      .delete(schema.salesOutboundItems)
      .where(eq(schema.salesOutboundItems.orderId, id));

    await this.db
      .delete(schema.salesOutboundOrders)
      .where(eq(schema.salesOutboundOrders.id, id));
  }
}