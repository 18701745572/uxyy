import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, like, lte, or } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import type { AdjustInventoryDto } from '../dto/inventory.dto';
import {
  addStock,
  deductStock,
  getStock,
  writeInventoryLog,
} from './inventory-mutation';

function requireEnterpriseId(enterpriseId: number | undefined): number {
  if (enterpriseId == null || Number.isNaN(enterpriseId)) {
    throw new ForbiddenException('当前会话未绑定企业，无法访问库存数据');
  }
  return enterpriseId;
}

function mapInventoryRow(r: {
  inventory: typeof schema.inventory.$inferSelect;
  productName: string | null;
  productCode: string | null;
  productSpec: string | null;
  productUnit: string | null;
  categoryName: string | null;
  minStock: string | null;
  maxStock: string | null;
}) {
  const inv = r.inventory;
  const qty = Number(inv.quantity);
  const minS = r.minStock != null ? Number(r.minStock) : 0;

  return {
    id: inv.id,
    enterpriseId: inv.enterpriseId,
    productId: inv.productId,
    productName: r.productName ?? '',
    productCode: r.productCode ?? '',
    productSpec: r.productSpec ?? null,
    productUnit: r.productUnit ?? null,
    categoryName: r.categoryName ?? null,
    quantity: inv.quantity,
    minStock: r.minStock ?? null,
    maxStock: r.maxStock ?? null,
    lowStockAlert: qty <= minS && minS > 0,
    warehouseId: inv.warehouseId ?? 1,
    batchNo: inv.batchNo ?? null,
    expiryDate: inv.expiryDate?.toISOString() ?? null,
    updatedAt: inv.updatedAt.toISOString(),
  };
}

function mapLogRow(
  r: typeof schema.inventoryLogs.$inferSelect & {
    productName?: string | null;
  },
) {
  return {
    id: r.id,
    enterpriseId: r.enterpriseId,
    productId: r.productId,
    type: r.type,
    quantity: r.quantity,
    beforeQty: r.beforeQty,
    afterQty: r.afterQty,
    sourceType: r.sourceType ?? null,
    sourceId: r.sourceId ?? null,
    productName: r.productName ?? null,
    createdBy: r.createdBy ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

@Injectable()
export class InventoryService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  async findPage(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    categoryId?: number;
    keyword?: string;
    lowStock?: boolean;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    // Build join with products for filtering
    const productWhere: ReturnType<typeof eq>[] = [];
    if (params.keyword) {
      const kw = `%${params.keyword}%`;
      productWhere.push(
        or(like(schema.products.name, kw), like(schema.products.code, kw))!,
      );
    }
    if (params.categoryId) {
      productWhere.push(eq(schema.products.categoryId, params.categoryId));
    }

    const productCondition =
      productWhere.length > 0 ? and(...productWhere) : undefined;

    // For low stock: we filter after query since it involves comparing across tables
    const [totalRows] = await this.db
      .select({ c: count() })
      .from(schema.inventory)
      .innerJoin(
        schema.products,
        and(
          eq(schema.inventory.productId, schema.products.id),
          eq(schema.products.enterpriseId, eid),
        ),
      )
      .leftJoin(
        schema.productCategories,
        eq(schema.products.categoryId, schema.productCategories.id),
      )
      .where(
        and(
          eq(schema.inventory.enterpriseId, eid),
          ...(productCondition ? [productCondition] : []),
        ),
      );

    let total = Number(totalRows?.c ?? 0);

    let rows = await this.db
      .select({
        inventory: schema.inventory,
        productName: schema.products.name,
        productCode: schema.products.code,
        productSpec: schema.products.spec,
        productUnit: schema.products.unit,
        categoryName: schema.productCategories.name,
        minStock: schema.products.minStock,
        maxStock: schema.products.maxStock,
      })
      .from(schema.inventory)
      .innerJoin(
        schema.products,
        and(
          eq(schema.inventory.productId, schema.products.id),
          eq(schema.products.enterpriseId, eid),
        ),
      )
      .leftJoin(
        schema.productCategories,
        eq(schema.products.categoryId, schema.productCategories.id),
      )
      .where(
        and(
          eq(schema.inventory.enterpriseId, eid),
          ...(productCondition ? [productCondition] : []),
        ),
      )
      .orderBy(desc(schema.inventory.updatedAt))
      .limit(params.pageSize)
      .offset(offset);

    // Low stock filter — applied in-memory since decimal comparison across tables
    if (params.lowStock) {
      rows = rows.filter((r) => {
        const qty = Number(r.inventory.quantity);
        const minS = r.minStock != null ? Number(r.minStock) : 0;
        return qty <= minS && minS > 0;
      });
      total = rows.length;
    }

    return {
      items: rows.map(mapInventoryRow),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async getAlerts(enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);

    const rows = await this.db
      .select({
        inventory: schema.inventory,
        productName: schema.products.name,
        productCode: schema.products.code,
        productSpec: schema.products.spec,
        productUnit: schema.products.unit,
        categoryName: schema.productCategories.name,
        minStock: schema.products.minStock,
        maxStock: schema.products.maxStock,
      })
      .from(schema.inventory)
      .innerJoin(
        schema.products,
        and(
          eq(schema.inventory.productId, schema.products.id),
          eq(schema.products.enterpriseId, eid),
        ),
      )
      .leftJoin(
        schema.productCategories,
        eq(schema.products.categoryId, schema.productCategories.id),
      )
      .where(eq(schema.inventory.enterpriseId, eid));

    const alerts = rows.filter((r) => {
      const qty = Number(r.inventory.quantity);
      const minS = r.minStock != null ? Number(r.minStock) : 0;
      return qty <= minS && minS > 0;
    });

    return {
      items: alerts.map(mapInventoryRow),
      alertCount: alerts.length,
    };
  }

  async adjust(
    enterpriseId: number | undefined,
    dto: AdjustInventoryDto,
    userId?: number,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    return this.db.transaction(async (tx) => {
      const currentQty = (await getStock(tx, eid, dto.productId)).quantity;

      const result =
        dto.quantity < 0
          ? await deductStock(tx, eid, dto.productId, Math.abs(dto.quantity))
          : await addStock(tx, eid, dto.productId, dto.quantity);

      await writeInventoryLog(tx, {
        enterpriseId: eid,
        productId: dto.productId,
        type: 'adjust',
        quantity: Math.abs(dto.quantity),
        beforeQty: currentQty,
        afterQty: result.afterQty,
        sourceType: 'adjust',
        createdBy: userId,
      });

      return {
        ok: true,
        productId: dto.productId,
        beforeQty: result.beforeQty,
        afterQty: result.afterQty,
      };
    });
  }

  async findLogs(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    productId?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
    sourceType?: string;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.inventoryLogs.enterpriseId, eid),
    ];
    if (params.productId) {
      conditions.push(eq(schema.inventoryLogs.productId, params.productId));
    }
    if (params.type) {
      conditions.push(eq(schema.inventoryLogs.type, params.type));
    }
    if (params.sourceType) {
      conditions.push(eq(schema.inventoryLogs.sourceType, params.sourceType));
    }
    if (params.startDate) {
      conditions.push(
        gte(schema.inventoryLogs.createdAt, new Date(params.startDate)),
      );
    }
    if (params.endDate) {
      conditions.push(
        lte(schema.inventoryLogs.createdAt, new Date(params.endDate)),
      );
    }

    const where = and(...conditions);

    const [totalRows] = await this.db
      .select({ c: count() })
      .from(schema.inventoryLogs)
      .where(where);

    const total = Number(totalRows?.c ?? 0);

    const rows = await this.db
      .select({
        log: schema.inventoryLogs,
        productName: schema.products.name,
      })
      .from(schema.inventoryLogs)
      .leftJoin(
        schema.products,
        eq(schema.inventoryLogs.productId, schema.products.id),
      )
      .where(where)
      .orderBy(desc(schema.inventoryLogs.createdAt))
      .limit(params.pageSize)
      .offset(offset);

    return {
      items: rows.map((r) =>
        mapLogRow({ ...r.log, productName: r.productName }),
      ),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  // ==================== 库存预警 ====================

  async findStockAlerts(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    type?: string;
    status?: string;
    productId?: number;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.stockAlerts.enterpriseId, eid),
    ];
    if (params.type) {
      conditions.push(eq(schema.stockAlerts.type, params.type));
    }
    if (params.status) {
      conditions.push(eq(schema.stockAlerts.status, params.status));
    }
    if (params.productId) {
      conditions.push(eq(schema.stockAlerts.productId, params.productId));
    }

    const where = and(...conditions);

    const [totalRows] = await this.db
      .select({ c: count() })
      .from(schema.stockAlerts)
      .where(where);

    const total = Number(totalRows?.c ?? 0);

    const rows = await this.db
      .select({
        alert: schema.stockAlerts,
        productName: schema.products.name,
        productCode: schema.products.code,
      })
      .from(schema.stockAlerts)
      .leftJoin(
        schema.products,
        eq(schema.stockAlerts.productId, schema.products.id),
      )
      .where(where)
      .orderBy(desc(schema.stockAlerts.createdAt))
      .limit(params.pageSize)
      .offset(offset);

    return {
      items: rows.map(({ alert, productName, productCode }) => ({
        id: alert.id,
        enterpriseId: alert.enterpriseId,
        productId: alert.productId,
        productName: productName ?? '',
        productCode: productCode ?? '',
        type: alert.type,
        currentStock: Number(alert.currentStock),
        threshold: Number(alert.threshold),
        status: alert.status,
        remark: alert.remark ?? null,
        createdAt: alert.createdAt.toISOString(),
        updatedAt: alert.updatedAt.toISOString(),
      })),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async createStockAlert(
    enterpriseId: number | undefined,
    dto: {
      productId: number;
      type: string;
      currentStock: number;
      threshold: number;
      remark?: string;
    },
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    const [alert] = await this.db
      .insert(schema.stockAlerts)
      .values({
        enterpriseId: eid,
        productId: dto.productId,
        type: dto.type,
        currentStock: String(dto.currentStock),
        threshold: String(dto.threshold),
        status: 'pending',
        remark: dto.remark ?? null,
      })
      .returning();

    return alert;
  }

  async updateStockAlert(
    enterpriseId: number | undefined,
    alertId: number,
    dto: {
      status?: string;
      remark?: string;
    },
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    const [alert] = await this.db
      .update(schema.stockAlerts)
      .set({
        ...(dto.status && { status: dto.status }),
        ...(dto.remark !== undefined && { remark: dto.remark }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.stockAlerts.id, alertId),
          eq(schema.stockAlerts.enterpriseId, eid),
        ),
      )
      .returning();

    return alert;
  }

  async getStockAlertStats(enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);

    const [pendingRow] = await this.db
      .select({ c: count() })
      .from(schema.stockAlerts)
      .where(
        and(
          eq(schema.stockAlerts.enterpriseId, eid),
          eq(schema.stockAlerts.status, 'pending'),
        ),
      );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayRow] = await this.db
      .select({ c: count() })
      .from(schema.stockAlerts)
      .where(
        and(
          eq(schema.stockAlerts.enterpriseId, eid),
          gte(schema.stockAlerts.createdAt, today),
        ),
      );

    const [lowRow] = await this.db
      .select({ c: count() })
      .from(schema.stockAlerts)
      .where(
        and(
          eq(schema.stockAlerts.enterpriseId, eid),
          eq(schema.stockAlerts.type, 'low'),
        ),
      );

    const [highRow] = await this.db
      .select({ c: count() })
      .from(schema.stockAlerts)
      .where(
        and(
          eq(schema.stockAlerts.enterpriseId, eid),
          eq(schema.stockAlerts.type, 'high'),
        ),
      );

    return {
      pendingCount: Number(pendingRow?.c ?? 0),
      todayCount: Number(todayRow?.c ?? 0),
      lowCount: Number(lowRow?.c ?? 0),
      highCount: Number(highRow?.c ?? 0),
    };
  }

  async checkAndCreateAlerts(enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);

    // 获取所有库存数据
    const rows = await this.db
      .select({
        inventory: schema.inventory,
        minStock: schema.products.minStock,
        maxStock: schema.products.maxStock,
      })
      .from(schema.inventory)
      .innerJoin(
        schema.products,
        and(
          eq(schema.inventory.productId, schema.products.id),
          eq(schema.products.enterpriseId, eid),
        ),
      )
      .where(eq(schema.inventory.enterpriseId, eid));

    const alerts: (typeof schema.stockAlerts.$inferInsert)[] = [];

    for (const row of rows) {
      const qty = Number(row.inventory.quantity);
      const minS = row.minStock != null ? Number(row.minStock) : 0;
      const maxS = row.maxStock != null ? Number(row.maxStock) : 0;

      // 低于下限预警
      if (minS > 0 && qty <= minS) {
        alerts.push({
          enterpriseId: eid,
          productId: row.inventory.productId,
          type: 'low',
          currentStock: String(qty),
          threshold: String(minS),
          status: 'pending',
          remark: null,
        });
      }

      // 高于上限预警
      if (maxS > 0 && qty >= maxS) {
        alerts.push({
          enterpriseId: eid,
          productId: row.inventory.productId,
          type: 'high',
          currentStock: String(qty),
          threshold: String(maxS),
          status: 'pending',
          remark: null,
        });
      }
    }

    // 批量插入预警记录
    if (alerts.length > 0) {
      await this.db.insert(schema.stockAlerts).values(alerts);
    }

    return {
      checkedCount: rows.length,
      alertCount: alerts.length,
    };
  }
}
