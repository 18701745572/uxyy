import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, gte, lte, lt, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import * as schema from '../../../db/schema';

export interface ErrorDetectionResult {
  type: 'error' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  suggestion: string;
  data?: any;
}

export interface VoucherValidationResult {
  isValid: boolean;
  errors: ErrorDetectionResult[];
}

@Injectable()
export class AiErrorCorrectionService {
  private readonly logger = new Logger(AiErrorCorrectionService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
  ) {}

  /**
   * 智能检测凭证错误
   */
  async detectVoucherErrors(voucherId: number, enterpriseId: number): Promise<ErrorDetectionResult[]> {
    const errors: ErrorDetectionResult[] = [];

    // 获取凭证信息
    const [voucher] = await this.db
      .select()
      .from(schema.vouchers)
      .where(
        and(
          eq(schema.vouchers.id, voucherId),
          eq(schema.vouchers.enterpriseId, enterpriseId),
        ),
      );

    if (!voucher) {
      return errors;
    }

    // 获取凭证明细
    const items = await this.db
      .select()
      .from(schema.voucherItems)
      .where(eq(schema.voucherItems.voucherId, voucherId));

    if (!items || items.length === 0) {
      errors.push({
        type: 'warning',
        category: '凭证明细',
        title: '凭证明细为空',
        description: '该凭证没有明细记录',
        suggestion: '请补充凭证明细',
      });
      return errors;
    }

    // 1. 检查借贷平衡
    let totalDebit = 0;
    let totalCredit = 0;
    for (const item of items) {
      const debit = parseFloat(item.debitAmount || '0');
      const credit = parseFloat(item.creditAmount || '0');
      if (!isNaN(debit)) totalDebit += debit;
      if (!isNaN(credit)) totalCredit += credit;
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      errors.push({
        type: 'error',
        category: '借贷平衡',
        title: '借贷不平衡',
        description: `借方金额 ${totalDebit.toFixed(2)} 不等于贷方金额 ${totalCredit.toFixed(2)}，差额 ${Math.abs(totalDebit - totalCredit).toFixed(2)}`,
        suggestion: '请检查凭证明细，确保借方金额合计等于贷方金额合计',
        data: { totalDebit, totalCredit, difference: Math.abs(totalDebit - totalCredit) },
      });
    }

    // 2. 检查科目使用合理性
    for (const item of items) {
      if (!item.accountId) continue;
      
      const [account] = await this.db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, item.accountId));

      if (account) {
        // 检查资产类科目贷方金额异常
        const creditAmount = parseFloat(item.creditAmount || '0');
        const debitAmount = parseFloat(item.debitAmount || '0');
        
        if (account.category === 'asset' && !isNaN(creditAmount) && creditAmount > 0) {
          errors.push({
            type: 'warning',
            category: '科目使用',
            title: '资产类科目贷方异常',
            description: `科目「${account.name}」为资产类科目，通常应在借方记录增加，贷方记录减少`,
            suggestion: '请确认该笔业务是否确实需要减少资产，如果是正常业务可忽略此警告',
            data: { account: account.name, creditAmount: item.creditAmount },
          });
        }

        // 检查负债类科目借方金额异常
        if (account.category === 'liability' && !isNaN(debitAmount) && debitAmount > 0) {
          errors.push({
            type: 'warning',
            category: '科目使用',
            title: '负债类科目借方异常',
            description: `科目「${account.name}」为负债类科目，通常应在贷方记录增加，借方记录减少`,
            suggestion: '请确认该笔业务是否确实需要减少负债，如果是正常业务可忽略此警告',
            data: { account: account.name, debitAmount: item.debitAmount },
          });
        }

        // 检查损益类科目方向
        if (account.category === 'revenue' && !isNaN(debitAmount) && debitAmount > 0) {
          errors.push({
            type: 'info',
            category: '科目使用',
            title: '收入类科目借方记录',
            description: `科目「${account.name}」为收入类科目，借方记录可能表示收入冲减或结转`,
            suggestion: '如果是期末结转损益，这是正常的；如果是日常业务，请检查是否录入错误',
            data: { account: account.name, debitAmount: item.debitAmount },
          });
        }
      }
    }

    // 3. 检查金额异常（过大或过小）
    for (const item of items) {
      const debitAmount = parseFloat(item.debitAmount || '0');
      const creditAmount = parseFloat(item.creditAmount || '0');
      const amount = !isNaN(debitAmount) && debitAmount > 0 ? debitAmount : 
                    !isNaN(creditAmount) && creditAmount > 0 ? creditAmount : 0;
      
      if (amount > 1000000) {
        errors.push({
          type: 'warning',
          category: '金额异常',
          title: '单笔金额过大',
          description: `检测到单笔金额 ${amount.toFixed(2)} 超过100万，请确认金额是否正确`,
          suggestion: '大额交易建议再次核对原始单据，确认无误后可忽略此警告',
          data: { amount },
        });
      }
      if (amount > 0 && amount < 0.01) {
        errors.push({
          type: 'warning',
          category: '金额异常',
          title: '单笔金额过小',
          description: `检测到单笔金额 ${amount.toFixed(4)} 过小，可能存在录入错误`,
          suggestion: '请检查是否多输入或少输入了小数点',
          data: { amount },
        });
      }
    }

    // 4. 检查摘要规范性
    if (!voucher.summary || voucher.summary.length < 5) {
      errors.push({
        type: 'info',
        category: '摘要规范',
        title: '摘要过于简单',
        description: '凭证摘要内容较少，建议补充更详细的业务说明',
        suggestion: '摘要应包含业务类型、对象、事项等关键信息，便于后续查阅',
        data: { summary: voucher.summary },
      });
    }

    // 5. 检查重复凭证
    if (voucher.voucherDate) {
      const startOfDay = new Date(voucher.voucherDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(voucher.voucherDate);
      endOfDay.setHours(23, 59, 59, 999);

      const similarVouchers = await this.db
        .select()
        .from(schema.vouchers)
        .where(
          and(
            eq(schema.vouchers.enterpriseId, enterpriseId),
            gte(schema.vouchers.voucherDate, startOfDay),
            lte(schema.vouchers.voucherDate, endOfDay),
            sql`${schema.vouchers.id} != ${voucherId}`,
            sql`ABS(${schema.vouchers.totalAmount} - ${voucher.totalAmount}) < 0.01`,
          ),
        );

      if (similarVouchers.length > 0) {
        errors.push({
          type: 'warning',
          category: '重复检测',
          title: '可能存在重复凭证',
          description: `发现 ${similarVouchers.length} 张金额相同的凭证在同一天录入`,
          suggestion: '请检查是否为重复录入，如果是不同业务可忽略此警告',
          data: { similarVouchers: similarVouchers.map(v => ({ id: v.id, voucherNo: v.voucherNo })) },
        });
      }
    }

    return errors;
  }

  /**
   * 批量检测企业凭证
   */
  async batchDetectErrors(enterpriseId: number, startDate?: Date, endDate?: Date) {
    const conditions = [eq(schema.vouchers.enterpriseId, enterpriseId)];

    if (startDate) {
      conditions.push(gte(schema.vouchers.voucherDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(schema.vouchers.voucherDate, endDate));
    }

    const vouchers = await this.db
      .select()
      .from(schema.vouchers)
      .where(and(...conditions));
    const results = [];

    for (const voucher of vouchers) {
      const errors = await this.detectVoucherErrors(voucher.id, enterpriseId);
      if (errors.length > 0) {
        results.push({
          voucherId: voucher.id,
          voucherNo: voucher.voucherNo,
          voucherDate: voucher.voucherDate,
          totalAmount: voucher.totalAmount,
          errorCount: errors.length,
          errors,
        });
      }
    }

    return {
      totalChecked: vouchers.length,
      errorVouchers: results.length,
      details: results,
    };
  }

  /**
   * 智能纠错建议
   */
  async getCorrectionSuggestions(voucherId: number, enterpriseId: number) {
    const errors = await this.detectVoucherErrors(voucherId, enterpriseId);
    const suggestions = [];

    for (const error of errors) {
      if (error.type === 'error') {
        suggestions.push({
          priority: 'high',
          error: error.title,
          action: error.suggestion,
          autoFixable: error.category === '借贷平衡',
        });
      } else if (error.type === 'warning') {
        suggestions.push({
          priority: 'medium',
          error: error.title,
          action: error.suggestion,
          autoFixable: false,
        });
      }
    }

    return suggestions.sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });
  }

  /**
   * 自动修复借贷不平衡
   */
  async autoFixBalance(voucherId: number, enterpriseId: number) {
    const [voucher] = await this.db
      .select()
      .from(schema.vouchers)
      .where(
        and(
          eq(schema.vouchers.id, voucherId),
          eq(schema.vouchers.enterpriseId, enterpriseId),
        ),
      );

    if (!voucher) {
      throw new Error('凭证不存在');
    }

    const items = await this.db
      .select()
      .from(schema.voucherItems)
      .where(eq(schema.voucherItems.voucherId, voucherId));

    const totalDebit = items.reduce((sum, item) => sum + parseFloat(item.debitAmount || '0'), 0);
    const totalCredit = items.reduce((sum, item) => sum + parseFloat(item.creditAmount || '0'), 0);
    const diff = totalDebit - totalCredit;

    if (Math.abs(diff) < 0.01) {
      return { message: '凭证已平衡，无需修复' };
    }

    // 查找差异调整科目（通常为财务费用或营业外收支）
    const adjustmentAccount = await this.db
      .select()
      .from(schema.accounts)
      .where(
        and(
          eq(schema.accounts.enterpriseId, enterpriseId),
          eq(schema.accounts.code, '5603'), // 财务费用
        ),
      )
      .limit(1);

    if (adjustmentAccount.length === 0) {
      return { message: '未找到合适的调整科目，请手动修复' };
    }

    // 添加调整分录
    const adjustmentAmount = Math.abs(diff).toFixed(2);
    await this.db.insert(schema.voucherItems).values({
      voucherId,
      accountId: adjustmentAccount[0].id,
      summary: '借贷差额调整',
      debitAmount: diff > 0 ? '0' : adjustmentAmount,
      creditAmount: diff > 0 ? adjustmentAmount : '0',
    });

    // 更新凭证总金额
    const newTotal = Math.max(totalDebit, totalCredit).toFixed(2);
    await this.db
      .update(schema.vouchers)
      .set({ totalAmount: newTotal })
      .where(eq(schema.vouchers.id, voucherId));

    return {
      message: '已自动修复借贷不平衡',
      adjustment: {
        account: adjustmentAccount[0].name,
        amount: adjustmentAmount,
        direction: diff > 0 ? '贷方' : '借方',
      },
    };
  }

  /**
   * 获取财务健康度报告
   */
  async getFinancialHealthReport(enterpriseId: number, month?: string) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const startDate = new Date(`${targetMonth}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // 统计凭证错误率
    const allVouchers = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.vouchers)
      .where(
        and(
          eq(schema.vouchers.enterpriseId, enterpriseId),
          gte(schema.vouchers.voucherDate, startDate),
          lt(schema.vouchers.voucherDate, endDate),
        ),
      );

    const errorCheck = await this.batchDetectErrors(enterpriseId, startDate, endDate);

    const totalVouchers = allVouchers[0]?.count || 0;
    const errorVouchers = errorCheck.errorVouchers;
    const errorRateValue = totalVouchers > 0 ? (errorVouchers / totalVouchers * 100) : 0;
    const errorRate = errorRateValue.toFixed(2);

    // 统计各类错误
    const errorCategories: Record<string, number> = {};
    for (const detail of errorCheck.details) {
      for (const error of detail.errors) {
        errorCategories[error.category] = (errorCategories[error.category] || 0) + 1;
      }
    }

    return {
      period: targetMonth,
      summary: {
        totalVouchers,
        errorVouchers,
        errorRate: `${errorRate}%`,
        healthLevel: errorRateValue < 5 ? '优秀' : errorRateValue < 15 ? '良好' : '需改进',
      },
      errorCategories,
      topIssues: Object.entries(errorCategories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    };
  }
}
