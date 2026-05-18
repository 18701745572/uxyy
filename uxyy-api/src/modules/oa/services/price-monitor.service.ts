import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import { NotificationService } from './notification.service';

/**
 * 价格监控服务
 * 定时检测采购均价波动，超过阈值时发送价格预警通知
 */
@Injectable()
export class PriceMonitorService {
  private readonly logger = new Logger(PriceMonitorService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 执行价格监控检查
   * 建议：每天凌晨2点执行
   */
  async checkPriceFluctuations() {
    this.logger.log('开始执行价格监控检查...');

    try {
      // 获取所有企业，使用默认阈值 15%
      const enterprises = await this.db
        .select({
          enterpriseId: schema.enterprises.id,
        })
        .from(schema.enterprises);

      const defaultThreshold = 15;

      for (const enterprise of enterprises) {
        await this.checkEnterprisePriceFluctuations(
          enterprise.enterpriseId,
          defaultThreshold,
        );
      }

      this.logger.log('价格监控检查完成');
    } catch (error) {
      this.logger.error('价格监控检查失败', error);
    }
  }

  /**
   * 检查单个企业的价格波动
   */
  private async checkEnterprisePriceFluctuations(
    enterpriseId: number,
    threshold: number,
  ) {
    // 获取本期和上期的采购数据
    const now = new Date();
    const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // 查询本期采购均价
    const currentPeriodPrices = await this.db
      .select({
        productId: schema.purchaseOrderItems.productId,
        productName: schema.products.name,
        avgPrice: sql<string>`AVG(${schema.purchaseOrderItems.unitPrice})`,
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
          eq(schema.purchaseOrders.status, 'completed'),
          gte(schema.purchaseOrders.createdAt, currentPeriodStart),
          lt(schema.purchaseOrders.createdAt, now),
        ),
      )
      .groupBy(schema.purchaseOrderItems.productId, schema.products.name);

    // 查询上期采购均价
    const lastPeriodPrices = await this.db
      .select({
        productId: schema.purchaseOrderItems.productId,
        avgPrice: sql<string>`AVG(${schema.purchaseOrderItems.unitPrice})`,
      })
      .from(schema.purchaseOrderItems)
      .innerJoin(
        schema.purchaseOrders,
        eq(schema.purchaseOrderItems.orderId, schema.purchaseOrders.id),
      )
      .where(
        and(
          eq(schema.purchaseOrders.enterpriseId, enterpriseId),
          eq(schema.purchaseOrders.status, 'completed'),
          gte(schema.purchaseOrders.createdAt, lastPeriodStart),
          lt(schema.purchaseOrders.createdAt, lastPeriodEnd),
        ),
      )
      .groupBy(schema.purchaseOrderItems.productId);

    // 创建上期价格映射
    const lastPeriodPriceMap = new Map(
      lastPeriodPrices.map((p) => [p.productId, parseFloat(p.avgPrice)]),
    );

    // 检查价格波动
    for (const current of currentPeriodPrices) {
      const lastPrice = lastPeriodPriceMap.get(current.productId);
      if (!lastPrice || lastPrice === 0) continue;

      const currentPrice = parseFloat(current.avgPrice);
      const changePercent = ((currentPrice - lastPrice) / lastPrice) * 100;

      // 如果波动超过阈值，发送通知
      if (Math.abs(changePercent) > threshold) {
        await this.sendPriceAlert(
          enterpriseId,
          current.productId,
          current.productName,
          changePercent,
          threshold,
        );
      }
    }
  }

  /**
   * 发送价格预警通知
   */
  private async sendPriceAlert(
    enterpriseId: number,
    productId: number,
    productName: string,
    changePercent: number,
    threshold: number,
  ) {
    // 获取企业的管理员用户
    const admins = await this.db
      .select({ userId: schema.userEnterprises.userId })
      .from(schema.userEnterprises)
      .where(
        and(
          eq(schema.userEnterprises.enterpriseId, enterpriseId),
          eq(schema.userEnterprises.role, 'admin'),
        ),
      );

    // 给每个管理员发送通知
    for (const admin of admins) {
      // 检查是否已发送过相同的预警（避免重复通知）
      const existingNotification = await this.db
        .select({ id: schema.notifications.id })
        .from(schema.notifications)
        .where(
          and(
            eq(schema.notifications.userId, admin.userId),
            eq(schema.notifications.type, 'price_alert'),
            eq(schema.notifications.sourceType, 'product'),
            eq(schema.notifications.sourceId, productId),
            gte(
              schema.notifications.createdAt,
              new Date(Date.now() - 24 * 60 * 60 * 1000), // 24小时内
            ),
          ),
        )
        .limit(1);

      if (existingNotification.length > 0) {
        this.logger.log(
          `用户 ${admin.userId} 已在24小时内收到过商品 ${productId} 的价格预警，跳过`,
        );
        continue;
      }

      await this.notificationService.sendPriceAlertNotification({
        userId: admin.userId,
        productId,
        productName,
        priceChange: changePercent,
        threshold,
      });

      this.logger.log(
        `已发送价格预警通知给用户 ${admin.userId}，商品：${productName}，变动：${changePercent.toFixed(1)}%`,
      );
    }
  }
}
