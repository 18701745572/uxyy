import { BadRequestException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../db/schema';

type Tx = NodePgDatabase<typeof schema>;

function dec(n: number | string): string {
  const v = typeof n === 'string' ? Number(n) : n;
  return v.toFixed(2);
}

async function lockAndGetStock(
  tx: Tx,
  enterpriseId: number,
  productId: number,
): Promise<{ quantity: number; id: number | null }> {
  const result = await tx.execute(
    sql`SELECT id, quantity FROM inventory WHERE enterprise_id = ${enterpriseId} AND product_id = ${productId} FOR UPDATE LIMIT 1`,
  );
  const row = result.rows[0] as { id: number; quantity: string } | undefined;
  return {
    quantity: Number(row?.quantity ?? 0),
    id: row?.id ?? null,
  };
}

export async function getStock(
  tx: Tx,
  enterpriseId: number,
  productId: number,
): Promise<{ quantity: number }> {
  const result = await lockAndGetStock(tx, enterpriseId, productId);
  return { quantity: result.quantity };
}

export async function deductStock(
  tx: Tx,
  enterpriseId: number,
  productId: number,
  quantity: number,
): Promise<{ beforeQty: number; afterQty: number }> {
  const { quantity: currentQty, id } = await lockAndGetStock(
    tx,
    enterpriseId,
    productId,
  );

  if (currentQty < quantity) {
    throw new BadRequestException(
      `商品 #${productId} 库存不足 (当前: ${currentQty}, 需要: ${quantity})`,
    );
  }

  const afterQty = currentQty - quantity;
  if (id != null) {
    await tx
      .update(schema.inventory)
      .set({ quantity: dec(afterQty), updatedAt: new Date() })
      .where(eq(schema.inventory.id, id));
  }

  return { beforeQty: currentQty, afterQty };
}

export async function addStock(
  tx: Tx,
  enterpriseId: number,
  productId: number,
  quantity: number,
): Promise<{ beforeQty: number; afterQty: number }> {
  const { quantity: currentQty, id } = await lockAndGetStock(
    tx,
    enterpriseId,
    productId,
  );

  const afterQty = currentQty + quantity;

  if (id != null) {
    await tx
      .update(schema.inventory)
      .set({ quantity: dec(afterQty), updatedAt: new Date() })
      .where(eq(schema.inventory.id, id));
  } else {
    await tx.insert(schema.inventory).values({
      enterpriseId,
      productId,
      quantity: dec(quantity),
      warehouseId: 1,
    });
  }

  return { beforeQty: currentQty, afterQty };
}

export async function writeInventoryLog(
  tx: Tx,
  params: {
    enterpriseId: number;
    productId: number;
    type: 'in' | 'out' | 'adjust' | 'check';
    quantity: number;
    beforeQty: number;
    afterQty: number;
    sourceType?: string;
    sourceId?: number;
    createdBy?: number;
  },
): Promise<void> {
  await tx.insert(schema.inventoryLogs).values({
    enterpriseId: params.enterpriseId,
    productId: params.productId,
    type: params.type,
    quantity: dec(params.quantity),
    beforeQty: dec(params.beforeQty),
    afterQty: dec(params.afterQty),
    sourceType: params.sourceType ?? null,
    sourceId: params.sourceId ?? null,
    createdBy: params.createdBy ?? null,
  });
}
