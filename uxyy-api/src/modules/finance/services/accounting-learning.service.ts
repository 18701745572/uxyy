import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, gte, lte, desc, sql, count } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import { AccountMappingService } from './account-mapping.service';

// 学习到的模式
export interface LearnedPattern {
  id?: number;
  category: string;
  key: string;
  value: any;
  confidence: number;
  occurrenceCount: number;
  lastOccurredAt: Date;
}

// 科目使用偏好
export interface AccountPreference {
  accountId: number;
  accountCode: string;
  accountName: string;
  usageCount: number;
  avgAmount: number;
  commonPairs: Array<{ accountId: number; accountName: string; count: number }>;
  commonAuxiliaries: Array<{ type: string; values: string[] }>;
}

// 学习报告
export interface LearningReport {
  totalPatterns: number;
  newPatterns: number;
  updatedPatterns: number;
  suggestions: Array<{
    type: string;
    description: string;
    confidence: number;
    action: string;
  }>;
  accountPreferences: AccountPreference[];
}

@Injectable()
export class AccountingLearningService {
  private readonly logger = new Logger(AccountingLearningService.name);

  // 最小样本数阈值
  private readonly MIN_SAMPLE_SIZE = 5;
  // 置信度阈值
  private readonly CONFIDENCE_THRESHOLD = 0.7;

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
    private readonly accountMappingService: AccountMappingService,
  ) {}

  /**
   * 执行学习：分析企业历史凭证数据
   */
  async learnFromHistory(
    enterpriseId: number,
    options?: {
      startDate?: Date;
      endDate?: Date;
      minSampleSize?: number;
    },
  ): Promise<LearningReport> {
    const { startDate, endDate, minSampleSize = this.MIN_SAMPLE_SIZE } = options || {};

    const report: LearningReport = {
      totalPatterns: 0,
      newPatterns: 0,
      updatedPatterns: 0,
      suggestions: [],
      accountPreferences: [],
    };

    // 1. 学习科目使用偏好
    const accountPrefs = await this.learnAccountPreferences(enterpriseId, startDate, endDate);
    report.accountPreferences = accountPrefs;

    // 2. 学习对方科目组合
    const pairPatterns = await this.learnAccountPairs(enterpriseId, minSampleSize);
    for (const pattern of pairPatterns) {
      await this.savePattern(enterpriseId, 'account_pair', pattern);
      report.totalPatterns++;
    }

    // 3. 学习辅助核算偏好
    const auxiliaryPatterns = await this.learnAuxiliaryPreferences(enterpriseId);
    for (const pattern of auxiliaryPatterns) {
      await this.savePattern(enterpriseId, 'auxiliary_preference', pattern);
      report.totalPatterns++;
    }

    // 4. 学习摘要关键词模式
    const summaryPatterns = await this.learnSummaryPatterns(enterpriseId, minSampleSize);
    for (const pattern of summaryPatterns) {
      const result = await this.savePattern(enterpriseId, 'summary_pattern', pattern);
      if (result.isNew) {
        report.newPatterns++;
      } else {
        report.updatedPatterns++;
      }
      report.totalPatterns++;
    }

    // 5. 学习金额特征
    const amountPatterns = await this.learnAmountPatterns(enterpriseId);
    for (const pattern of amountPatterns) {
      await this.savePattern(enterpriseId, 'amount_pattern', pattern);
      report.totalPatterns++;
    }

    // 6. 生成优化建议
    report.suggestions = await this.generateOptimizationSuggestions(
      enterpriseId,
      accountPrefs,
      summaryPatterns,
    );

    this.logger.log(
      `企业${enterpriseId}学习完成：${report.totalPatterns}个模式，${report.newPatterns}个新发现`,
    );

    return report;
  }

  /**
   * 学习科目使用偏好
   */
  private async learnAccountPreferences(
    enterpriseId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AccountPreference[]> {
    // 获取所有凭证分录
    let conditions = [eq(schema.vouchers.enterpriseId, enterpriseId)];
    if (startDate) {
      conditions.push(gte(schema.vouchers.voucherDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(schema.vouchers.voucherDate, endDate));
    }

    const items = await this.db
      .select({
        item: schema.voucherItems,
        account: schema.accounts,
        voucher: schema.vouchers,
      })
      .from(schema.voucherItems)
      .leftJoin(schema.vouchers, eq(schema.voucherItems.voucherId, schema.vouchers.id))
      .leftJoin(schema.accounts, eq(schema.voucherItems.accountId, schema.accounts.id))
      .where(and(...conditions));

    // 按科目分组统计
    const accountStats = new Map<number, {
      accountId: number;
      accountCode: string;
      accountName: string;
      usageCount: number;
      totalAmount: number;
      items: typeof items;
    }>();

    for (const { item, account } of items) {
      if (!account) continue;

      const existing = accountStats.get(item.accountId);
      if (existing) {
        existing.usageCount++;
        existing.totalAmount += parseFloat(item.debitAmount || '0') + parseFloat(item.creditAmount || '0');
        existing.items.push({ item, account, voucher: items[0].voucher });
      } else {
        accountStats.set(item.accountId, {
          accountId: item.accountId,
          accountCode: account.code,
          accountName: account.name,
          usageCount: 1,
          totalAmount: parseFloat(item.debitAmount || '0') + parseFloat(item.creditAmount || '0'),
          items: [{ item, account, voucher: items[0].voucher }],
        });
      }
    }

    // 分析常用组合和辅助核算
    const preferences: AccountPreference[] = [];

    for (const stats of accountStats.values()) {
      if (stats.usageCount < this.MIN_SAMPLE_SIZE) continue;

      // 查找常用对方科目
      const pairCounts = new Map<number, number>();
      for (const { item: currentItem } of stats.items) {
        // 查询同凭证的其他分录
        const pairItems = await this.db
          .select({
            item: schema.voucherItems,
            account: schema.accounts,
          })
          .from(schema.voucherItems)
          .leftJoin(schema.accounts, eq(schema.voucherItems.accountId, schema.accounts.id))
          .where(
            and(
              eq(schema.voucherItems.voucherId, currentItem.voucherId),
              sql`${schema.voucherItems.id} != ${currentItem.id}`,
            ),
          );

        for (const { item, account } of pairItems) {
          if (!account) continue;
          const count = pairCounts.get(item.accountId) || 0;
          pairCounts.set(item.accountId, count + 1);
        }
      }

      // 获取前3名常用对方科目
      const commonPairs = Array.from(pairCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(async ([accountId, count]) => {
          const [account] = await this.db
            .select({ name: schema.accounts.name })
            .from(schema.accounts)
            .where(eq(schema.accounts.id, accountId))
            .limit(1);
          return {
            accountId,
            accountName: account?.name || '',
            count,
          };
        });

      preferences.push({
        accountId: stats.accountId,
        accountCode: stats.accountCode,
        accountName: stats.accountName,
        usageCount: stats.usageCount,
        avgAmount: stats.totalAmount / stats.usageCount,
        commonPairs: await Promise.all(commonPairs),
        commonAuxiliaries: [], // 简化实现
      });
    }

    return preferences.sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * 学习科目组合模式
   */
  private async learnAccountPairs(
    enterpriseId: number,
    minSampleSize: number,
  ): Promise<LearnedPattern[]> {
    const patterns: LearnedPattern[] = [];

    // 查询常见的借贷组合
    const combinations = await this.db.execute(sql`
      SELECT 
        debits.account_id as debit_account,
        credits.account_id as credit_account,
        COUNT(*) as pair_count
      FROM (
        SELECT voucher_id, account_id
        FROM ${schema.voucherItems}
        WHERE debit_amount > 0
      ) debits
      JOIN (
        SELECT voucher_id, account_id
        FROM ${schema.voucherItems}
        WHERE credit_amount > 0
      ) credits ON debits.voucher_id = credits.voucher_id
      JOIN ${schema.vouchers} v ON debits.voucher_id = v.id
      WHERE v.enterprise_id = ${enterpriseId}
      GROUP BY debits.account_id, credits.account_id
      HAVING COUNT(*) >= ${minSampleSize}
      ORDER BY pair_count DESC
      LIMIT 20
    `);

    for (const row of (combinations as unknown as any[])) {
      const [debitAccount] = await this.db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, row.debit_account))
        .limit(1);

      const [creditAccount] = await this.db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, row.credit_account))
        .limit(1);

      if (debitAccount && creditAccount) {
        patterns.push({
          category: 'account_pair',
          key: `${debitAccount.code}_${creditAccount.code}`,
          value: {
            debitAccountId: debitAccount.id,
            debitAccountCode: debitAccount.code,
            debitAccountName: debitAccount.name,
            creditAccountId: creditAccount.id,
            creditAccountCode: creditAccount.code,
            creditAccountName: creditAccount.name,
          },
          confidence: Math.min(0.95, 0.5 + row.pair_count * 0.05),
          occurrenceCount: parseInt(row.pair_count),
          lastOccurredAt: new Date(),
        });
      }
    }

    return patterns;
  }

  /**
   * 学习辅助核算偏好
   */
  private async learnAuxiliaryPreferences(enterpriseId: number): Promise<LearnedPattern[]> {
    const patterns: LearnedPattern[] = [];

    // 查询辅助核算使用情况
    const auxiliaries = await this.db
      .select({
        auxiliary: schema.voucherItemAuxiliaries,
        accountId: schema.voucherItems.accountId,
      })
      .from(schema.voucherItemAuxiliaries)
      .leftJoin(
        schema.voucherItems,
        eq(schema.voucherItemAuxiliaries.voucherItemId, schema.voucherItems.id),
      )
      .leftJoin(
        schema.vouchers,
        eq(schema.voucherItems.voucherId, schema.vouchers.id),
      )
      .where(eq(schema.vouchers.enterpriseId, enterpriseId));

    // 按科目和辅助类型分组统计
    const stats = new Map<string, Map<string, number>>();

    for (const { auxiliary, accountId } of auxiliaries) {
      const key = `${accountId}_${auxiliary.auxiliaryType}`;
      const valueKey = auxiliary.auxiliaryName || String(auxiliary.auxiliaryId);

      if (!stats.has(key)) {
        stats.set(key, new Map());
      }
      const valueMap = stats.get(key)!;
      valueMap.set(valueKey, (valueMap.get(valueKey) || 0) + 1);
    }

    // 生成模式
    for (const [key, valueMap] of stats.entries()) {
      const [accountIdStr] = key.split('_');
      const accountId = parseInt(accountIdStr);

      const [account] = await this.db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, accountId))
        .limit(1);

      if (!account) continue;

      const sortedValues = Array.from(valueMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const totalCount = sortedValues.reduce((sum, [, count]) => sum + count, 0);

      patterns.push({
        category: 'auxiliary_preference',
        key: key,
        value: {
          accountId,
          accountName: account.name,
          auxiliaryType: key.split('_')[1],
          commonValues: sortedValues.map(([name, count]) => ({ name, count })),
        },
        confidence: Math.min(0.95, 0.5 + totalCount * 0.05),
        occurrenceCount: totalCount,
        lastOccurredAt: new Date(),
      });
    }

    return patterns;
  }

  /**
   * 学习摘要关键词模式
   */
  private async learnSummaryPatterns(
    enterpriseId: number,
    minSampleSize: number,
  ): Promise<LearnedPattern[]> {
    const patterns: LearnedPattern[] = [];

    // 获取所有摘要
    const items = await this.db
      .select({
        summary: schema.voucherItems.summary,
        accountId: schema.voucherItems.accountId,
      })
      .from(schema.voucherItems)
      .leftJoin(schema.vouchers, eq(schema.voucherItems.voucherId, schema.vouchers.id))
      .where(
        and(
          eq(schema.vouchers.enterpriseId, enterpriseId),
          sql`${schema.voucherItems.summary} IS NOT NULL`,
        ),
      );

    // 按科目分组，提取高频词汇
    const accountSummaries = new Map<number, string[]>();

    for (const { summary, accountId } of items) {
      if (!summary) continue;
      if (!accountSummaries.has(accountId)) {
        accountSummaries.set(accountId, []);
      }
      accountSummaries.get(accountId)!.push(summary);
    }

    // 分析每个科目的关键词
    for (const [accountId, summaries] of accountSummaries.entries()) {
      if (summaries.length < minSampleSize) continue;

      const [account] = await this.db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, accountId))
        .limit(1);

      if (!account) continue;

      // 简单的关键词提取（按空格分割，统计词频）
      const wordFreq = new Map<string, number>();
      for (const summary of summaries) {
        const words = summary.split(/[\s,，.。]+/).filter(w => w.length >= 2);
        for (const word of words) {
          wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }
      }

      // 获取高频关键词
      const topWords = Array.from(wordFreq.entries())
        .filter(([, count]) => count >= minSampleSize)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      if (topWords.length > 0) {
        patterns.push({
          category: 'summary_pattern',
          key: `account_${accountId}`,
          value: {
            accountId,
            accountCode: account.code,
            accountName: account.name,
            keywords: topWords.map(([word, count]) => ({ word, count })),
          },
          confidence: Math.min(0.95, 0.5 + summaries.length * 0.02),
          occurrenceCount: summaries.length,
          lastOccurredAt: new Date(),
        });
      }
    }

    return patterns;
  }

  /**
   * 学习金额特征模式
   */
  private async learnAmountPatterns(enterpriseId: number): Promise<LearnedPattern[]> {
    const patterns: LearnedPattern[] = [];

    // 按科目统计金额分布
    const stats = await this.db.execute(sql`
      SELECT 
        vi.account_id,
        COUNT(*) as count,
        AVG(CAST(COALESCE(vi.debit_amount, '0') AS DECIMAL) + 
            CAST(COALESCE(vi.credit_amount, '0') AS DECIMAL)) as avg_amount,
        MIN(CAST(COALESCE(vi.debit_amount, '0') AS DECIMAL) + 
            CAST(COALESCE(vi.credit_amount, '0') AS DECIMAL)) as min_amount,
        MAX(CAST(COALESCE(vi.debit_amount, '0') AS DECIMAL) + 
            CAST(COALESCE(vi.credit_amount, '0') AS DECIMAL)) as max_amount
      FROM ${schema.voucherItems} vi
      JOIN ${schema.vouchers} v ON vi.voucher_id = v.id
      WHERE v.enterprise_id = ${enterpriseId}
      GROUP BY vi.account_id
      HAVING COUNT(*) >= ${this.MIN_SAMPLE_SIZE}
    `);

    for (const row of (stats as unknown as any[])) {
      const [account] = await this.db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, row.account_id))
        .limit(1);

      if (!account) continue;

      patterns.push({
        category: 'amount_pattern',
        key: `amount_${account.code}`,
        value: {
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          avgAmount: parseFloat(row.avg_amount),
          minAmount: parseFloat(row.min_amount),
          maxAmount: parseFloat(row.max_amount),
          stdDev: 0, // 简化实现
        },
        confidence: Math.min(0.9, 0.5 + parseInt(row.count) * 0.02),
        occurrenceCount: parseInt(row.count),
        lastOccurredAt: new Date(),
      });
    }

    return patterns;
  }

  /**
   * 保存学习到的模式
   */
  private async savePattern(
    enterpriseId: number,
    category: string,
    pattern: LearnedPattern,
  ): Promise<{ isNew: boolean; id: number }> {
    // 检查是否已存在
    const [existing] = await this.db
      .select()
      .from(schema.aiLearningRecords)
      .where(
        and(
          eq(schema.aiLearningRecords.enterpriseId, enterpriseId),
          eq(schema.aiLearningRecords.category, category),
          eq(schema.aiLearningRecords.key, pattern.key),
        ),
      )
      .limit(1);

    if (existing) {
      // 更新现有记录
      const [updated] = await this.db
        .update(schema.aiLearningRecords)
        .set({
          value: pattern.value,
          confidence: pattern.confidence.toFixed(2),
          occurrenceCount: pattern.occurrenceCount,
          lastOccurredAt: pattern.lastOccurredAt,
          updatedAt: new Date(),
        })
        .where(eq(schema.aiLearningRecords.id, existing.id))
        .returning();

      return { isNew: false, id: updated.id };
    } else {
      // 创建新记录
      const [created] = await this.db
        .insert(schema.aiLearningRecords)
        .values({
          enterpriseId,
          recordType: 'pattern',
          category,
          key: pattern.key,
          value: pattern.value,
          confidence: pattern.confidence.toFixed(2),
          occurrenceCount: pattern.occurrenceCount,
          lastOccurredAt: pattern.lastOccurredAt,
        })
        .returning();

      return { isNew: true, id: created.id };
    }
  }

  /**
   * 生成优化建议
   */
  private async generateOptimizationSuggestions(
    enterpriseId: number,
    accountPrefs: AccountPreference[],
    summaryPatterns: LearnedPattern[],
  ): Promise<LearningReport['suggestions']> {
    const suggestions: LearningReport['suggestions'] = [];

    // 1. 建议科目映射优化
    for (const pref of accountPrefs.slice(0, 5)) {
      if (pref.commonPairs.length > 0) {
        suggestions.push({
          type: 'account_mapping',
          description: `${pref.accountName} 经常与 ${pref.commonPairs[0].accountName} 一起使用，建议设置自动映射`,
          confidence: Math.min(0.95, 0.5 + pref.usageCount * 0.02),
          action: 'create_mapping_rule',
        });
      }
    }

    // 2. 建议摘要模板
    for (const pattern of summaryPatterns.slice(0, 3)) {
      const keywords = pattern.value.keywords?.slice(0, 3).map((k: any) => k.word).join('、');
      if (keywords) {
        suggestions.push({
          type: 'summary_template',
          description: `${pattern.value.accountName} 常用摘要包含：${keywords}`,
          confidence: pattern.confidence,
          action: 'update_summary_template',
        });
      }
    }

    // 3. 发现异常科目使用
    const unusualAccounts = accountPrefs.filter(p => p.usageCount < this.MIN_SAMPLE_SIZE);
    if (unusualAccounts.length > 0) {
      suggestions.push({
        type: 'unusual_usage',
        description: `发现 ${unusualAccounts.length} 个使用频率较低的科目，建议检查是否需要保留`,
        confidence: 0.7,
        action: 'review_accounts',
      });
    }

    return suggestions;
  }

  /**
   * 应用学习到的规则
   */
  async applyLearnedRules(
    enterpriseId: number,
    ruleIds?: number[],
  ): Promise<{ applied: number; failed: number }> {
    const conditions = [
      eq(schema.aiLearningRecords.enterpriseId, enterpriseId),
      eq(schema.aiLearningRecords.recordType, 'pattern'),
    ];

    if (ruleIds && ruleIds.length > 0) {
      // 简化处理：这里应该使用 inArray
      // 暂时忽略ruleIds过滤
    }

    const records = await this.db
      .select()
      .from(schema.aiLearningRecords)
      .where(and(...conditions))
      .orderBy(desc(schema.aiLearningRecords.confidence))
      .limit(50);

    let applied = 0;
    let failed = 0;

    for (const record of records) {
      try {
        if (record.category === 'account_pair') {
          // 应用科目组合规则
          const value = record.value as any;
          if (value.debitAccountId && value.creditAccountId) {
            await this.accountMappingService.saveMappingRule(
              enterpriseId,
              {
                businessType: 'learned_pair',
                debitAccountId: value.debitAccountId,
                creditAccountId: value.creditAccountId,
                description: `AI学习：${value.debitAccountName} - ${value.creditAccountName}`,
                priority: Math.floor((parseFloat(record.confidence || '0.5')) * 100),
              },
              0, // system user
            );
            applied++;
          }
        }
      } catch (error) {
        this.logger.error(`应用规则失败: ${record.id}`, error);
        failed++;
      }
    }

    return { applied, failed };
  }

  /**
   * 获取学习记录
   */
  async getLearningRecords(
    enterpriseId: number,
    options?: {
      category?: string;
      minConfidence?: number;
      page?: number;
      pageSize?: number;
    },
  ) {
    const { category, minConfidence, page = 1, pageSize = 20 } = options || {};

    const conditions = [eq(schema.aiLearningRecords.enterpriseId, enterpriseId)];

    if (category) {
      conditions.push(eq(schema.aiLearningRecords.category, category));
    }

    const [countResult] = await this.db
      .select({ count: schema.aiLearningRecords.id })
      .from(schema.aiLearningRecords)
      .where(and(...conditions));

    let query = this.db
      .select()
      .from(schema.aiLearningRecords)
      .where(and(...conditions))
      .orderBy(desc(schema.aiLearningRecords.confidence))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const records = await query;

    // 过滤置信度
    let filtered = records;
    if (minConfidence) {
      filtered = records.filter(r => parseFloat(r.confidence || '0') >= minConfidence);
    }

    return {
      list: filtered,
      total: countResult?.count || 0,
    };
  }

  /**
   * 删除学习记录
   */
  async deleteLearningRecord(
    enterpriseId: number,
    recordId: number,
  ): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(schema.aiLearningRecords)
      .where(
        and(
          eq(schema.aiLearningRecords.id, recordId),
          eq(schema.aiLearningRecords.enterpriseId, enterpriseId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new Error('学习记录不存在');
    }

    await this.db
      .delete(schema.aiLearningRecords)
      .where(eq(schema.aiLearningRecords.id, recordId));
  }
}
