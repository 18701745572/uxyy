import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import * as schema from '../../../db/schema';

export interface PurchaseSuggestion {
  productId: number;
  productName: string;
  productCode: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  avgDailySales: number;
  suggestedQty: number;
  urgency: 'high' | 'medium' | 'low';
  reason: string;
  supplierId?: number;
  supplierName?: string;
  lastPurchasePrice?: string;
}

@Injectable()
export class PurchaseSuggestionService {
  private readonly logger = new Logger(PurchaseSuggestionService.name);

  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  /**
   * 生成智能采购建议
   */
  async generateSuggestions(
    enterpriseId: number,
  ): Promise<PurchaseSuggestion[]> {
    const suggestions: PurchaseSuggestion[] = [];

    // 获取所有商品
    const products = await this.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.enterpriseId, enterpriseId));

    for (const product of products) {
      const suggestion = await this.analyzeProduct(product, enterpriseId);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    // 按紧急程度排序
    const urgencyPriority = { high: 3, medium: 2, low: 1 };
    return suggestions.sort(
      (a, b) => urgencyPriority[b.urgency] - urgencyPriority[a.urgency],
    );
  }

  /**
   * 分析单个商品
   */
  private async analyzeProduct(
    product: typeof schema.products.$inferSelect,
    enterpriseId: number,
  ): Promise<PurchaseSuggestion | null> {
    const productId = product.id;
    const minStock = parseFloat(product.minStock || '0');
    const maxStock = parseFloat(product.maxStock || '0');

    // 获取当前库存
    const [inventory] = await this.db
      .select()
      .from(schema.inventory)
      .where(
        and(
          eq(schema.inventory.productId, productId),
          eq(schema.inventory.enterpriseId, enterpriseId),
        ),
      );

    const currentStock = parseFloat(inventory?.quantity || '0');

    // 获取近30天销售数据
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesData = await this.db
      .select({
        totalQty: sql<string>`COALESCE(SUM(${schema.salesOrderItems.quantity}), '0')`,
        orderCount: sql<number>`COUNT(DISTINCT ${schema.salesOrderItems.orderId})`,
      })
      .from(schema.salesOrderItems)
      .innerJoin(
        schema.salesOrders,
        eq(schema.salesOrderItems.orderId, schema.salesOrders.id),
      )
      .where(
        and(
          eq(schema.salesOrderItems.productId, productId),
          eq(schema.salesOrders.enterpriseId, enterpriseId),
          gte(schema.salesOrders.createdAt, thirtyDaysAgo),
          eq(schema.salesOrders.status, 'completed'),
        ),
      );

    const totalSoldQty = parseFloat(salesData[0]?.totalQty || '0');
    const avgDailySales = totalSoldQty / 30;

    // 获取最近采购价格
    const lastPurchase = await this.db
      .select({
        unitPrice: schema.purchaseOrderItems.unitPrice,
        supplierId: schema.purchaseOrders.supplierId,
      })
      .from(schema.purchaseOrderItems)
      .innerJoin(
        schema.purchaseOrders,
        eq(schema.purchaseOrderItems.orderId, schema.purchaseOrders.id),
      )
      .where(
        and(
          eq(schema.purchaseOrderItems.productId, productId),
          eq(schema.purchaseOrders.enterpriseId, enterpriseId),
          eq(schema.purchaseOrders.status, 'completed'),
        ),
      )
      .orderBy(desc(schema.purchaseOrders.createdAt))
      .limit(1);

    // 判断是否需要采购
    let suggestedQty = 0;
    let urgency: 'high' | 'medium' | 'low' = 'low';
    let reason = '';

    // 1. 库存低于安全库存
    if (minStock > 0 && currentStock < minStock) {
      urgency = currentStock === 0 ? 'high' : 'medium';
      suggestedQty = Math.ceil(maxStock - currentStock);
      reason = `库存(${currentStock})低于安全库存(${minStock})`;
    }
    // 2. 基于销售趋势的补货建议
    else if (avgDailySales > 0) {
      const daysOfStock = currentStock / avgDailySales;

      if (daysOfStock < 7) {
        urgency = 'high';
        suggestedQty = Math.ceil(avgDailySales * 30 - currentStock);
        reason = `按当前销量(${avgDailySales.toFixed(2)}/天)，库存仅够${daysOfStock.toFixed(1)}天`;
      } else if (daysOfStock < 14) {
        urgency = 'medium';
        suggestedQty = Math.ceil(avgDailySales * 21 - currentStock);
        reason = `库存偏低，建议提前补货`;
      }
    }

    // 如果没有建议，返回null
    if (suggestedQty <= 0) {
      return null;
    }

    // 获取供应商信息
    let supplierId: number | undefined;
    let supplierName: string | undefined;

    if (lastPurchase[0]?.supplierId) {
      supplierId = lastPurchase[0].supplierId;
      const [supplier] = await this.db
        .select()
        .from(schema.suppliers)
        .where(eq(schema.suppliers.id, supplierId));
      supplierName = supplier?.name;
    }

    return {
      productId,
      productName: product.name,
      productCode: product.code,
      currentStock,
      minStock,
      maxStock,
      avgDailySales: parseFloat(avgDailySales.toFixed(2)),
      suggestedQty: Math.max(suggestedQty, 0),
      urgency,
      reason,
      supplierId,
      supplierName,
      lastPurchasePrice: lastPurchase[0]?.unitPrice,
    };
  }

  /**
   * 获取库存预警商品
   */
  async getStockAlerts(enterpriseId: number) {
    const products = await this.db
      .select({
        product: schema.products,
        inventory: schema.inventory,
      })
      .from(schema.products)
      .leftJoin(
        schema.inventory,
        and(
          eq(schema.inventory.productId, schema.products.id),
          eq(schema.inventory.enterpriseId, enterpriseId),
        ),
      )
      .where(
        and(
          eq(schema.products.enterpriseId, enterpriseId),
          sql`${schema.products.minStock} > 0`,
        ),
      );

    const alerts = products
      .filter(({ product, inventory }) => {
        const currentStock = parseFloat(inventory?.quantity || '0');
        const minStock = parseFloat(product.minStock || '0');
        return currentStock < minStock;
      })
      .map(({ product, inventory }) => ({
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        currentStock: parseFloat(inventory?.quantity || '0'),
        minStock: parseFloat(product.minStock || '0'),
        maxStock: parseFloat(product.maxStock || '0'),
        shortage:
          parseFloat(product.minStock || '0') -
          parseFloat(inventory?.quantity || '0'),
      }));

    return alerts.sort((a, b) => b.shortage - a.shortage);
  }

  /**
   * 生成采购订单建议
   */
  async generatePurchaseOrderSuggestion(
    enterpriseId: number,
    supplierId?: number,
  ) {
    const suggestions = await this.generateSuggestions(enterpriseId);

    // 过滤紧急和中等的建议
    const urgentSuggestions = suggestions.filter(
      (s) => s.urgency === 'high' || s.urgency === 'medium',
    );

    // 按供应商分组
    const groupedBySupplier: Record<number, PurchaseSuggestion[]> = {};
    const withoutSupplier: PurchaseSuggestion[] = [];

    for (const suggestion of urgentSuggestions) {
      if (suggestion.supplierId) {
        if (!groupedBySupplier[suggestion.supplierId]) {
          groupedBySupplier[suggestion.supplierId] = [];
        }
        groupedBySupplier[suggestion.supplierId].push(suggestion);
      } else {
        withoutSupplier.push(suggestion);
      }
    }

    // 如果指定了供应商，只返回该供应商的建议
    if (supplierId) {
      return {
        supplierId,
        items: groupedBySupplier[supplierId] || [],
      };
    }

    return {
      groupedBySupplier,
      withoutSupplier,
      totalSuggestions: urgentSuggestions.length,
    };
  }
}
