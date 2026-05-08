import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import type {
  ApprovePurchaseOrderDto,
  CreatePurchaseOrderDto,
  InboundDto,
  UpdatePurchaseOrderDto,
} from '../dto/purchase-order.dto';
import { addStock, writeInventoryLog } from './inventory-mutation';
import { AutoAccountingService } from '../../finance/services/auto-accounting.service';

function requireEnterpriseId(enterpriseId: number | undefined): number {
  if (enterpriseId == null || Number.isNaN(enterpriseId)) {
    throw new ForbiddenException('当前会话未绑定企业，无法操作采购订单');
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
  row: typeof schema.purchaseOrders.$inferSelect,
  items: ReturnType<typeof mapItemRow>[] = [],
) {
  return {
    id: row.id,
    enterpriseId: row.enterpriseId,
    supplierId: row.supplierId,
    orderNo: row.orderNo,
    totalAmount: row.totalAmount,
    status: row.status,
    remark: row.remark ?? null,
    createdBy: row.createdBy,
    completedAt: row.completedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items,
  };
}

function mapItemRow(row: typeof schema.purchaseOrderItems.$inferSelect) {
  return {
    id: row.id,
    orderId: row.orderId,
    productId: row.productId,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    amount: row.amount,
    receivedQty: row.receivedQty ?? '0',
  };
}

@Injectable()
export class PurchaseOrdersService {
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
    supplierId?: number;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.purchaseOrders.enterpriseId, eid),
    ];
    if (params.status) {
      conditions.push(
        sql`${schema.purchaseOrders.status} = ${params.status}::order_status`,
      );
    }
    if (params.supplierId) {
      conditions.push(eq(schema.purchaseOrders.supplierId, params.supplierId));
    }
    if (params.startDate) {
      conditions.push(
        gte(schema.purchaseOrders.createdAt, new Date(params.startDate)),
      );
    }
    if (params.endDate) {
      conditions.push(
        lte(schema.purchaseOrders.createdAt, new Date(params.endDate)),
      );
    }

    const where = and(...conditions);

    const [totalRows] = await this.db
      .select({ c: count() })
      .from(schema.purchaseOrders)
      .where(where);

    const total = Number(totalRows?.c ?? 0);

    const rows = await this.db
      .select()
      .from(schema.purchaseOrders)
      .where(where)
      .orderBy(desc(schema.purchaseOrders.createdAt))
      .limit(params.pageSize)
      .offset(offset);

    const orderIds = rows.map((r) => r.id);
    const itemRows =
      orderIds.length > 0
        ? await this.db
            .select()
            .from(schema.purchaseOrderItems)
            .where(inArray(schema.purchaseOrderItems.orderId, orderIds))
        : [];

    const itemsByOrder = new Map<
      number,
      Array<typeof schema.purchaseOrderItems.$inferSelect>
    >();
    for (const ir of itemRows) {
      const arr = itemsByOrder.get(ir.orderId) ?? [];
      arr.push(ir);
      itemsByOrder.set(ir.orderId, arr);
    }

    return {
      items: rows.map((r) =>
        mapOrderRow(r, (itemsByOrder.get(r.id) ?? []).map(mapItemRow)),
      ),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async create(
    enterpriseId: number | undefined,
    dto: CreatePurchaseOrderDto,
    userId: number,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    const [supplier] = await this.db
      .select()
      .from(schema.suppliers)
      .where(
        and(
          eq(schema.suppliers.id, dto.supplierId),
          eq(schema.suppliers.enterpriseId, eid),
        ),
      )
      .limit(1);
    if (!supplier) throw new NotFoundException('供应商不存在');

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('采购明细不能为空');
    }

    let totalAmount = 0;
    for (const item of dto.items) {
      totalAmount += item.quantity * item.unitPrice;
    }

    const orderNo = genOrderNo('PO');

    const [order] = await this.db
      .insert(schema.purchaseOrders)
      .values({
        enterpriseId: eid,
        supplierId: dto.supplierId,
        orderNo,
        totalAmount: totalAmount.toFixed(2),
        status: 'draft',
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
      .insert(schema.purchaseOrderItems)
      .values(itemValues)
      .returning();

    return mapOrderRow(order, insertedItems.map(mapItemRow));
  }

  async findOne(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const [row] = await this.db
      .select()
      .from(schema.purchaseOrders)
      .where(
        and(
          eq(schema.purchaseOrders.id, id),
          eq(schema.purchaseOrders.enterpriseId, eid),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('订单不存在');

    const items = await this.db
      .select()
      .from(schema.purchaseOrderItems)
      .where(eq(schema.purchaseOrderItems.orderId, id));

    return mapOrderRow(row, items.map(mapItemRow));
  }

  async update(
    id: number,
    enterpriseId: number | undefined,
    dto: UpdatePurchaseOrderDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    const order = await this.findOne(id, enterpriseId);

    if (order.status !== 'draft') {
      throw new BadRequestException('仅草稿状态的采购单可修改');
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.remark !== undefined) patch.remark = dto.remark || null;

    const [updated] = await this.db
      .update(schema.purchaseOrders)
      .set(patch)
      .where(
        and(
          eq(schema.purchaseOrders.id, id),
          eq(schema.purchaseOrders.enterpriseId, eid),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException('采购单不存在');

    const items = await this.db
      .select()
      .from(schema.purchaseOrderItems)
      .where(eq(schema.purchaseOrderItems.orderId, id));

    return mapOrderRow(updated, items.map(mapItemRow));
  }

  async submit(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const order = await this.findOne(id, enterpriseId);

    if (order.status !== 'draft') {
      throw new BadRequestException('仅草稿状态的采购单可提交');
    }

    const [updated] = await this.db
      .update(schema.purchaseOrders)
      .set({ status: 'pending', updatedAt: new Date() })
      .where(
        and(
          eq(schema.purchaseOrders.id, id),
          eq(schema.purchaseOrders.enterpriseId, eid),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException('采购单不存在');
    return mapOrderRow(updated);
  }

  async approve(
    id: number,
    enterpriseId: number | undefined,
    dto: ApprovePurchaseOrderDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    const order = await this.findOne(id, enterpriseId);

    if (order.status !== 'pending') {
      throw new BadRequestException('仅待审批状态的采购单可审批');
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
      .update(schema.purchaseOrders)
      .set(patch)
      .where(
        and(
          eq(schema.purchaseOrders.id, id),
          eq(schema.purchaseOrders.enterpriseId, eid),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException('采购单不存在');
    return mapOrderRow(updated);
  }

  async inbound(
    id: number,
    enterpriseId: number | undefined,
    dto: InboundDto,
    userId: number,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    return this.db.transaction(async (tx) => {
      const lockResult = await tx.execute(
        sql`SELECT id, status FROM purchase_orders WHERE id = ${id} AND enterprise_id = ${eid} FOR UPDATE LIMIT 1`,
      );
      const orderLocked = lockResult.rows[0] as
        | { id: number; status: string }
        | undefined;
      if (!orderLocked) throw new NotFoundException('采购单不存在');
      if (orderLocked.status !== 'approved') {
        throw new BadRequestException(
          `采购单状态不允许入库 (当前: ${orderLocked.status})`,
        );
      }

      let allFullyReceived = true;

      for (const item of dto.items) {
        const itemLockResult = await tx.execute(
          sql`SELECT id, order_id, product_id, quantity, received_qty FROM purchase_order_items WHERE id = ${item.itemId} FOR UPDATE LIMIT 1`,
        );
        const orderItem = itemLockResult.rows[0] as
          | {
              id: number;
              order_id: number;
              product_id: number;
              quantity: string;
              received_qty: string;
            }
          | undefined;

        if (!orderItem || orderItem.order_id !== id) {
          throw new NotFoundException(`采购明细 #${item.itemId} 不存在`);
        }

        const remaining =
          Number(orderItem.quantity) - Number(orderItem.received_qty ?? 0);
        if (Number(item.inboundQty) > remaining) {
          throw new BadRequestException(
            `商品 #${orderItem.product_id} 超出剩余可入库数量 (剩余: ${remaining})`,
          );
        }

        const { beforeQty, afterQty } = await addStock(
          tx,
          eid,
          orderItem.product_id,
          Number(item.inboundQty),
        );

        const newReceived =
          Number(orderItem.received_qty ?? 0) + Number(item.inboundQty);
        await tx
          .update(schema.purchaseOrderItems)
          .set({ receivedQty: newReceived.toFixed(2) })
          .where(eq(schema.purchaseOrderItems.id, item.itemId));

        await writeInventoryLog(tx, {
          enterpriseId: eid,
          productId: orderItem.product_id,
          type: 'in',
          quantity: Number(item.inboundQty),
          beforeQty,
          afterQty,
          sourceType: 'purchase_order',
          sourceId: id,
          createdBy: userId,
        });

        if (newReceived < Number(orderItem.quantity)) {
          allFullyReceived = false;
        }
      }

      if (allFullyReceived) {
        await tx
          .update(schema.purchaseOrders)
          .set({
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.purchaseOrders.id, id));
      } else {
        await tx
          .update(schema.purchaseOrders)
          .set({ updatedAt: new Date() })
          .where(eq(schema.purchaseOrders.id, id));
      }

      // 自动记账：采购单完成时生成凭证
      if (allFullyReceived) {
        try {
          const order = await this.findOne(id, enterpriseId);
          await this.autoAccountingService.autoAccountPurchaseOrder(order, eid, userId);
        } catch (err) {
          // 记账失败不影响业务流程，记录日志即可
          console.error('采购单自动记账失败:', err);
        }
      }

      return {
        ok: true,
        orderId: id,
        status: allFullyReceived ? 'completed' : 'approved',
      };
    });
  }

  async cancel(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);

    return this.db.transaction(async (tx) => {
      const lockResult = await tx.execute(
        sql`SELECT id, status FROM purchase_orders WHERE id = ${id} AND enterprise_id = ${eid} FOR UPDATE LIMIT 1`,
      );
      const orderLocked = lockResult.rows[0] as
        | { id: number; status: string }
        | undefined;
      if (!orderLocked) throw new NotFoundException('采购单不存在');
      if (
        orderLocked.status === 'completed' ||
        orderLocked.status === 'cancelled'
      ) {
        throw new BadRequestException('已完成或已取消的采购单不可作废');
      }

      await tx
        .update(schema.purchaseOrders)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.purchaseOrders.id, id));

      return { ok: true, orderId: id };
    });
  }

  async remove(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const order = await this.findOne(id, enterpriseId);

    if (order.status !== 'draft') {
      throw new BadRequestException('仅草稿状态的采购单可删除');
    }

    await this.db.transaction(async (tx) => {
      await tx
        .delete(schema.purchaseOrderItems)
        .where(eq(schema.purchaseOrderItems.orderId, id));
      await tx
        .delete(schema.purchaseOrders)
        .where(
          and(
            eq(schema.purchaseOrders.id, id),
            eq(schema.purchaseOrders.enterpriseId, eid),
          ),
        );
    });

    return { ok: true, id };
  }
}
