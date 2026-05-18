import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, ne, sql } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';

export interface PriceAnomaly {
  productId: number;
  productCode: string;
  productName: string;
  expectedPrice: string;
  actualPrice: string;
  priceDiff: string;
  percentage: string;
  type: 'sales_below_cost' | 'purchase_above_avg';
  orderType: 'sales' | 'purchase';
  orderId?: number;
}

export interface PriceValidationResult {
  isValid: boolean;
  anomalies: PriceAnomaly[];
}

@Injectable()
export class PriceAnomalyService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  async validateSalesOrder(
    enterpriseId: number,
    items: Array<{ productId: number; unitPrice: number }>,
  ): Promise<PriceValidationResult> {
    const anomalies: PriceAnomaly[] = [];

    for (const item of items) {
      const [product] = await this.db
        .select({
          id: schema.products.id,
          code: schema.products.code,
          name: schema.products.name,
          costPrice: schema.products.costPrice,
        })
        .from(schema.products)
        .where(
          and(
            eq(schema.products.id, item.productId),
            eq(schema.products.enterpriseId, enterpriseId),
          ),
        )
        .limit(1);

      if (product && product.costPrice) {
        const costPrice = Number(product.costPrice);
        const salePrice = item.unitPrice;

        if (salePrice < costPrice) {
          const diff = costPrice - salePrice;
          const percentage = ((diff / costPrice) * 100).toFixed(2);

          anomalies.push({
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            expectedPrice: costPrice.toFixed(2),
            actualPrice: salePrice.toFixed(2),
            priceDiff: diff.toFixed(2),
            percentage,
            type: 'sales_below_cost',
            orderType: 'sales',
          });
        }
      }
    }

    return {
      isValid: anomalies.length === 0,
      anomalies,
    };
  }

  async validatePurchaseOrder(
    enterpriseId: number,
    supplierId: number,
    items: Array<{ productId: number; unitPrice: number }>,
  ): Promise<PriceValidationResult> {
    const anomalies: PriceAnomaly[] = [];

    for (const item of items) {
      const avgPriceResult = await this.db
        .select({ avgPrice: sql`AVG(unit_price)::decimal(12,2)` })
        .from(schema.purchaseOrderItems)
        .innerJoin(
          schema.purchaseOrders,
          eq(schema.purchaseOrderItems.orderId, schema.purchaseOrders.id),
        )
        .where(
          and(
            eq(schema.purchaseOrderItems.productId, item.productId),
            eq(schema.purchaseOrders.enterpriseId, enterpriseId),
            eq(schema.purchaseOrders.supplierId, supplierId),
            gte(
              schema.purchaseOrders.createdAt,
              sql`now() - interval '90 days'`,
            ),
          ),
        );

      const avgPrice = avgPriceResult[0]?.avgPrice;

      if (avgPrice) {
        const avgPriceNum = Number(avgPrice);
        const currentPrice = item.unitPrice;

        if (currentPrice > avgPriceNum * 1.2) {
          const diff = currentPrice - avgPriceNum;
          const percentage = ((diff / avgPriceNum) * 100).toFixed(2);

          const [product] = await this.db
            .select({
              id: schema.products.id,
              code: schema.products.code,
              name: schema.products.name,
            })
            .from(schema.products)
            .where(
              and(
                eq(schema.products.id, item.productId),
                eq(schema.products.enterpriseId, enterpriseId),
              ),
            )
            .limit(1);

          anomalies.push({
            productId: product?.id ?? item.productId,
            productCode: product?.code ?? '',
            productName: product?.name ?? '',
            expectedPrice: avgPriceNum.toFixed(2),
            actualPrice: currentPrice.toFixed(2),
            priceDiff: diff.toFixed(2),
            percentage,
            type: 'purchase_above_avg',
            orderType: 'purchase',
          });
        }
      }
    }

    return {
      isValid: anomalies.length === 0,
      anomalies,
    };
  }

  async detectHistoricalAnomalies(
    enterpriseId: number,
    days?: number,
  ): Promise<PriceAnomaly[]> {
    const lookbackDays = days ?? 30;

    const salesAnomalies = await this.db
      .select({
        productId: schema.products.id,
        productCode: schema.products.code,
        productName: schema.products.name,
        expectedPrice: schema.products.costPrice,
        actualPrice: schema.salesOrderItems.unitPrice,
        orderId: schema.salesOrders.id,
      })
      .from(schema.salesOrderItems)
      .innerJoin(
        schema.salesOrders,
        eq(schema.salesOrderItems.orderId, schema.salesOrders.id),
      )
      .innerJoin(
        schema.products,
        eq(schema.salesOrderItems.productId, schema.products.id),
      )
      .where(
        and(
          eq(schema.salesOrders.enterpriseId, enterpriseId),
          eq(schema.products.enterpriseId, enterpriseId),
          gte(
            schema.salesOrders.createdAt,
            sql`now() - interval '${lookbackDays} days'`,
          ),
          sql`${schema.salesOrderItems.unitPrice} < ${schema.products.costPrice}`,
        ),
      );

    const purchaseAnomalies = await this.db
      .select({
        productId: schema.products.id,
        productCode: schema.products.code,
        productName: schema.products.name,
        actualPrice: schema.purchaseOrderItems.unitPrice,
        orderId: schema.purchaseOrders.id,
        supplierId: schema.purchaseOrders.supplierId,
      })
      .from(schema.purchaseOrderItems)
      .innerJoin(
        schema.purchaseOrders,
        eq(schema.purchaseOrderItems.orderId, schema.purchaseOrders.id),
      )
      .innerJoin(
        schema.products,
        eq(schema.purchaseOrderItems.productId, schema.products.id),
      )
      .where(
        and(
          eq(schema.purchaseOrders.enterpriseId, enterpriseId),
          eq(schema.products.enterpriseId, enterpriseId),
          gte(
            schema.purchaseOrders.createdAt,
            sql`now() - interval '${lookbackDays} days'`,
          ),
        ),
      );

    const result: PriceAnomaly[] = [];

    for (const item of salesAnomalies) {
      if (item.expectedPrice) {
        const expected = Number(item.expectedPrice);
        const actual = Number(item.actualPrice);
        const diff = expected - actual;
        const percentage = ((diff / expected) * 100).toFixed(2);

        result.push({
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          expectedPrice: expected.toFixed(2),
          actualPrice: actual.toFixed(2),
          priceDiff: diff.toFixed(2),
          percentage,
          type: 'sales_below_cost',
          orderType: 'sales',
          orderId: item.orderId,
        });
      }
    }

    for (const item of purchaseAnomalies) {
      const avgPriceResult = await this.db
        .select({ avgPrice: sql`AVG(unit_price)::decimal(12,2)` })
        .from(schema.purchaseOrderItems)
        .innerJoin(
          schema.purchaseOrders,
          eq(schema.purchaseOrderItems.orderId, schema.purchaseOrders.id),
        )
        .where(
          and(
            eq(schema.purchaseOrderItems.productId, item.productId),
            eq(schema.purchaseOrders.enterpriseId, enterpriseId),
            eq(schema.purchaseOrders.supplierId, item.supplierId),
            gte(
              schema.purchaseOrders.createdAt,
              sql`now() - interval '90 days'`,
            ),
            ne(schema.purchaseOrders.id, item.orderId),
          ),
        );

      const avgPrice = avgPriceResult[0]?.avgPrice;
      if (avgPrice) {
        const avgPriceNum = Number(avgPrice);
        const actual = Number(item.actualPrice);

        if (actual > avgPriceNum * 1.2) {
          const diff = actual - avgPriceNum;
          const percentage = ((diff / avgPriceNum) * 100).toFixed(2);

          result.push({
            productId: item.productId,
            productCode: item.productCode,
            productName: item.productName,
            expectedPrice: avgPriceNum.toFixed(2),
            actualPrice: actual.toFixed(2),
            priceDiff: diff.toFixed(2),
            percentage,
            type: 'purchase_above_avg',
            orderType: 'purchase',
            orderId: item.orderId,
          });
        }
      }
    }

    return result.sort((a, b) => {
      const aPercent = Math.abs(Number(a.percentage));
      const bPercent = Math.abs(Number(b.percentage));
      return bPercent - aPercent;
    });
  }
}
