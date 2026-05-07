import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import * as schema from '../../../db/schema';

export interface FollowUpSuggestion {
  type: 'follow_up' | 'deal' | 'risk' | 'opportunity';
  priority: 'high' | 'medium' | 'low';
  title: string;
  content: string;
  suggestedAction: string;
  reason: string;
}

export interface CustomerInsight {
  customerId: number;
  customerName: string;
  lastFollowUpDays: number;
  totalFollowUps: number;
  opportunityCount: number;
  totalDealAmount: number;
  riskLevel: 'high' | 'medium' | 'low';
  suggestions: FollowUpSuggestion[];
}

@Injectable()
export class AiFollowUpService {
  private readonly logger = new Logger(AiFollowUpService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
  ) {}

  /**
   * 生成客户跟进建议
   */
  async generateFollowUpSuggestions(customerId: number, enterpriseId: number): Promise<FollowUpSuggestion[]> {
    const suggestions: FollowUpSuggestion[] = [];

    // 获取客户基本信息
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
      return suggestions;
    }

    // 获取最近跟进记录
    const recentFollowUps = await this.db
      .select()
      .from(schema.followUpRecords)
      .where(
        and(
          eq(schema.followUpRecords.customerId, customerId),
          eq(schema.followUpRecords.enterpriseId, enterpriseId),
        ),
      )
      .orderBy(desc(schema.followUpRecords.createdAt))
      .limit(5);

    const lastFollowUp = recentFollowUps[0];
    const daysSinceLastFollowUp = lastFollowUp
      ? Math.floor((Date.now() - new Date(lastFollowUp.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // 获取商机信息
    const opportunities = await this.db
      .select()
      .from(schema.opportunities)
      .where(
        and(
          eq(schema.opportunities.customerId, customerId),
          eq(schema.opportunities.enterpriseId, enterpriseId),
          eq(schema.opportunities.isDeleted, false),
        ),
      );

    const activeOpportunities = opportunities.filter(o => o.status !== 'deal' && o.status !== 'lost');
    const wonOpportunities = opportunities.filter(o => o.status === 'deal');

    // 获取销售订单信息
    const orders = await this.db
      .select()
      .from(schema.salesOrders)
      .where(
        and(
          eq(schema.salesOrders.customerId, customerId),
          eq(schema.salesOrders.enterpriseId, enterpriseId),
        ),
      );

    const totalOrderAmount = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount || '0'), 0);

    // 1. 跟进频率建议
    if (!daysSinceLastFollowUp || daysSinceLastFollowUp > 7) {
      suggestions.push({
        type: 'follow_up',
        priority: daysSinceLastFollowUp && daysSinceLastFollowUp > 14 ? 'high' : 'medium',
        title: '需要跟进客户',
        content: `客户「${customer.name}」已有 ${daysSinceLastFollowUp || '很长一段'} 天未跟进，建议及时联系维护关系。`,
        suggestedAction: daysSinceLastFollowUp && daysSinceLastFollowUp > 14
          ? '发送关怀邮件或电话回访，了解客户最新需求'
          : '微信或电话简单问候，保持联系热度',
        reason: '长时间未跟进可能导致客户流失',
      });
    }

    // 2. 商机推进建议
    if (activeOpportunities.length > 0) {
      const highValueOpps = activeOpportunities.filter(o => parseFloat(o.estimatedAmount || '0') > 10000);
      
      for (const opp of highValueOpps) {
        const daysInStage = opp.expectedCloseAt
          ? Math.floor((new Date(opp.expectedCloseAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        if (daysInStage !== null && daysInStage < 7 && daysInStage > 0) {
          suggestions.push({
            type: 'deal',
            priority: 'high',
            title: '商机即将到期',
            content: `商机「${opp.name}」预计成交日期临近（${daysInStage}天后），当前进度：${opp.probability || 0}%。`,
            suggestedAction: '加快商务谈判节奏，提供优惠政策促成成交',
            reason: '商机预计成交日期临近，需要加速推进',
          });
        }
      }
    }

    // 3. 流失风险预警
    if (wonOpportunities.length > 0 && (!daysSinceLastFollowUp || daysSinceLastFollowUp > 30)) {
      suggestions.push({
        type: 'risk',
        priority: 'high',
        title: '客户流失风险',
        content: `客户「${customer.name}」历史有成交记录，但近期活跃度下降，存在流失风险。`,
        suggestedAction: '安排专人回访，了解客户满意度，推荐新产品或服务',
        reason: '历史成交客户长时间未活跃，可能转向竞争对手',
      });
    }

    // 4. 增购机会建议
    if (totalOrderAmount > 50000 && orders.length >= 3) {
      suggestions.push({
        type: 'opportunity',
        priority: 'medium',
        title: '潜在增购机会',
        content: `客户「${customer.name}」累计消费 ${totalOrderAmount.toFixed(2)} 元，是优质客户，可推荐升级方案或关联产品。`,
        suggestedAction: '根据购买历史，推荐配套产品或增值服务',
        reason: '高价值客户有增购潜力',
      });
    }

    // 5. 新客户需求挖掘
    if (orders.length === 0 && opportunities.length === 0 && recentFollowUps.length >= 2) {
      suggestions.push({
        type: 'opportunity',
        priority: 'medium',
        title: '转化潜在客户',
        content: `客户「${customer.name}」有多次跟进记录但尚未成交，建议深入了解需求痛点。`,
        suggestedAction: '安排产品演示或试用，提供针对性解决方案',
        reason: '多次跟进表明有兴趣，需要推动转化',
      });
    }

    return suggestions;
  }

  /**
   * 获取客户洞察报告
   */
  async getCustomerInsight(customerId: number, enterpriseId: number): Promise<CustomerInsight | null> {
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
      return null;
    }

    // 统计跟进记录
    const followUpStats = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
        lastDate: sql<Date>`MAX(${schema.followUpRecords.createdAt})`,
      })
      .from(schema.followUpRecords)
      .where(
        and(
          eq(schema.followUpRecords.customerId, customerId),
          eq(schema.followUpRecords.enterpriseId, enterpriseId),
        ),
      );

    const lastFollowUpDate = followUpStats[0]?.lastDate;
    const daysSinceLastFollowUp = lastFollowUpDate
      ? Math.floor((Date.now() - new Date(lastFollowUpDate).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // 统计商机
    const opportunityStats = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
        totalAmount: sql<string>`COALESCE(SUM(${schema.opportunities.actualAmount}), '0')`,
      })
      .from(schema.opportunities)
      .where(
        and(
          eq(schema.opportunities.customerId, customerId),
          eq(schema.opportunities.enterpriseId, enterpriseId),
          eq(schema.opportunities.isDeleted, false),
        ),
      );

    // 计算风险等级
    let riskLevel: 'high' | 'medium' | 'low' = 'low';
    if (daysSinceLastFollowUp > 30) {
      riskLevel = 'high';
    } else if (daysSinceLastFollowUp > 14) {
      riskLevel = 'medium';
    }

    const suggestions = await this.generateFollowUpSuggestions(customerId, enterpriseId);

    return {
      customerId,
      customerName: customer.name,
      lastFollowUpDays: daysSinceLastFollowUp,
      totalFollowUps: followUpStats[0]?.count || 0,
      opportunityCount: opportunityStats[0]?.count || 0,
      totalDealAmount: parseFloat(opportunityStats[0]?.totalAmount || '0'),
      riskLevel,
      suggestions,
    };
  }

  /**
   * 获取需要跟进的客户列表
   */
  async getCustomersNeedFollowUp(
    enterpriseId: number,
    options?: { days?: number; limit?: number },
  ): Promise<CustomerInsight[]> {
    const days = options?.days || 7;
    const limit = options?.limit || 20;

    // 获取所有客户
    const allCustomers = await this.db
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.enterpriseId, enterpriseId),
          eq(schema.customers.isDeleted, false),
        ),
      );

    const insights: CustomerInsight[] = [];

    for (const { id } of allCustomers.slice(0, limit * 2)) {
      const insight = await this.getCustomerInsight(id, enterpriseId);
      if (insight && insight.lastFollowUpDays >= days) {
        insights.push(insight);
      }
    }

    // 按风险等级排序
    const riskPriority = { high: 3, medium: 2, low: 1 };
    return insights
      .sort((a, b) => riskPriority[b.riskLevel] - riskPriority[a.riskLevel])
      .slice(0, limit);
  }

  /**
   * 生成跟进话术建议
   */
  async generateFollowUpScript(customerId: number, enterpriseId: number, context?: string): Promise<string> {
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
      return '';
    }

    // 获取最近的跟进记录
    const recentFollowUps = await this.db
      .select()
      .from(schema.followUpRecords)
      .where(
        and(
          eq(schema.followUpRecords.customerId, customerId),
          eq(schema.followUpRecords.enterpriseId, enterpriseId),
        ),
      )
      .orderBy(desc(schema.followUpRecords.createdAt))
      .limit(3);

    // 基于客户类型和跟进历史生成话术
    let script = `【${customer.name}】跟进话术建议：\n\n`;

    // 开场白
    if (recentFollowUps.length === 0) {
      script += `【开场白】\n您好，${customer.contactPerson || '负责人'}，我是${customer.assignedTo ? '您的专属顾问' : '优效营的顾问'}。\n`;
      script += `了解到贵公司在${customer.industry || '行业内'}发展不错，想了解一下我们在${context || '企业管理'}方面的解决方案是否能帮到您。\n\n`;
    } else {
      const lastContent = recentFollowUps[0].content.substring(0, 50);
      script += `【跟进开场】\n${customer.contactPerson || '您好'}，上次我们聊到${lastContent}...\n`;
      script += `不知道您那边考虑得怎么样了？\n\n`;
    }

    // 根据客户等级调整话术
    if (customer.level === 'VIP') {
      script += `【VIP客户专属】\n作为我们的VIP客户，您可以享受：\n`;
      script += `- 专属客服通道\n`;
      script += `- 优先技术支持\n`;
      script += `- 定制化解决方案\n\n`;
    }

    // 结束语
    script += `【结束语】\n`;
    script += `期待与您的进一步沟通，如有任何问题随时联系我。\n`;
    script += `祝您工作顺利！`;

    return script;
  }
}
