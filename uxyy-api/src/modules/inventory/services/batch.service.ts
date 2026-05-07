import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql, lte, gte } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import * as schema from '../../../db/schema';

export interface CreateBatchDto {
  productId: number;
  batchNo: string;
  productionDate?: Date;
  expiryDate?: Date;
  quantity: string;
  costPrice?: string;
  supplierId?: number;
  warehouseId?: number;
  sourceType?: string;
  sourceId?: number;
  remark?: string;
}

export interface BatchQueryOptions {
  productId?: number;
  status?: string;
  expiryWarning?: boolean; // 即将过期
  page?: number;
  pageSize?: number;
}

@Injectable()
export class BatchService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
  ) {}

  /**
   * 创建批次
   */
  async createBatch(enterpriseId: number, userId: number, dto: CreateBatchDto) {
    // 验证商品是否存在
    const [product] = await this.db
      .select()
      .from(schema.products)
      .where(
        and(
          eq(schema.products.id, dto.productId),
          eq(schema.products.enterpriseId, enterpriseId),
        ),
      );

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    // 检查批次号是否已存在
    const [existing] = await this.db
      .select()
      .from(schema.productBatches)
      .where(
        and(
          eq(schema.productBatches.batchNo, dto.batchNo),
          eq(schema.productBatches.productId, dto.productId),
          eq(schema.productBatches.enterpriseId, enterpriseId),
        ),
      );

    if (existing) {
      throw new Error('该商品的批次号已存在');
    }

    // 创建批次
    const [batch] = await this.db
      .insert(schema.productBatches)
      .values({
        enterpriseId,
        createdBy: userId,
        initialQuantity: dto.quantity,
        ...dto,
      })
      .returning();

    // 记录批次流水
    await this.db.insert(schema.batchLogs).values({
      enterpriseId,
      batchId: batch.id,
      productId: dto.productId,
      type: 'in',
      quantity: dto.quantity,
      beforeQty: '0',
      afterQty: dto.quantity,
      sourceType: dto.sourceType || 'manual',
      sourceId: dto.sourceId,
      createdBy: userId,
    });

    return batch;
  }

  /**
   * 获取批次列表
   */
  async findAll(enterpriseId: number, options: BatchQueryOptions = {}) {
    const { productId, status, expiryWarning, page = 1, pageSize = 20 } = options;

    let conditions = and(
      eq(schema.productBatches.enterpriseId, enterpriseId),
    );

    if (productId) {
      conditions = and(conditions, eq(schema.productBatches.productId, productId));
    }

    if (status) {
      conditions = and(conditions, eq(schema.productBatches.status, status));
    }

    if (expiryWarning) {
      // 即将过期：30天内
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + 30);
      conditions = and(
        conditions,
        lte(schema.productBatches.expiryDate, warningDate),
        gte(schema.productBatches.expiryDate, new Date()),
      );
    }

    const batches = await this.db
      .select({
        batch: schema.productBatches,
        product: schema.products,
        supplier: schema.suppliers,
      })
      .from(schema.productBatches)
      .leftJoin(schema.products, eq(schema.productBatches.productId, schema.products.id))
      .leftJoin(schema.suppliers, eq(schema.productBatches.supplierId, schema.suppliers.id))
      .where(conditions)
      .orderBy(desc(schema.productBatches.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // 统计总数
    const [{ count }] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.productBatches)
      .where(conditions);

    return {
      list: batches,
      pagination: {
        page,
        pageSize,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / pageSize),
      },
    };
  }

  /**
   * 获取批次详情
   */
  async findById(id: number, enterpriseId: number) {
    const [result] = await this.db
      .select({
        batch: schema.productBatches,
        product: schema.products,
        supplier: schema.suppliers,
      })
      .from(schema.productBatches)
      .leftJoin(schema.products, eq(schema.productBatches.productId, schema.products.id))
      .leftJoin(schema.suppliers, eq(schema.productBatches.supplierId, schema.suppliers.id))
      .where(
        and(
          eq(schema.productBatches.id, id),
          eq(schema.productBatches.enterpriseId, enterpriseId),
        ),
      );

    if (!result) {
      throw new NotFoundException('批次不存在');
    }

    // 获取批次流水
    const logs = await this.db
      .select()
      .from(schema.batchLogs)
      .where(eq(schema.batchLogs.batchId, id))
      .orderBy(desc(schema.batchLogs.createdAt));

    return {
      ...result,
      logs,
    };
  }

  /**
   * 更新批次
   */
  async update(id: number, enterpriseId: number, dto: Partial<CreateBatchDto>) {
    const [batch] = await this.db
      .update(schema.productBatches)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.productBatches.id, id),
          eq(schema.productBatches.enterpriseId, enterpriseId),
        ),
      )
      .returning();

    return batch;
  }

  /**
   * 批次出库
   */
  async outbound(
    batchId: number,
    enterpriseId: number,
    quantity: string,
    userId: number,
    sourceType?: string,
    sourceId?: number,
  ) {
    const [batch] = await this.db
      .select()
      .from(schema.productBatches)
      .where(
        and(
          eq(schema.productBatches.id, batchId),
          eq(schema.productBatches.enterpriseId, enterpriseId),
        ),
      );

    if (!batch) {
      throw new NotFoundException('批次不存在');
    }

    const currentQty = parseFloat(batch.quantity);
    const outboundQty = parseFloat(quantity);

    if (currentQty < outboundQty) {
      throw new Error('批次库存不足');
    }

    const newQty = (currentQty - outboundQty).toFixed(2);

    // 更新批次库存
    await this.db
      .update(schema.productBatches)
      .set({
        quantity: newQty,
        status: parseFloat(newQty) <= 0 ? 'empty' : batch.status,
        updatedAt: new Date(),
      })
      .where(eq(schema.productBatches.id, batchId));

    // 记录流水
    await this.db.insert(schema.batchLogs).values({
      enterpriseId,
      batchId,
      productId: batch.productId,
      type: 'out',
      quantity,
      beforeQty: batch.quantity,
      afterQty: newQty,
      sourceType,
      sourceId,
      createdBy: userId,
    });

    return { success: true, remainingQty: newQty };
  }

  /**
   * 获取即将过期的批次
   */
  async getExpiringBatches(enterpriseId: number, days: number = 30) {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + days);

    const batches = await this.db
      .select({
        batch: schema.productBatches,
        product: schema.products,
      })
      .from(schema.productBatches)
      .leftJoin(schema.products, eq(schema.productBatches.productId, schema.products.id))
      .where(
        and(
          eq(schema.productBatches.enterpriseId, enterpriseId),
          lte(schema.productBatches.expiryDate, warningDate),
          gte(schema.productBatches.expiryDate, new Date()),
          sql`${schema.productBatches.quantity} > 0`,
        ),
      )
      .orderBy(schema.productBatches.expiryDate);

    return batches.map(item => ({
      ...item,
      daysUntilExpiry: Math.ceil(
        (new Date(item.batch.expiryDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
    }));
  }

  /**
   * 获取商品的批次库存
   */
  async getProductBatchStock(productId: number, enterpriseId: number) {
    const batches = await this.db
      .select()
      .from(schema.productBatches)
      .where(
        and(
          eq(schema.productBatches.productId, productId),
          eq(schema.productBatches.enterpriseId, enterpriseId),
          sql`${schema.productBatches.quantity} > 0`,
          eq(schema.productBatches.status, 'active'),
        ),
      )
      .orderBy(schema.productBatches.expiryDate);

    const totalQty = batches.reduce((sum, b) => sum + parseFloat(b.quantity), 0);

    return {
      productId,
      totalQuantity: totalQty.toFixed(2),
      batchCount: batches.length,
      batches,
    };
  }

  /**
   * 自动分配出库批次（先进先出）
   */
  async allocateBatchesForOutbound(
    productId: number,
    enterpriseId: number,
    requiredQty: string,
  ) {
    const qty = parseFloat(requiredQty);
    if (qty <= 0) {
      throw new Error('出库数量必须大于0');
    }

    // 按有效期升序获取可用批次（先进先出）
    const batches = await this.db
      .select()
      .from(schema.productBatches)
      .where(
        and(
          eq(schema.productBatches.productId, productId),
          eq(schema.productBatches.enterpriseId, enterpriseId),
          sql`${schema.productBatches.quantity} > 0`,
          eq(schema.productBatches.status, 'active'),
          sql`(${schema.productBatches.expiryDate} IS NULL OR ${schema.productBatches.expiryDate} > NOW())`,
        ),
      )
      .orderBy(schema.productBatches.expiryDate);

    const allocations: Array<{ batchId: number; quantity: string }> = [];
    let remainingQty = qty;

    for (const batch of batches) {
      if (remainingQty <= 0) break;

      const batchQty = parseFloat(batch.quantity);
      const allocateQty = Math.min(remainingQty, batchQty);

      allocations.push({
        batchId: batch.id,
        quantity: allocateQty.toFixed(2),
      });

      remainingQty -= allocateQty;
    }

    if (remainingQty > 0) {
      throw new Error(`库存不足，缺少 ${remainingQty.toFixed(2)} 个`);
    }

    return {
      productId,
      requiredQty,
      allocations,
      batchCount: allocations.length,
    };
  }
}
