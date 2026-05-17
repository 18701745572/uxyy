import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import { NotificationService } from './notification.service';

/**
 * 经营洞察生成服务
 * 定时分析经营数据，生成洞察建议并发送通知
 */
@Injectable()
export class InsightGeneratorService {
  private readonly logger = new Logger(InsightGeneratorService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 执行经营洞察生成
   * 建议：每周一上午9点执行
   */
  async generateWeeklyInsights() {
    this.logger.log('开始生成每周经营洞察...');

    try {
      // 获取所有企业
      const enterprises = await this.db
        .select({ id: schema.enterprises.id, name: schema.enterprises.name })
        .from(schema.enterprises);

      for (const enterprise of enterprises) {
        await this.generateEnterpriseInsights(enterprise.id);
      }

      this.logger.log('每周经营洞察生成完成');
    } catch (error) {
      this.logger.error('经营洞察生成失败', error);
    }
  }

  /**
   * 为单个企业生成经营洞察
   */
  private async generateEnterpriseInsights(enterpriseId: number) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. 销售趋势洞察
    await this.generateSalesTrendInsight(enterpriseId, weekAgo, now);

    // 2. 库存周转洞察
    await this.generateInventoryTurnoverInsight(enterpriseId);

    // 3. 热销商品洞察
    await this.generateTopProductsInsight(enterpriseId, weekAgo, now);

    // 4. 利润分析洞察
    await this.generateProfitInsight(enterpriseId, weekAgo, now);
  }

  /**
   * 生成销售趋势洞察
   */
  private async generateSalesTrendInsight(
    enterpriseId: number,
    startDate: Date,
    endDate: Date,
  ) {
    // 查询本周销售额
    const currentWeekSales = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${schema.salesOrders.totalAmount}), '0')`,
      })
      .from(schema.salesOrders)
      .where(
        and(
          eq(schema.salesOrders.enterpriseId, enterpriseId),
          eq(schema.salesOrders.status, 'completed'),
          gte(schema.salesOrders.createdAt, startDate),
          lt(schema.salesOrders.createdAt, endDate),
        ),
      );

    // 查询上周销售额
    const lastWeekStart = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekSales = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${schema.salesOrders.totalAmount}), '0')`,
      })
      .from(schema.salesOrders)
      .where(
        and(
          eq(schema.salesOrders.enterpriseId, enterpriseId),
          eq(schema.salesOrders.status, 'completed'),
          gte(schema.salesOrders.createdAt, lastWeekStart),
          lt(schema.salesOrders.createdAt, startDate),
        ),
      );

    const currentTotal = parseFloat(currentWeekSales[0]?.total ?? '0');
    const lastTotal = parseFloat(lastWeekSales[0]?.total ?? '0');

    if (currentTotal > 0 && lastTotal > 0) {
      const changePercent = ((currentTotal - lastTotal) / lastTotal) * 100;

      if (Math.abs(changePercent) > 10) {
        const isIncrease = changePercent > 0;
        await this.sendInsightToAdmins(enterpriseId, {
          title: `本周销售额${isIncrease ? '增长' : '下降'} ${Math.abs(changePercent).toFixed(1)}%`,
          content: `本周销售额为 ¥${currentTotal.toFixed(2)}，较上周${isIncrease ? '增长' : '下降'} ${Math.abs(changePercent).toFixed(1)}%。${isIncrease ? '继续保持良好的销售势头！' : '建议关注销售情况，分析原因并制定改进措施。'}`,
          link: '/dashboard/finance/reports',
        });
      }
    }
  }

  /**
   * 生成库存周转洞察
   */
  private async generateInventoryTurnoverInsight(enterpriseId: number) {
    // 查询库存预警商品数量
    const lowStockProducts = await this.db
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

    const lowStockCount = lowStockProducts[0]?.count ?? 0;

    if (lowStockCount > 0) {
      await this.sendInsightToAdmins(enterpriseId, {
        title: `发现 ${lowStockCount} 个商品库存不足`,
        content: `系统检测到 ${lowStockCount} 个商品的库存已低于安全库存线，建议及时补货以避免影响销售。点击查看库存详情。`,
        link: '/dashboard/inventory',
      });
    }
  }

  /**
   * 生成热销商品洞察
   */
  private async generateTopProductsInsight(
    enterpriseId: number,
    startDate: Date,
    endDate: Date,
  ) {
    // 查询本周热销商品TOP3
    const topProducts = await this.db
      .select({
        productId: schema.salesOrderItems.productId,
        productName: schema.products.name,
        totalQuantity: sql<string>`SUM(${schema.salesOrderItems.quantity})`,
        totalAmount: sql<string>`SUM(${schema.salesOrderItems.subtotal})`,
      })
      .from(schema.salesOrderItems)
      .innerJoin(
        schema.salesOrders,
        eq(schema.salesOrderItems.salesOrderId, schema.salesOrders.id),
      )
      .innerJoin(
        schema.products,
        eq(schema.salesOrderItems.productId, schema.products.id),
      )
      .where(
        and(
          eq(schema.salesOrders.enterpriseId, enterpriseId),
          eq(schema.salesOrders.status, 'completed'),
          gte(schema.salesOrders.createdAt, startDate),
          lt(schema.salesOrders.createdAt, endDate),
        ),
      )
      .groupBy(schema.salesOrderItems.productId, schema.products.name)
      .orderBy(sql`SUM(${schema.salesOrderItems.quantity}) DESC`)
      .limit(3);

    if (topProducts.length > 0) {
      const productList = topProducts
        .map((p, i) => `${i + 1}. ${p.productName} (¥${parseFloat(p.totalAmount).toFixed(0)})`)
        .join('\n');

      await this.sendInsightToAdmins(enterpriseId, {
        title: '本周热销商品TOP3',
        content: `本周销售最火爆的商品：\n${productList}\n\n建议关注这些商品的库存情况，确保不断货。`,
        link: '/dashboard/finance/reports',
      });
    }
  }

  /**
   * 生成利润分析洞察
   */
  private async generateProfitInsight(
    enterpriseId: number,
    startDate: Date,
    endDate: Date,
  ) {
    // 简化的利润计算：销售额 - 采购成本
    const salesResult = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${schema.salesOrders.totalAmount}), '0')`,
      })
      .from(schema.salesOrders)
      .where(
        and(
          eq(schema.salesOrders.enterpriseId, enterpriseId),
          eq(schema.salesOrders.status, 'completed'),
          gte(schema.salesOrders.createdAt, startDate),
          lt(schema.salesOrders.createdAt, endDate),
        ),
      );

    const purchasesResult = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${schema.purchaseOrders.totalAmount}), '0')`,
      })
      .from(schema.purchaseOrders)
      .where(
        and(
          eq(schema.purchaseOrders.enterpriseId, enterpriseId),
          eq(schema.purchaseOrders.status, 'completed'),
          gte(schema.purchaseOrders.orderDate, startDate),
          lt(schema.purchaseOrders.orderDate, endDate),
        ),
      );

    const sales = parseFloat(salesResult[0]?.total ?? '0');
    const purchases = parseFloat(purchasesResult[0]?.total ?? '0');

    if (sales > 0) {
      const profit = sales - purchases;
      const profitMargin = (profit / sales) * 100;

      await this.sendInsightToAdmins(enterpriseId, {
        title: `本周毛利率 ${profitMargin.toFixed(1)}%`,
        content: `本周销售额 ¥${sales.toFixed(2)}，预估毛利 ¥${profit.toFixed(2)}，毛利率 ${profitMargin.toFixed(1)}%。${profitMargin < 20 ? '毛利率偏低，建议优化成本结构或调整定价策略。' : '毛利率处于健康水平，继续保持！'}`,
        link: '/dashboard/finance/profit-analysis',
      });
    }
  }

  /**
   * 发送洞察通知给企业管理员
   */
  private async sendInsightToAdmins(
    enterpriseId: number,
    insight: { title: string; content: string; link?: string },
  ) {
    // 获取企业的管理员用户
    const admins = await this.db
      .select({ userId: schema.users.id })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.enterpriseId, enterpriseId),
          eq(schema.users.role, 'admin'),
        ),
      );

    for (const admin of admins) {
      // 检查是否已发送过相同的洞察（避免重复通知）
      const existingNotification = await this.db
        .select({ id: schema.notifications.id })
        .from(schema.notifications)
        .where(
          and(
            eq(schema.notifications.userId, admin.userId),
            eq(schema.notifications.type, 'insight'),
            eq(schema.notifications.title, insight.title),
            gte(
              schema.notifications.createdAt,
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天内
            ),
          ),
        )
        .limit(1);

      if (existingNotification.length > 0) {
        continue;
      }

      await this.notificationService.sendInsightNotification({
        userId: admin.userId,
        title: insight.title,
        content: insight.content,
        link: insight.link,
      });

      this.logger.log(
        `已发送经营洞察通知给用户 ${admin.userId}：${insight.title}`,
      );
    }
  }
}
