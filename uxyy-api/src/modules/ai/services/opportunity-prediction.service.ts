import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import * as schema from '../../../db/schema';

export interface OpportunityPrediction {
  opportunityId: number;
  customerName: string;
  opportunityName: string;
  currentStage: string;
  estimatedAmount: string;
  winProbability: number; // 0-100
  expectedCloseDate: string;
  predictionFactors: PredictionFactor[];
  recommendedActions: string[];
  riskLevel: 'high' | 'medium' | 'low';
}

export interface PredictionFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number; // 0-1
  description: string;
}

@Injectable()
export class OpportunityPredictionService {
  private readonly logger = new Logger(OpportunityPredictionService.name);

  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  /**
   * 预测单个商机成单概率
   */
  async predictOpportunity(
    opportunityId: number,
    enterpriseId: number,
  ): Promise<OpportunityPrediction> {
    // 获取商机信息
    const [opportunity] = await this.db
      .select({
        opportunity: schema.opportunities,
        customer: schema.customers,
      })
      .from(schema.opportunities)
      .leftJoin(
        schema.customers,
        eq(schema.opportunities.customerId, schema.customers.id),
      )
      .where(
        and(
          eq(schema.opportunities.id, opportunityId),
          eq(schema.opportunities.enterpriseId, enterpriseId),
        ),
      );

    if (!opportunity) {
      throw new Error('商机不存在');
    }

    const factors: PredictionFactor[] = [];
    let baseProbability = 20; // 基础概率20%

    // 1. 阶段因子 (使用 status 字段作为 stage)
    const stageWeights: Record<string, number> = {
      potential: 10,
      intention: 25,
      quotation: 45,
      deal: 70,
      after_sales: 100,
      lost: 0,
    };
    const stageNames: Record<string, string> = {
      potential: '初步接触',
      intention: '需求确认',
      quotation: '方案报价',
      deal: '谈判阶段',
      after_sales: '赢单',
      lost: '输单',
    };
    const stage = opportunity.opportunity.status || 'potential';
    const stageWeight = stageWeights[stage] || 20;
    factors.push({
      name: '销售阶段',
      impact: stageWeight > 50 ? 'positive' : 'neutral',
      weight: 0.3,
      description: `当前处于${stageNames[stage] || stage}阶段，该阶段平均成单率${stageWeight}%`,
    });

    // 2. 跟进频率因子
    const recentFollowUps = await this.db
      .select()
      .from(schema.followUpRecords)
      .where(
        and(
          eq(
            schema.followUpRecords.customerId,
            opportunity.opportunity.customerId,
          ),
          eq(schema.followUpRecords.enterpriseId, enterpriseId),
        ),
      )
      .orderBy(desc(schema.followUpRecords.createdAt))
      .limit(10);

    const daysSinceLastFollowUp = recentFollowUps[0]
      ? Math.floor(
          (Date.now() - new Date(recentFollowUps[0].createdAt).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    if (daysSinceLastFollowUp !== null) {
      if (daysSinceLastFollowUp <= 3) {
        factors.push({
          name: '跟进频率',
          impact: 'positive',
          weight: 0.15,
          description: `最近${daysSinceLastFollowUp}天内有跟进，沟通活跃`,
        });
        baseProbability += 10;
      } else if (daysSinceLastFollowUp <= 7) {
        factors.push({
          name: '跟进频率',
          impact: 'neutral',
          weight: 0.1,
          description: `最近${daysSinceLastFollowUp}天内有跟进，跟进正常`,
        });
        baseProbability += 5;
      } else {
        factors.push({
          name: '跟进频率',
          impact: 'negative',
          weight: 0.15,
          description: `已${daysSinceLastFollowUp}天未跟进，需加强沟通`,
        });
        baseProbability -= 10;
      }
    } else {
      factors.push({
        name: '跟进频率',
        impact: 'negative',
        weight: 0.2,
        description: '暂无跟进记录，建议尽快联系客户',
      });
      baseProbability -= 15;
    }

    // 3. 历史成交因子
    const customerOrders = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
        total: sql<string>`COALESCE(SUM(${schema.salesOrders.totalAmount}), '0')`,
      })
      .from(schema.salesOrders)
      .where(
        and(
          eq(schema.salesOrders.customerId, opportunity.opportunity.customerId),
          eq(schema.salesOrders.enterpriseId, enterpriseId),
          eq(schema.salesOrders.status, 'completed'),
        ),
      );

    if (customerOrders[0]?.count > 0) {
      factors.push({
        name: '客户忠诚度',
        impact: 'positive',
        weight: 0.2,
        description: `历史成交${customerOrders[0].count}单，总金额${customerOrders[0].total}元，老客户复购概率高`,
      });
      baseProbability += 15;
    } else {
      factors.push({
        name: '客户类型',
        impact: 'neutral',
        weight: 0.1,
        description: '新客户，需更多时间建立信任',
      });
    }

    // 4. 预计成交时间因子 (使用 expectedCloseAt 字段)
    if (opportunity.opportunity.expectedCloseAt) {
      const daysToClose = Math.floor(
        (new Date(opportunity.opportunity.expectedCloseAt).getTime() -
          Date.now()) /
          (1000 * 60 * 60 * 24),
      );

      if (daysToClose < 0) {
        factors.push({
          name: '成交时效',
          impact: 'negative',
          weight: 0.15,
          description: '已超过预计成交日期，存在流失风险',
        });
        baseProbability -= 15;
      } else if (daysToClose <= 7) {
        factors.push({
          name: '成交时效',
          impact: 'positive',
          weight: 0.1,
          description: '预计近期成交，需重点跟进',
        });
        baseProbability += 5;
      } else if (daysToClose <= 30) {
        factors.push({
          name: '成交时效',
          impact: 'neutral',
          weight: 0.05,
          description: `预计${daysToClose}天内成交，时间充裕`,
        });
      } else {
        factors.push({
          name: '成交时效',
          impact: 'neutral',
          weight: 0.05,
          description: `预计${daysToClose}天后成交，周期较长`,
        });
        baseProbability -= 5;
      }
    }

    // 5. 报价因子 (根据状态判断)
    if (
      opportunity.opportunity.status === 'quotation' ||
      opportunity.opportunity.status === 'deal' ||
      opportunity.opportunity.status === 'after_sales'
    ) {
      factors.push({
        name: '报价状态',
        impact: 'positive',
        weight: 0.1,
        description: '已进入报价或后续阶段，客户正在评估',
      });
      baseProbability += 10;
    }

    // 计算最终概率
    const winProbability = Math.max(0, Math.min(100, baseProbability));

    // 确定风险等级
    let riskLevel: 'high' | 'medium' | 'low' = 'medium';
    if (winProbability < 30) riskLevel = 'high';
    else if (winProbability > 70) riskLevel = 'low';

    // 生成建议
    const recommendedActions = this.generateRecommendations(
      factors,
      winProbability,
      daysSinceLastFollowUp,
    );

    return {
      opportunityId,
      customerName: opportunity.customer?.name || '未知客户',
      opportunityName: opportunity.opportunity.name,
      currentStage: opportunity.opportunity.status || 'potential',
      estimatedAmount: opportunity.opportunity.estimatedAmount || '0',
      winProbability,
      expectedCloseDate:
        opportunity.opportunity.expectedCloseAt?.toISOString().split('T')[0] ||
        '',
      predictionFactors: factors,
      recommendedActions,
      riskLevel,
    };
  }

  /**
   * 批量预测商机
   */
  async batchPredictOpportunities(enterpriseId: number, stage?: string) {
    const conditions = [
      eq(schema.opportunities.enterpriseId, enterpriseId),
      sql`${schema.opportunities.status} NOT IN ('after_sales', 'lost')`,
    ];

    if (stage) {
      conditions.push(eq(schema.opportunities.status, stage));
    }

    const opportunities = await this.db
      .select({ id: schema.opportunities.id })
      .from(schema.opportunities)
      .where(and(...conditions));
    const predictions: OpportunityPrediction[] = [];

    for (const { id } of opportunities) {
      try {
        const prediction = await this.predictOpportunity(id, enterpriseId);
        predictions.push(prediction);
      } catch (e) {
        this.logger.error(`预测商机${id}失败`, e);
      }
    }

    // 按成单概率排序
    return predictions.sort((a, b) => b.winProbability - a.winProbability);
  }

  /**
   * 获取销售漏斗预测
   */
  async getSalesFunnelPrediction(enterpriseId: number) {
    const stages = ['初步接触', '需求确认', '方案报价', '谈判阶段'];
    const funnel = [];

    for (const stage of stages) {
      const opportunities = await this.batchPredictOpportunities(
        enterpriseId,
        stage,
      );
      const totalAmount = opportunities.reduce(
        (sum, o) => sum + parseFloat(o.estimatedAmount || '0'),
        0,
      );
      const avgProbability =
        opportunities.length > 0
          ? opportunities.reduce((sum, o) => sum + o.winProbability, 0) /
            opportunities.length
          : 0;
      const weightedAmount = totalAmount * (avgProbability / 100);

      funnel.push({
        stage,
        opportunityCount: opportunities.length,
        totalAmount: totalAmount.toFixed(2),
        avgWinProbability: avgProbability.toFixed(2),
        weightedAmount: weightedAmount.toFixed(2),
        opportunities: opportunities.slice(0, 5), // 前5个商机
      });
    }

    return funnel;
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    factors: PredictionFactor[],
    winProbability: number,
    daysSinceLastFollowUp: number | null,
  ): string[] {
    const recommendations: string[] = [];

    // 基于概率的建议
    if (winProbability < 30) {
      recommendations.push('⚠️ 成单概率较低，建议重新评估客户需求或调整方案');
      recommendations.push('💡 考虑邀请技术专家或高层参与，提升客户信任度');
    } else if (winProbability < 60) {
      recommendations.push('📈 成单概率中等，需加强跟进频率');
      recommendations.push('🎯 明确客户决策流程和关键决策人');
    } else {
      recommendations.push('✅ 成单概率较高，保持当前跟进节奏');
      recommendations.push('📝 准备合同条款，提前走内部审批流程');
    }

    // 基于因子的建议
    const hasFollowUpIssue = factors.find(
      (f) => f.name === '跟进频率' && f.impact === 'negative',
    );
    if (hasFollowUpIssue) {
      recommendations.push(
        `📞 ${hasFollowUpIssue.description}，建议24小时内联系客户`,
      );
    }

    const isNewCustomer = factors.find((f) => f.name === '客户类型');
    if (isNewCustomer) {
      recommendations.push('🤝 新客户需重点建立信任，可提供案例参考或试用机会');
    }

    const hasTimeIssue = factors.find(
      (f) => f.name === '成交时效' && f.impact === 'negative',
    );
    if (hasTimeIssue) {
      recommendations.push(
        '⏰ 已超过预计成交时间，建议了解客户延迟原因，调整方案或时间预期',
      );
    }

    return recommendations;
  }
}
