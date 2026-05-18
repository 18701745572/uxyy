import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import { AccountingLearningService } from './accounting-learning.service';

// 推荐类型
export type RecommendationType = 'account' | 'template' | 'summary' | 'action';

// 推荐项
export interface RecommendationItem {
  type: RecommendationType;
  context: any;
  recommendation: any;
  confidence: number;
  reason: string;
}

// 科目推荐结果
export interface AccountRecommendation {
  accountId: number;
  accountCode: string;
  accountName: string;
  confidence: number;
  reason: string;
  basedOn: string;
}

// 智能补全建议
export interface AutoCompleteSuggestion {
  field: string;
  value: string;
  confidence: number;
  alternatives: string[];
}

@Injectable()
export class AIRecommendationService {
  private readonly logger = new Logger(AIRecommendationService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
    private readonly learningService: AccountingLearningService,
  ) {}

  /**
   * 智能科目推荐
   * 根据上下文推荐最合适的会计科目
   */
  async recommendAccount(
    enterpriseId: number,
    context: {
      summary?: string;
      counterpartyName?: string;
      amount?: number;
      businessType?: string;
      historicalAccounts?: number[];
    },
  ): Promise<AccountRecommendation[]> {
    const recommendations: AccountRecommendation[] = [];
    const { summary, counterpartyName, amount, businessType } = context;

    // 1. 基于摘要关键词匹配
    if (summary) {
      const summaryMatches = await this.findBySummary(summary, enterpriseId);
      recommendations.push(...summaryMatches);
    }

    // 2. 基于交易对手匹配
    if (counterpartyName) {
      const counterpartyMatches = await this.findByCounterparty(
        counterpartyName,
        enterpriseId,
      );
      recommendations.push(...counterpartyMatches);
    }

    // 3. 基于金额范围匹配
    if (amount) {
      const amountMatches = await this.findByAmount(amount, enterpriseId);
      recommendations.push(...amountMatches);
    }

    // 4. 基于业务类型匹配
    if (businessType) {
      const businessMatches = await this.findByBusinessType(
        businessType,
        enterpriseId,
      );
      recommendations.push(...businessMatches);
    }

    // 5. 基于历史使用频率
    const frequencyMatches = await this.findByFrequency(enterpriseId);
    recommendations.push(...frequencyMatches);

    // 去重并按置信度排序
    const uniqueRecommendations = this.deduplicateAndSort(recommendations);

    // 记录推荐
    for (const rec of uniqueRecommendations.slice(0, 3)) {
      await this.saveRecommendation(enterpriseId, 'account', context, rec);
    }

    return uniqueRecommendations.slice(0, 5);
  }

  /**
   * 基于摘要关键词查找
   */
  private async findBySummary(
    summary: string,
    enterpriseId: number,
  ): Promise<AccountRecommendation[]> {
    const recommendations: AccountRecommendation[] = [];
    const summaryLower = summary.toLowerCase();

    // 查询学习记录中的摘要模式
    const patterns = await this.db
      .select()
      .from(schema.aiLearningRecords)
      .where(
        and(
          eq(schema.aiLearningRecords.enterpriseId, enterpriseId),
          eq(schema.aiLearningRecords.category, 'summary_pattern'),
        ),
      );

    for (const pattern of patterns) {
      const value = pattern.value as any;
      const keywords = value.keywords || [];

      // 检查关键词匹配
      let matchCount = 0;
      for (const kw of keywords) {
        if (summaryLower.includes(kw.word.toLowerCase())) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        const confidence = Math.min(
          0.95,
          0.5 + matchCount * 0.15 + parseFloat(pattern.confidence || '0') * 0.3,
        );

        recommendations.push({
          accountId: value.accountId,
          accountCode: value.accountCode,
          accountName: value.accountName,
          confidence,
          reason: `摘要匹配${matchCount}个关键词`,
          basedOn: 'summary_pattern',
        });
      }
    }

    return recommendations;
  }

  /**
   * 基于交易对手查找
   */
  private async findByCounterparty(
    counterpartyName: string,
    enterpriseId: number,
  ): Promise<AccountRecommendation[]> {
    const recommendations: AccountRecommendation[] = [];

    // 查询历史上该对手的记账记录
    const historicalEntries = await this.db.execute(sql`
      SELECT 
        vi.account_id,
        a.code as account_code,
        a.name as account_name,
        COUNT(*) as usage_count,
        SUM(CAST(COALESCE(vi.debit_amount, '0') AS DECIMAL) + 
            CAST(COALESCE(vi.credit_amount, '0') AS DECIMAL)) as total_amount
      FROM ${schema.voucherItemAuxiliaries} via
      JOIN ${schema.voucherItems} vi ON via.voucher_item_id = vi.id
      JOIN ${schema.vouchers} v ON vi.voucher_id = v.id
      JOIN ${schema.accounts} a ON vi.account_id = a.id
      WHERE v.enterprise_id = ${enterpriseId}
        AND via.auxiliary_type IN ('customer', 'supplier')
        AND via.auxiliary_name = ${counterpartyName}
      GROUP BY vi.account_id, a.code, a.name
      ORDER BY usage_count DESC
      LIMIT 5
    `);

    for (const row of historicalEntries as unknown as any[]) {
      const confidence = Math.min(0.95, 0.5 + parseInt(row.usage_count) * 0.1);
      recommendations.push({
        accountId: row.account_id,
        accountCode: row.account_code,
        accountName: row.account_name,
        confidence,
        reason: `历史上与${counterpartyName}经常使用此科目`,
        basedOn: 'counterparty_history',
      });
    }

    return recommendations;
  }

  /**
   * 基于金额范围查找
   */
  private async findByAmount(
    amount: number,
    enterpriseId: number,
  ): Promise<AccountRecommendation[]> {
    const recommendations: AccountRecommendation[] = [];

    // 查询金额模式
    const patterns = await this.db
      .select()
      .from(schema.aiLearningRecords)
      .where(
        and(
          eq(schema.aiLearningRecords.enterpriseId, enterpriseId),
          eq(schema.aiLearningRecords.category, 'amount_pattern'),
        ),
      );

    for (const pattern of patterns) {
      const value = pattern.value as any;
      const avgAmount = value.avgAmount;
      const minAmount = value.minAmount;
      const maxAmount = value.maxAmount;

      // 检查金额是否在常见范围内
      if (amount >= minAmount * 0.5 && amount <= maxAmount * 1.5) {
        const deviation = Math.abs(amount - avgAmount) / avgAmount;
        const confidence = Math.max(0.3, 0.9 - deviation);

        recommendations.push({
          accountId: value.accountId,
          accountCode: value.accountCode,
          accountName: value.accountName,
          confidence,
          reason: `金额${amount}符合该科目常见范围(${minAmount}-${maxAmount})`,
          basedOn: 'amount_pattern',
        });
      }
    }

    return recommendations;
  }

  /**
   * 基于业务类型查找
   */
  private async findByBusinessType(
    businessType: string,
    enterpriseId: number,
  ): Promise<AccountRecommendation[]> {
    const recommendations: AccountRecommendation[] = [];

    // 查询科目映射规则
    const rules = await this.db
      .select({
        rule: schema.accountMappingRules,
        debitAccount: schema.accounts,
        creditAccount: schema.accounts,
      })
      .from(schema.accountMappingRules)
      .leftJoin(
        schema.accounts,
        eq(schema.accountMappingRules.debitAccountId, schema.accounts.id),
      )
      .leftJoin(
        schema.accounts,
        eq(schema.accountMappingRules.creditAccountId, schema.accounts.id),
      )
      .where(
        and(
          eq(schema.accountMappingRules.enterpriseId, enterpriseId),
          eq(schema.accountMappingRules.businessType, businessType),
          eq(schema.accountMappingRules.isActive, true),
        ),
      );

    for (const { rule, debitAccount, creditAccount } of rules) {
      if (debitAccount) {
        recommendations.push({
          accountId: debitAccount.id,
          accountCode: debitAccount.code,
          accountName: debitAccount.name,
          confidence: 0.9,
          reason: `业务类型"${businessType}"的默认借方科目`,
          basedOn: 'mapping_rule',
        });
      }
      if (creditAccount) {
        recommendations.push({
          accountId: creditAccount.id,
          accountCode: creditAccount.code,
          accountName: creditAccount.name,
          confidence: 0.9,
          reason: `业务类型"${businessType}"的默认贷方科目`,
          basedOn: 'mapping_rule',
        });
      }
    }

    return recommendations;
  }

  /**
   * 基于使用频率查找
   */
  private async findByFrequency(
    enterpriseId: number,
  ): Promise<AccountRecommendation[]> {
    const recommendations: AccountRecommendation[] = [];

    // 查询最常用的科目
    const popularAccounts = await this.db.execute(sql`
      SELECT 
        vi.account_id,
        a.code as account_code,
        a.name as account_name,
        COUNT(*) as usage_count
      FROM ${schema.voucherItems} vi
      JOIN ${schema.vouchers} v ON vi.voucher_id = v.id
      JOIN ${schema.accounts} a ON vi.account_id = a.id
      WHERE v.enterprise_id = ${enterpriseId}
        AND v.created_at >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY vi.account_id, a.code, a.name
      ORDER BY usage_count DESC
      LIMIT 10
    `);

    for (const row of popularAccounts as unknown as any[]) {
      const confidence = Math.min(0.7, 0.3 + parseInt(row.usage_count) * 0.02);
      recommendations.push({
        accountId: row.account_id,
        accountCode: row.account_code,
        accountName: row.account_name,
        confidence,
        reason: `近期使用${row.usage_count}次`,
        basedOn: 'frequency',
      });
    }

    return recommendations;
  }

  /**
   * 去重并按置信度排序
   */
  private deduplicateAndSort(
    recommendations: AccountRecommendation[],
  ): AccountRecommendation[] {
    const seen = new Map<number, AccountRecommendation>();

    for (const rec of recommendations) {
      const existing = seen.get(rec.accountId);
      if (!existing || rec.confidence > existing.confidence) {
        seen.set(rec.accountId, rec);
      }
    }

    return Array.from(seen.values()).sort(
      (a, b) => b.confidence - a.confidence,
    );
  }

  /**
   * 智能摘要补全
   */
  async autoCompleteSummary(
    enterpriseId: number,
    partialSummary: string,
    accountId?: number,
  ): Promise<AutoCompleteSuggestion> {
    const partialLower = partialSummary.toLowerCase();

    // 查询历史摘要
    const conditions = [
      eq(schema.vouchers.enterpriseId, enterpriseId),
      sql`${schema.voucherItems.summary} ILIKE ${`%${partialSummary}%`}`,
    ];

    if (accountId) {
      conditions.push(eq(schema.voucherItems.accountId, accountId));
    }

    const summaries = await this.db
      .select({ summary: schema.voucherItems.summary })
      .from(schema.voucherItems)
      .leftJoin(
        schema.vouchers,
        eq(schema.voucherItems.voucherId, schema.vouchers.id),
      )
      .where(and(...conditions))
      .limit(20);

    // 统计频次
    const freqMap = new Map<string, number>();
    for (const { summary } of summaries) {
      if (!summary) continue;
      freqMap.set(summary, (freqMap.get(summary) || 0) + 1);
    }

    // 找出最常用
    const sorted = Array.from(freqMap.entries()).sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
      return {
        field: 'summary',
        value: partialSummary,
        confidence: 0,
        alternatives: [],
      };
    }

    const [topChoice, topCount] = sorted[0];
    const total = summaries.length;
    const confidence = topCount / total;

    return {
      field: 'summary',
      value: topChoice,
      confidence,
      alternatives: sorted.slice(1, 4).map(([s]) => s),
    };
  }

  /**
   * 智能凭证补全
   * 根据已有分录，推荐补全对方科目
   */
  async autoCompleteVoucher(
    enterpriseId: number,
    existingEntries: Array<{
      accountId: number;
      direction: 'debit' | 'credit';
      amount: string;
    }>,
  ): Promise<AccountRecommendation[]> {
    if (existingEntries.length === 0) {
      return [];
    }

    // 计算借贷差额
    let debitTotal = 0;
    let creditTotal = 0;

    for (const entry of existingEntries) {
      const amount = parseFloat(entry.amount);
      if (entry.direction === 'debit') {
        debitTotal += amount;
      } else {
        creditTotal += amount;
      }
    }

    const difference = Math.abs(debitTotal - creditTotal);
    if (difference < 0.01) {
      return []; // 已经平衡
    }

    // 确定需要的方向和金额
    const neededDirection = debitTotal > creditTotal ? 'credit' : 'debit';

    // 查询历史上与这些科目经常一起使用的科目
    const accountIds = existingEntries.map((e) => e.accountId);

    // 使用学习记录中的科目组合
    const patterns = await this.db
      .select()
      .from(schema.aiLearningRecords)
      .where(
        and(
          eq(schema.aiLearningRecords.enterpriseId, enterpriseId),
          eq(schema.aiLearningRecords.category, 'account_pair'),
        ),
      );

    const recommendations: AccountRecommendation[] = [];

    for (const pattern of patterns) {
      const value = pattern.value as any;

      // 检查是否与现有科目匹配
      const matchesDebit = accountIds.includes(value.debitAccountId);
      const matchesCredit = accountIds.includes(value.creditAccountId);

      if (neededDirection === 'credit' && matchesDebit && !matchesCredit) {
        recommendations.push({
          accountId: value.creditAccountId,
          accountCode: value.creditAccountCode,
          accountName: value.creditAccountName,
          confidence: parseFloat(pattern.confidence || '0.5'),
          reason: `历史上经常与${value.debitAccountName}一起使用`,
          basedOn: 'pair_completion',
        });
      } else if (
        neededDirection === 'debit' &&
        matchesCredit &&
        !matchesDebit
      ) {
        recommendations.push({
          accountId: value.debitAccountId,
          accountCode: value.debitAccountCode,
          accountName: value.debitAccountName,
          confidence: parseFloat(pattern.confidence || '0.5'),
          reason: `历史上经常与${value.creditAccountName}一起使用`,
          basedOn: 'pair_completion',
        });
      }
    }

    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  /**
   * 推荐凭证模板
   */
  async recommendTemplate(
    enterpriseId: number,
    context: {
      summary?: string;
      accounts?: number[];
    },
  ): Promise<
    Array<{
      templateId: number;
      templateName: string;
      confidence: number;
      reason: string;
    }>
  > {
    const recommendations: Array<{
      templateId: number;
      templateName: string;
      confidence: number;
      reason: string;
    }> = [];

    // 基于摘要匹配
    if (context.summary) {
      const summaryLower = context.summary.toLowerCase();

      const templates = await this.db
        .select()
        .from(schema.voucherTemplates)
        .where(
          and(
            eq(schema.voucherTemplates.enterpriseId, enterpriseId),
            eq(schema.voucherTemplates.isActive, true),
          ),
        );

      for (const template of templates) {
        const templateNameLower = template.templateName.toLowerCase();
        const summaryLower2 = (template.summary || '').toLowerCase();

        // 简单匹配
        if (
          summaryLower.includes(templateNameLower) ||
          templateNameLower.includes(summaryLower) ||
          summaryLower.includes(summaryLower2)
        ) {
          recommendations.push({
            templateId: template.id,
            templateName: template.templateName,
            confidence: 0.8,
            reason: '摘要与模板名称匹配',
          });
        }
      }
    }

    // 基于科目匹配
    if (context.accounts && context.accounts.length > 0) {
      const templates = await this.db
        .select()
        .from(schema.voucherTemplates)
        .where(
          and(
            eq(schema.voucherTemplates.enterpriseId, enterpriseId),
            eq(schema.voucherTemplates.isActive, true),
          ),
        );

      for (const template of templates) {
        const entries = template.entries as any[];
        const templateAccountIds = entries.map((e: any) => e.accountId);

        // 计算交集
        const intersection = context.accounts.filter((id) =>
          templateAccountIds.includes(id),
        );

        if (intersection.length > 0) {
          const confidence = intersection.length / context.accounts.length;
          recommendations.push({
            templateId: template.id,
            templateName: template.templateName,
            confidence,
            reason: `科目匹配度 ${(confidence * 100).toFixed(0)}%`,
          });
        }
      }
    }

    // 基于使用频率
    const popularTemplates = await this.db
      .select()
      .from(schema.voucherTemplates)
      .where(
        and(
          eq(schema.voucherTemplates.enterpriseId, enterpriseId),
          eq(schema.voucherTemplates.isActive, true),
        ),
      )
      .orderBy(desc(schema.voucherTemplates.usageCount))
      .limit(5);

    for (const template of popularTemplates) {
      const usageCount = template.usageCount ?? 0;
      if (usageCount > 0) {
        recommendations.push({
          templateId: template.id,
          templateName: template.templateName,
          confidence: Math.min(0.6, usageCount * 0.02),
          reason: `使用${usageCount}次`,
        });
      }
    }

    // 去重并排序
    const seen = new Map<number, (typeof recommendations)[0]>();
    for (const rec of recommendations) {
      const existing = seen.get(rec.templateId);
      if (!existing || rec.confidence > existing.confidence) {
        seen.set(rec.templateId, rec);
      }
    }

    return Array.from(seen.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  /**
   * 保存推荐记录
   */
  private async saveRecommendation(
    enterpriseId: number,
    type: RecommendationType,
    context: any,
    recommendation: any,
  ): Promise<void> {
    await this.db.insert(schema.aiRecommendations).values({
      enterpriseId,
      recommendationType: type,
      context,
      recommendation,
      confidence: recommendation.confidence?.toFixed(2) || '0.5',
    });
  }

  /**
   * 记录推荐采纳
   */
  async acceptRecommendation(
    recommendationId: number,
    enterpriseId: number,
  ): Promise<void> {
    await this.db
      .update(schema.aiRecommendations)
      .set({
        isAccepted: true,
        acceptedAt: new Date(),
      })
      .where(
        and(
          eq(schema.aiRecommendations.id, recommendationId),
          eq(schema.aiRecommendations.enterpriseId, enterpriseId),
        ),
      );
  }

  /**
   * 获取推荐统计
   */
  async getRecommendationStats(
    enterpriseId: number,
    days: number = 30,
  ): Promise<{
    total: number;
    accepted: number;
    acceptanceRate: number;
    byType: Record<string, { total: number; accepted: number }>;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const recommendations = await this.db
      .select()
      .from(schema.aiRecommendations)
      .where(
        and(
          eq(schema.aiRecommendations.enterpriseId, enterpriseId),
          sql`${schema.aiRecommendations.createdAt} >= ${since}`,
        ),
      );

    const total = recommendations.length;
    const accepted = recommendations.filter(
      (r: (typeof recommendations)[0]) => r.isAccepted,
    ).length;

    const byType: Record<string, { total: number; accepted: number }> = {};

    for (const rec of recommendations) {
      const type = rec.recommendationType;
      if (!byType[type]) {
        byType[type] = { total: 0, accepted: 0 };
      }
      byType[type].total++;
      if (rec.isAccepted) {
        byType[type].accepted++;
      }
    }

    return {
      total,
      accepted,
      acceptanceRate: total > 0 ? accepted / total : 0,
      byType,
    };
  }
}
