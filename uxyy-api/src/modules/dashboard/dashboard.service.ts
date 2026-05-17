import { Inject, Injectable } from '@nestjs/common';
import { eq, and, gte, lt, sql, lte } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { DRIZZLE_DB } from '../database/database.constants';
import type { AppDrizzleDb } from '../database/database.module';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
  ) {}

  /**
   * 获取经营概览数据
   */
  async getOverview(enterpriseId: number) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // 今日销售额（已完成的销售订单）
    const todaySalesResult = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${schema.salesOrders.totalAmount}), '0')`,
      })
      .from(schema.salesOrders)
      .where(
        and(
          eq(schema.salesOrders.enterpriseId, enterpriseId),
          eq(schema.salesOrders.status, 'completed'),
          gte(schema.salesOrders.createdAt, startOfDay),
          lt(schema.salesOrders.createdAt, endOfDay),
        ),
      );

    // 待处理订单数（待确认的销售订单：pending 和 approved 状态）
    const pendingOrdersResult = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(schema.salesOrders)
      .where(
        and(
          eq(schema.salesOrders.enterpriseId, enterpriseId),
          sql`${schema.salesOrders.status} IN ('pending', 'approved')`,
        ),
      );

    // 库存预警数量（库存低于预警值的商品）
    const stockAlertsResult = await this.db
      .select({
        count: sql<number>`COUNT(DISTINCT ${schema.inventory.productId})`,
      })
      .from(schema.inventory)
      .innerJoin(
        schema.products,
        eq(schema.inventory.productId, schema.products.id),
      )
      .where(
        and(
          eq(schema.products.enterpriseId, enterpriseId),
          sql`${schema.inventory.quantity} <= ${schema.products.minStock}`,
        ),
      );

    return {
      todaySales: todaySalesResult[0]?.total ?? '0',
      pendingOrders: Number(pendingOrdersResult[0]?.count ?? 0),
      stockAlerts: Number(stockAlertsResult[0]?.count ?? 0),
    };
  }

  /**
   * 获取待办事项
   */
  async getTodos(enterpriseId: number, _userId: number) {
    // 待审批数量（使用 approvalRecords 表）
    const pendingApprovalsResult = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(schema.approvalRecords)
      .where(
        and(
          eq(schema.approvalRecords.status, 'pending'),
        ),
      );

    // 待跟进客户数量（最近7天需要跟进的记录）
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const followUpResult = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(schema.followUpRecords)
      .where(
        and(
          eq(schema.followUpRecords.enterpriseId, enterpriseId),
          lte(schema.followUpRecords.nextFollowUpAt, sevenDaysLater),
        ),
      );

    // 库存预警列表（取前5条）
    const stockAlertList = await this.db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        stockQuantity: schema.inventory.quantity,
        minStock: schema.products.minStock,
      })
      .from(schema.inventory)
      .innerJoin(
        schema.products,
        eq(schema.inventory.productId, schema.products.id),
      )
      .where(
        and(
          eq(schema.products.enterpriseId, enterpriseId),
          sql`${schema.inventory.quantity} <= ${schema.products.minStock}`,
        ),
      )
      .limit(5);

    return {
      pendingApprovals: Number(pendingApprovalsResult[0]?.count ?? 0),
      followUpCustomers: Number(followUpResult[0]?.count ?? 0),
      stockAlertList: stockAlertList.map((item) => ({
        id: item.id,
        name: item.name,
        stock: Number(item.stockQuantity),
        minStock: Number(item.minStock ?? 0),
      })),
    };
  }
}
