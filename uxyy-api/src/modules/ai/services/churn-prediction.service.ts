import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import * as schema from '../../../db/schema';

export interface ChurnPrediction {
  customerId: number;
  customerName: string;
  churnRisk: 'high' | 'medium' | 'low';
  churnProbability: number; // 0-100
  riskFactors: RiskFactor[];
  recommendedActions: string[];
  lastOrderDate?: string;
  lastFollowUpDate?: string;
  totalOrders: number;
  totalAmount: string;
}

export interface RiskFactor {
  name: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  metric: string;
}

@Injectable()
export class ChurnPredictionService {
  private readonly logger = new Logger(ChurnPredictionService.name);

  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  /**
   * 预测单个客户流失风险
   */
  async predictCustomerChurn(
    customerId: number,
    enterpriseId: number,
  ): Promise<ChurnPrediction> {
    // 获取客户信息
    const [customer] = await this.db
      .select()
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.id, customerId),
          eq(schema.customers.enterpriseId, enterpriseId),
        ),
      );

    if (!customer) {
      throw new Error('客户不存在');
    }

    const riskFactors: RiskFactor[] = [];
    let churnScore = 0; // 流失分数，越高风险越大

    // 1. 获取订单历史
    const orders = await this.db
      .select()
      .from(schema.salesOrders)
      .where(
        and(
          eq(schema.salesOrders.customerId, customerId),
          eq(schema.salesOrders.enterpriseId, enterpriseId),
          eq(schema.salesOrders.status, 'completed'),
        ),
      )
      .orderBy(desc(schema.salesOrders.createdAt));

    const totalOrders = orders.length;
    const totalAmount = orders
      .reduce((sum, o) => sum + parseFloat(o.totalAmount || '0'), 0)
      .toFixed(2);
    const lastOrder = orders[0];
    const lastOrderDate = lastOrder?.createdAt;

    // 2. 获取跟进记录
    const followUps = await this.db
      .select()
      .from(schema.followUpRecords)
      .where(
        and(
          eq(schema.followUpRecords.customerId, customerId),
          eq(schema.followUpRecords.enterpriseId, enterpriseId),
        ),
      )
      .orderBy(desc(schema.followUpRecords.createdAt));

    const lastFollowUp = followUps[0];
    const lastFollowUpDate = lastFollowUp?.createdAt;

    // 3. 计算各风险因子

    // 因子1: 未下单时长
    if (lastOrderDate) {
      const daysSinceLastOrder = Math.floor(
        (Date.now() - new Date(lastOrderDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (daysSinceLastOrder > 90) {
        riskFactors.push({
          name: '长期未下单',
          severity: 'critical',
          description: `已${daysSinceLastOrder}天未下单，超过3个月`,
          metric: `${daysSinceLastOrder}天`,
        });
        churnScore += 40;
      } else if (daysSinceLastOrder > 60) {
        riskFactors.push({
          name: '较长时间未下单',
          severity: 'warning',
          description: `已${daysSinceLastOrder}天未下单，超过2个月`,
          metric: `${daysSinceLastOrder}天`,
        });
        churnScore += 25;
      } else if (daysSinceLastOrder > 30) {
        riskFactors.push({
          name: '近期未下单',
          severity: 'info',
          description: `已${daysSinceLastOrder}天未下单`,
          metric: `${daysSinceLastOrder}天`,
        });
        churnScore += 10;
      }
    } else {
      // 从未下单
      riskFactors.push({
        name: '从未成交',
        severity: 'warning',
        description: '客户从未下过订单，只是潜在客户',
        metric: '0单',
      });
      churnScore += 20;
    }

    // 因子2: 未跟进时长
    if (lastFollowUpDate) {
      const daysSinceLastFollowUp = Math.floor(
        (Date.now() - new Date(lastFollowUpDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (daysSinceLastFollowUp > 60) {
        riskFactors.push({
          name: '长期未跟进',
          severity: 'critical',
          description: `已${daysSinceLastFollowUp}天未跟进，关系可能已冷淡`,
          metric: `${daysSinceLastFollowUp}天`,
        });
        churnScore += 30;
      } else if (daysSinceLastFollowUp > 30) {
        riskFactors.push({
          name: '较长时间未跟进',
          severity: 'warning',
          description: `已${daysSinceLastFollowUp}天未跟进`,
          metric: `${daysSinceLastFollowUp}天`,
        });
        churnScore += 15;
      }
    } else {
      riskFactors.push({
        name: '从未跟进',
        severity: 'critical',
        description: '客户从未被跟进，关系未建立',
        metric: '0次',
      });
      churnScore += 35;
    }

    // 因子3: 订单频次下降
    if (totalOrders >= 3) {
      // 计算平均订单间隔
      const orderDates = orders
        .map((o) => new Date(o.createdAt).getTime())
        .reverse();
      let totalInterval = 0;
      for (let i = 1; i < orderDates.length; i++) {
        totalInterval +=
          (orderDates[i] - orderDates[i - 1]) / (1000 * 60 * 60 * 24);
      }
      const avgInterval = totalInterval / (orderDates.length - 1);
      const daysSinceLastOrder = lastOrderDate
        ? Math.floor(
            (Date.now() - new Date(lastOrderDate).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

      if (daysSinceLastOrder > avgInterval * 2) {
        riskFactors.push({
          name: '订单频次下降',
          severity: 'warning',
          description: `超过平均下单间隔(${avgInterval.toFixed(0)}天)的2倍`,
          metric: `${daysSinceLastOrder}天`,
        });
        churnScore += 20;
      }
    }

    // 因子4: 订单金额下降
    if (totalOrders >= 2) {
      const recentOrders = orders.slice(0, 3);
      const recentAvg =
        recentOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0) /
        recentOrders.length;
      const olderOrders = orders.slice(3, 6);

      if (olderOrders.length > 0) {
        const olderAvg =
          olderOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0) /
          olderOrders.length;
        if (recentAvg < olderAvg * 0.5) {
          riskFactors.push({
            name: '订单金额大幅下降',
            severity: 'warning',
            description: `近期订单金额较之前下降超过50%`,
            metric: `下降${((1 - recentAvg / olderAvg) * 100).toFixed(0)}%`,
          });
          churnScore += 15;
        }
      }
    }

    // 因子5: 投诉/负面反馈
    const negativeFollowUps = followUps.filter(
      (f) =>
        f.content?.includes('不满') ||
        f.content?.includes('投诉') ||
        f.content?.includes('问题') ||
        f.content?.includes('延迟') ||
        f.content?.includes('质量'),
    );

    if (negativeFollowUps.length > 0) {
      riskFactors.push({
        name: '负面反馈记录',
        severity: 'warning',
        description: `历史记录中有${negativeFollowUps.length}次负面反馈`,
        metric: `${negativeFollowUps.length}次`,
      });
      churnScore += 15;
    }

    // 计算最终流失概率
    const churnProbability = Math.min(100, churnScore);

    // 确定风险等级
    let churnRisk: 'high' | 'medium' | 'low' = 'low';
    if (churnProbability >= 60) churnRisk = 'high';
    else if (churnProbability >= 30) churnRisk = 'medium';

    // 生成建议
    const recommendedActions = this.generateRetentionActions(
      riskFactors,
      churnRisk,
      customer,
      totalAmount,
    );

    return {
      customerId,
      customerName: customer.name,
      churnRisk,
      churnProbability,
      riskFactors,
      recommendedActions,
      lastOrderDate: lastOrderDate?.toISOString().split('T')[0],
      lastFollowUpDate: lastFollowUpDate?.toISOString().split('T')[0],
      totalOrders,
      totalAmount,
    };
  }

  /**
   * 批量预测客户流失风险
   */
  async batchPredictChurn(
    enterpriseId: number,
    riskLevel?: 'high' | 'medium' | 'low',
  ) {
    // 获取有订单历史的客户
    const customersWithOrders = await this.db
      .selectDistinct({ customerId: schema.salesOrders.customerId })
      .from(schema.salesOrders)
      .where(eq(schema.salesOrders.enterpriseId, enterpriseId));

    // 获取所有客户
    const allCustomers = await this.db
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(eq(schema.customers.enterpriseId, enterpriseId));

    const customerIds = new Set([
      ...customersWithOrders.map((c) => c.customerId),
      ...allCustomers.map((c) => c.id),
    ]);

    const predictions: ChurnPrediction[] = [];

    for (const customerId of customerIds) {
      try {
        const prediction = await this.predictCustomerChurn(
          customerId,
          enterpriseId,
        );
        if (!riskLevel || prediction.churnRisk === riskLevel) {
          predictions.push(prediction);
        }
      } catch (e) {
        this.logger.error(`预测客户${customerId}流失风险失败`, e);
      }
    }

    // 按流失概率排序
    return predictions.sort((a, b) => b.churnProbability - a.churnProbability);
  }

  /**
   * 获取流失风险客户统计
   */
  async getChurnRiskStats(enterpriseId: number) {
    const allPredictions = await this.batchPredictChurn(enterpriseId);

    const highRisk = allPredictions.filter((p) => p.churnRisk === 'high');
    const mediumRisk = allPredictions.filter((p) => p.churnRisk === 'medium');
    const lowRisk = allPredictions.filter((p) => p.churnRisk === 'low');

    const atRiskRevenue = highRisk.reduce(
      (sum, p) => sum + parseFloat(p.totalAmount || '0'),
      0,
    );

    return {
      totalCustomers: allPredictions.length,
      highRiskCount: highRisk.length,
      mediumRiskCount: mediumRisk.length,
      lowRiskCount: lowRisk.length,
      highRiskPercentage:
        allPredictions.length > 0
          ? ((highRisk.length / allPredictions.length) * 100).toFixed(2)
          : '0',
      atRiskRevenue: atRiskRevenue.toFixed(2),
      topRiskCustomers: highRisk.slice(0, 10),
    };
  }

  /**
   * 生成挽留建议
   */
  private generateRetentionActions(
    riskFactors: RiskFactor[],
    churnRisk: 'high' | 'medium' | 'low',
    customer: typeof schema.customers.$inferSelect,
    totalAmount: string,
  ): string[] {
    const actions: string[] = [];

    if (churnRisk === 'high') {
      actions.push('🚨 高风险客户！建议销售主管或高层亲自跟进');
      actions.push('📞 24小时内必须联系客户，了解具体原因');
      actions.push('💰 可准备特殊优惠方案或增值服务挽留');
    } else if (churnRisk === 'medium') {
      actions.push('⚠️ 中风险客户，需加强关注');
      actions.push('📧 本周内安排一次电话或拜访沟通');
    } else {
      actions.push('✅ 低风险客户，保持正常维护节奏');
    }

    // 基于具体风险因子的建议
    const hasNoOrderIssue = riskFactors.find((f) => f.name.includes('未下单'));
    if (hasNoOrderIssue) {
      actions.push(
        `📦 ${hasNoOrderIssue.description}，可推荐新品或促销活动刺激下单`,
      );
    }

    const hasNoFollowUpIssue = riskFactors.find((f) =>
      f.name.includes('未跟进'),
    );
    if (hasNoFollowUpIssue) {
      actions.push(`📞 ${hasNoFollowUpIssue.description}，立即安排跟进`);
    }

    const hasFrequencyIssue = riskFactors.find(
      (f) => f.name === '订单频次下降',
    );
    if (hasFrequencyIssue) {
      actions.push('📉 订单频次下降，可询问客户是否有新的需求或竞争对手介入');
    }

    const hasNegativeFeedback = riskFactors.find(
      (f) => f.name === '负面反馈记录',
    );
    if (hasNegativeFeedback) {
      actions.push('😟 历史有负面反馈，需重点关注客户满意度，主动解决问题');
    }

    // 通用建议
    if (parseFloat(totalAmount || '0') > 100000) {
      actions.push('💎 高价值客户，建议制定专属服务方案');
    }

    return actions;
  }
}
