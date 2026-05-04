import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { DRIZZLE_DB } from '../database/database.constants';
import type { AppDrizzleDb } from '../database/database.module';

export interface CreatePurchaseOrderItemDto {
  productId: number;
  quantity: number;
  price: number;
  remark?: string;
}

@Injectable()
export class PurchaseOrderItemService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  // ========== 创建采购订单明细 ==========
  async createItems(orderId: number, items: CreatePurchaseOrderItemDto[]) {
    if (!items || items.length === 0) {
      return [];
    }

    const orderItems = items.map(item => ({
      orderId,
      productId: item.productId,
      quantity: item.quantity,
      price: String(item.price),
      amount: String(item.quantity * item.price),
      remark: item.remark ?? null,
    }));

    const inserted = await this.db
      .insert(schema.purchaseOrderItems)
      .values(orderItems)
      .returning();

    return inserted;
  }

  // ========== 获取订单明细列表 ==========
  async findByOrderId(orderId: number) {
    const items = await this.db
      .select({
        item: schema.purchaseOrderItems,
        product: schema.products,
      })
      .from(schema.purchaseOrderItems)
      .leftJoin(schema.products, eq(schema.purchaseOrderItems.productId, schema.products.id))
      .where(eq(schema.purchaseOrderItems.orderId, orderId));

    return items.map(({ item, product }) => ({
      id: item.id,
      productId: item.productId,
      productName: product?.name ?? '未知商品',
      quantity: item.quantity,
      price: Number(item.price),
      amount: Number(item.amount),
      remark: item.remark,
    }));
  }

  // ========== 更新订单明细 ==========
  async updateItem(itemId: number, dto: Partial<CreatePurchaseOrderItemDto>) {
    const [existing] = await this.db
      .select()
      .from(schema.purchaseOrderItems)
      .where(eq(schema.purchaseOrderItems.id, itemId))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Order item not found');
    }

    const quantity = dto.quantity ?? existing.quantity;
    const price = dto.price ?? Number(existing.price);

    const [updated] = await this.db
      .update(schema.purchaseOrderItems)
      .set({
        productId: dto.productId ?? existing.productId,
        quantity,
        price: String(price),
        amount: String(quantity * price),
        remark: dto.remark ?? existing.remark,
      })
      .where(eq(schema.purchaseOrderItems.id, itemId))
      .returning();

    return updated;
  }

  // ========== 删除订单明细 ==========
  async deleteItem(itemId: number) {
    const [existing] = await this.db
      .select()
      .from(schema.purchaseOrderItems)
      .where(eq(schema.purchaseOrderItems.id, itemId))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Order item not found');
    }

    await this.db
      .delete(schema.purchaseOrderItems)
      .where(eq(schema.purchaseOrderItems.id, itemId));

    return { success: true };
  }
}
