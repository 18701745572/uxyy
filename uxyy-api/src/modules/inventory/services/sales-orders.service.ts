import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, gte, lte, sql } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import type {
  ApproveOrderDto,
  CreateSalesOrderDto,
  OutboundDto,
  UpdateSalesOrderDto,
} from '../dto/sales-order.dto';
import { addStock, deductStock, writeInventoryLog } from './inventory-mutation';
import { AutoAccountingService } from '../../finance/services/auto-accounting.service';

function requireEnterpriseId(enterpriseId: number | undefined): number {
  if (enterpriseId == null || Number.isNaN(enterpriseId)) {
    throw new ForbiddenException('当前会话未绑定企业，无法操作销售订单');
  }
  return enterpriseId;
}

function genOrderNo(prefix: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hex = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0')
    .toUpperCase();
  return `${prefix}${y}${m}${d}${hex}`;
}

function mapOrderRow(
  row: typeof schema.salesOrders.$inferSelect,
  items: ReturnType<typeof mapItemRow>[] = [],
) {
  return {
    id: row.id,
    enterpriseId: row.enterpriseId,
    customerId: row.customerId,
    orderNo: row.orderNo,
    totalAmount: row.totalAmount,
    discountAmount: row.discountAmount ?? '0',
    payableAmount: row.payableAmount,
    status: row.status,
    deliveryType: row.deliveryType ?? 'self',
    remark: row.remark ?? null,
    createdBy: row.createdBy,
    completedAt: row.completedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items,
  };
}

function mapItemRow(row: typeof schema.salesOrderItems.$inferSelect) {
  return {
    id: row.id,
    orderId: row.orderId,
    productId: row.productId,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    amount: row.amount,
    deliveredQty: row.deliveredQty ?? '0',
  };
}

@Injectable()
export class SalesOrdersService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
    private readonly autoAccountingService: AutoAccountingService,
  ) {}

  async findPage(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    customerId?: number;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.salesOrders.enterpriseId, eid),
    ];
    if (params.status) {
      conditions.push(
        sql`${schema.salesOrders.status} = ${params.status}::order_status`,
      );
    }
    if (params.customerId) {
      conditions.push(eq(schema.salesOrders.customerId, params.customerId));
    }
    if (params.startDate) {
      conditions.push(
        gte(schema.salesOrders.createdAt, new Date(params.startDate)),
      );
    }
    if (params.endDate) {
      conditions.push(
        lte(schema.salesOrders.createdAt, new Date(params.endDate)),
      );
    }

    const where = and(...conditions);

    const [totalRows] = await this.db
      .select({ c: count() })
      .from(schema.salesOrders)
      .where(where);

    const total = Number(totalRows?.c ?? 0);

    const rows = await this.db
      .select()
      .from(schema.salesOrders)
      .where(where)
      .orderBy(desc(schema.salesOrders.createdAt))
      .limit(params.pageSize)
      .offset(offset);

    return {
      items: rows.map((r) => mapOrderRow(r)),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async create(
    enterpriseId: number | undefined,
    dto: CreateSalesOrderDto,
    userId: number,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    const [customer] = await this.db
      .select()
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.id, dto.customerId),
          eq(schema.customers.enterpriseId, eid),
        ),
      )
      .limit(1);
    if (!customer) throw new NotFoundException('客户不存在');

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('订单明细不能为空');
    }

    let totalAmount = 0;
    for (const item of dto.items) {
      totalAmount += item.quantity * item.unitPrice;
    }

    const orderNo = genOrderNo('SO');

    const [order] = await this.db
      .insert(schema.salesOrders)
      .values({
        enterpriseId: eid,
        customerId: dto.customerId,
        orderNo,
        totalAmount: totalAmount.toFixed(2),
        discountAmount: '0',
        payableAmount: totalAmount.toFixed(2),
        status: 'draft',
        deliveryType: dto.deliveryType ?? 'self',
        remark: dto.remark ?? null,
        createdBy: userId,
      })
      .returning();

    if (!order) throw new NotFoundException('创建失败');

    const itemValues = dto.items.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity.toFixed(2),
      unitPrice: item.unitPrice.toFixed(2),
      amount: (item.quantity * item.unitPrice).toFixed(2),
    }));
    const insertedItems = await this.db
      .insert(schema.salesOrderItems)
      .values(itemValues)
      .returning();

    return mapOrderRow(order, insertedItems.map(mapItemRow));
  }

  async findOne(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const [row] = await this.db
      .select()
      .from(schema.salesOrders)
      .where(
        and(
          eq(schema.salesOrders.id, id),
          eq(schema.salesOrders.enterpriseId, eid),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('订单不存在');

    const items = await this.db
      .select()
      .from(schema.salesOrderItems)
      .where(eq(schema.salesOrderItems.orderId, id));

    return mapOrderRow(row, items.map(mapItemRow));
  }

  async update(
    id: number,
    enterpriseId: number | undefined,
    dto: UpdateSalesOrderDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    const order = await this.findOne(id, enterpriseId);

    if (order.status !== 'draft') {
      throw new BadRequestException('仅草稿状态的订单可修改');
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.deliveryType !== undefined) patch.deliveryType = dto.deliveryType;
    if (dto.remark !== undefined) patch.remark = dto.remark || null;

    const [updated] = await this.db
      .update(schema.salesOrders)
      .set(patch)
      .where(
        and(
          eq(schema.salesOrders.id, id),
          eq(schema.salesOrders.enterpriseId, eid),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException('订单不存在');
    return mapOrderRow(updated);
  }

  async submit(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const order = await this.findOne(id, enterpriseId);

    if (order.status !== 'draft') {
      throw new BadRequestException('仅草稿状态的订单可提交');
    }

    const [updated] = await this.db
      .update(schema.salesOrders)
      .set({ status: 'pending', updatedAt: new Date() })
      .where(
        and(
          eq(schema.salesOrders.id, id),
          eq(schema.salesOrders.enterpriseId, eid),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException('订单不存在');
    return mapOrderRow(updated);
  }

  async approve(
    id: number,
    enterpriseId: number | undefined,
    dto: ApproveOrderDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    const order = await this.findOne(id, enterpriseId);

    if (order.status !== 'pending') {
      throw new BadRequestException('仅待审批状态的订单可审批');
    }

    const newStatus = dto.action === 'approve' ? 'approved' : 'cancelled';
    const patch: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    };
    if (newStatus === 'cancelled') {
      patch.cancelledAt = new Date();
    }

    const [updated] = await this.db
      .update(schema.salesOrders)
      .set(patch)
      .where(
        and(
          eq(schema.salesOrders.id, id),
          eq(schema.salesOrders.enterpriseId, eid),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException('订单不存在');
    return mapOrderRow(updated);
  }

  async outbound(
    id: number,
    enterpriseId: number | undefined,
    dto: OutboundDto,
    userId: number,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    return this.db.transaction(async (tx) => {
      // Lock order row
      const lockResult = await tx.execute(
        sql`SELECT id, status FROM sales_orders WHERE id = ${id} AND enterprise_id = ${eid} FOR UPDATE LIMIT 1`,
      );
      const orderLocked = lockResult.rows[0] as
        | { id: number; status: string }
        | undefined;
      if (!orderLocked) throw new NotFoundException('订单不存在');
      if (orderLocked.status !== 'approved') {
        throw new BadRequestException(
          `订单状态不允许出库 (当前: ${orderLocked.status})`,
        );
      }

      let allFullyDelivered = true;

      for (const item of dto.items) {
        const itemLockResult = await tx.execute(
          sql`SELECT id, order_id, product_id, quantity, delivered_qty FROM sales_order_items WHERE id = ${item.itemId} FOR UPDATE LIMIT 1`,
        );
        const orderItem = itemLockResult.rows[0] as
          | {
              id: number;
              order_id: number;
              product_id: number;
              quantity: string;
              delivered_qty: string;
            }
          | undefined;

        if (!orderItem || orderItem.order_id !== id) {
          throw new NotFoundException(`订单明细 #${item.itemId} 不存在`);
        }

        const remaining =
          Number(orderItem.quantity) - Number(orderItem.delivered_qty ?? 0);
        if (Number(item.outboundQty) > remaining) {
          throw new BadRequestException(
            `商品 #${orderItem.product_id} 超出剩余可出库数量 (剩余: ${remaining})`,
          );
        }

        const { beforeQty, afterQty } = await deductStock(
          tx,
          eid,
          orderItem.product_id,
          Number(item.outboundQty),
        );

        const newDelivered =
          Number(orderItem.delivered_qty ?? 0) + Number(item.outboundQty);
        await tx
          .update(schema.salesOrderItems)
          .set({ deliveredQty: newDelivered.toFixed(2) })
          .where(eq(schema.salesOrderItems.id, item.itemId));

        await writeInventoryLog(tx, {
          enterpriseId: eid,
          productId: orderItem.product_id,
          type: 'out',
          quantity: Number(item.outboundQty),
          beforeQty,
          afterQty,
          sourceType: 'sales_order',
          sourceId: id,
          createdBy: userId,
        });

        if (newDelivered < Number(orderItem.quantity)) {
          allFullyDelivered = false;
        }
      }

      if (allFullyDelivered) {
        await tx
          .update(schema.salesOrders)
          .set({
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.salesOrders.id, id));
      } else {
        await tx
          .update(schema.salesOrders)
          .set({ updatedAt: new Date() })
          .where(eq(schema.salesOrders.id, id));
      }

      // 自动记账：销售单完成时生成凭证
      if (allFullyDelivered) {
        try {
          const order = await this.findOne(id, enterpriseId);
          await this.autoAccountingService.autoAccountSalesOrder(order, eid, userId);
        } catch (err) {
          // 记账失败不影响业务流程，记录日志即可
          console.error('销售单自动记账失败:', err);
        }
      }

      return {
        ok: true,
        orderId: id,
        status: allFullyDelivered ? 'completed' : 'approved',
        stockRestored: false,
      };
    });
  }

  async cancel(id: number, enterpriseId: number | undefined, userId: number) {
    const eid = requireEnterpriseId(enterpriseId);

    return this.db.transaction(async (tx) => {
      const lockResult = await tx.execute(
        sql`SELECT id, status FROM sales_orders WHERE id = ${id} AND enterprise_id = ${eid} FOR UPDATE LIMIT 1`,
      );
      const orderLocked = lockResult.rows[0] as
        | { id: number; status: string }
        | undefined;
      if (!orderLocked) throw new NotFoundException('订单不存在');
      if (
        orderLocked.status === 'completed' ||
        orderLocked.status === 'cancelled'
      ) {
        throw new BadRequestException('已完成或已取消的订单不可作废');
      }

      let stockRestored = false;

      if (orderLocked.status === 'approved') {
        const itemsResult = await tx.execute(
          sql`SELECT id, product_id, quantity, delivered_qty FROM sales_order_items WHERE order_id = ${id}`,
        );
        const items = itemsResult.rows as {
          id: number;
          product_id: number;
          quantity: string;
          delivered_qty: string;
        }[];

        for (const item of items) {
          const deliveredQty = Number(item.delivered_qty ?? 0);
          if (deliveredQty > 0) {
            const { beforeQty, afterQty } = await addStock(
              tx,
              eid,
              item.product_id,
              deliveredQty,
            );

            await writeInventoryLog(tx, {
              enterpriseId: eid,
              productId: item.product_id,
              type: 'in',
              quantity: deliveredQty,
              beforeQty,
              afterQty,
              sourceType: 'sales_order',
              sourceId: id,
              createdBy: userId,
            });

            stockRestored = true;
          }
        }
      }

      await tx
        .update(schema.salesOrders)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.salesOrders.id, id));

      return { ok: true, orderId: id, stockRestored };
    });
  }
}
