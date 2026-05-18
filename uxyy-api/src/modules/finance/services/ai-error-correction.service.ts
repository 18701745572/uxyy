import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { eq, and, ne, gte, lte, lt, sql } from 'drizzle-orm';
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

/** PostgreSQL `integer` / serial 上限，超出会触发 driver/数据库错误（此前表现为 500） */
const PG_INTEGER_MAX = 2_147_483_647;

/**
 * AI 纠错与当前财务「凭证」存储一致：**voucher_entries**（单行借贷摘要模型），不是未启用的 vouchers/voucher_items DDL。
 */
@Injectable()
export class AiErrorCorrectionService {
  private readonly logger = new Logger(AiErrorCorrectionService.name);

  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  /** 路径参数 voucherId 对应 `voucher_entries.id`（小整数），勿与凭证字号/业务长编号混淆 */
  private assertVoucherEntryId(voucherId: number): void {
    if (
      !Number.isFinite(voucherId) ||
      voucherId < 1 ||
      voucherId > PG_INTEGER_MAX
    ) {
      throw new BadRequestException(
        `分录 id 须在 1～${PG_INTEGER_MAX} 之间（数据库主键）。若填写的是凭证号或较长业务编号，请到「凭证录入」列表查看该行对应的 id，勿与凭证字号混淆。`,
      );
    }
  }

  /** voucherId = voucher_entries.id */
  async detectVoucherErrors(
    voucherId: number,
    enterpriseId: number,
  ): Promise<ErrorDetectionResult[]> {
    this.assertVoucherEntryId(voucherId);
    const errors: ErrorDetectionResult[] = [];

    const [entry] = await this.db
      .select()
      .from(schema.voucherEntries)
      .where(
        and(
          eq(schema.voucherEntries.id, voucherId),
          eq(schema.voucherEntries.enterpriseId, enterpriseId),
        ),
      );

    if (!entry) return errors;

    const amount = parseFloat(String(entry.amount));
    if (Number.isNaN(amount)) {
      errors.push({
        type: 'error',
        category: '金额',
        title: '金额无法解析',
        description: `当前分录金额为「${entry.amount}」`,
        suggestion: '请改为合法数字格式（最多两位小数）',
      });
      return errors;
    }

    const debitSubject = await this.resolveAccountSubjectByName(
      enterpriseId,
      entry.debitAccount,
    );
    const creditSubject = await this.resolveAccountSubjectByName(
      enterpriseId,
      entry.creditAccount,
    );

    if (!debitSubject) {
      errors.push({
        type: 'warning',
        category: '科目',
        title: '借方科目未命中企业科目表',
        description: `借方科目「${entry.debitAccount}」在科目表中无同名记录`,
        suggestion:
          '请核对是否与「会计科目」维护中的名称完全一致（含子目后缀）',
        data: { side: 'debit', name: entry.debitAccount },
      });
    }

    if (!creditSubject) {
      errors.push({
        type: 'warning',
        category: '科目',
        title: '贷方科目未命中企业科目表',
        description: `贷方科目「${entry.creditAccount}」在科目表中无同名记录`,
        suggestion:
          '请核对是否与「会计科目」维护中的名称完全一致（含子目后缀）',
        data: { side: 'credit', name: entry.creditAccount },
      });
    }

    if (amount > 1000000) {
      errors.push({
        type: 'warning',
        category: '金额异常',
        title: '单笔金额过大',
        description: `金额 ${amount.toFixed(2)} 超过 100 万`,
        suggestion: '大额请核对原始单据',
        data: { amount },
      });
    }

    if (amount > 0 && amount < 0.01) {
      errors.push({
        type: 'warning',
        category: '金额异常',
        title: '单笔金额过小',
        description: `金额 ${amount} 接近于零`,
        suggestion: '请检查小数点位数',
        data: { amount },
      });
    }

    const sumText = entry.summary ?? '';
    if (!sumText.trim() || sumText.trim().length < 4) {
      errors.push({
        type: 'info',
        category: '摘要规范',
        title: '摘要偏短',
        description: '摘要信息较少',
        suggestion: '建议写明业务事由、关联方等',
        data: { summary: entry.summary },
      });
    }

    if (entry.entryDate) {
      const startOfDay = new Date(entry.entryDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(entry.entryDate);
      endOfDay.setHours(23, 59, 59, 999);

      const similar = await this.db
        .select()
        .from(schema.voucherEntries)
        .where(
          and(
            eq(schema.voucherEntries.enterpriseId, enterpriseId),
            gte(schema.voucherEntries.entryDate, startOfDay),
            lte(schema.voucherEntries.entryDate, endOfDay),
            ne(schema.voucherEntries.id, voucherId),
            eq(schema.voucherEntries.debitAccount, entry.debitAccount),
            eq(schema.voucherEntries.creditAccount, entry.creditAccount),
            sql`ABS(CAST(${schema.voucherEntries.amount} AS DECIMAL) - CAST(${entry.amount} AS DECIMAL)) < 0.02`,
          ),
        );

      if (similar.length > 0) {
        errors.push({
          type: 'warning',
          category: '重复检测',
          title: '存在同日同科目同金额的重复分录',
          description: `除本行外发现 ${similar.length} 条借贷科目与金额均一致的分录`,
          suggestion: '请核对是否重复记账',
          data: {
            voucherNo: entry.voucherNo,
            similarIds: similar.map((s) => s.id),
          },
        });
      }
    }

    return errors;
  }

  /** 批量检测：分页拉取该企业全部 voucher_entries（可按日期收窄） */
  async batchDetectErrors(
    enterpriseId: number,
    startDate?: Date,
    endDate?: Date,
  ) {
    const conditions = [eq(schema.voucherEntries.enterpriseId, enterpriseId)];

    if (startDate) {
      conditions.push(gte(schema.voucherEntries.entryDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(schema.voucherEntries.entryDate, endDate));
    }

    const rows = await this.db
      .select()
      .from(schema.voucherEntries)
      .where(and(...conditions));

    const results: {
      voucherId: number;
      voucherNo: string;
      voucherDate: Date;
      totalAmount: string;
      errorCount: number;
      errors: ErrorDetectionResult[];
    }[] = [];

    for (const row of rows) {
      const errors = await this.detectVoucherErrors(row.id, enterpriseId);
      if (errors.length > 0) {
        results.push({
          voucherId: row.id,
          voucherNo: row.voucherNo,
          voucherDate: row.entryDate,
          totalAmount: String(row.amount),
          errorCount: errors.length,
          errors,
        });
      }
    }

    return {
      totalChecked: rows.length,
      errorVouchers: results.length,
      details: results,
    };
  }

  async getCorrectionSuggestions(voucherId: number, enterpriseId: number) {
    const errors = await this.detectVoucherErrors(voucherId, enterpriseId);
    const suggestions = [];

    for (const error of errors) {
      if (error.type === 'error') {
        suggestions.push({
          priority: 'high',
          error: error.title,
          action: error.suggestion,
          autoFixable: false,
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
      const priorityOrder: Record<string, number> = {
        high: 3,
        medium: 2,
        low: 1,
      };
      return (
        (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
      );
    });
  }

  /**
   * 历史实现依赖未创建的 vouchers/voucher_items；当前模型下「单列借贷」不产生多明细差额，
   * 自动平衡修复不适用，避免误 INSERT。
   */
  async autoFixBalance(voucherId: number, enterpriseId: number) {
    this.assertVoucherEntryId(voucherId);
    this.logger.verbose(
      `autoFixBalance skipped — voucher_entries model enterprise ${enterpriseId}, entry ${voucherId}`,
    );
    return {
      message:
        '当前凭证存储为 voucher_entries（单笔借/贷科目 + 单一金额），无多明细借贷差额可调；请勿使用本接口追加分录。',
    };
  }

  async getFinancialHealthReport(enterpriseId: number, month?: string) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const startDate = new Date(`${targetMonth}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const [cntRow] = await this.db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.voucherEntries)
      .where(
        and(
          eq(schema.voucherEntries.enterpriseId, enterpriseId),
          gte(schema.voucherEntries.entryDate, startDate),
          lt(schema.voucherEntries.entryDate, endDate),
        ),
      );

    const totalEntries = cntRow?.count ?? 0;
    const errorCheck = await this.batchDetectErrors(
      enterpriseId,
      startDate,
      endDate,
    );

    const errorRateValue =
      totalEntries > 0 ? (errorCheck.errorVouchers / totalEntries) * 100 : 0;
    const errorRate = errorRateValue.toFixed(2);

    const errorCategories: Record<string, number> = {};
    for (const detail of errorCheck.details) {
      for (const error of detail.errors) {
        errorCategories[error.category] =
          (errorCategories[error.category] || 0) + 1;
      }
    }

    return {
      period: targetMonth,
      summary: {
        totalVoucherEntries: totalEntries,
        errorEntries: errorCheck.errorVouchers,
        errorRate: `${errorRate}%`,
        healthLevel:
          errorRateValue < 5 ? '优秀' : errorRateValue < 15 ? '良好' : '需改进',
      },
      errorCategories,
      topIssues: Object.entries(errorCategories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    };
  }

  /** 与企业会计科目同名匹配；同名未命中时对「父科目-子目」尝试父前缀 */
  private async resolveAccountSubjectByName(
    enterpriseId: number,
    name: string | null | undefined,
  ): Promise<typeof schema.accountSubjects.$inferSelect | null> {
    if (!name?.trim()) return null;
    const trimmed = name.trim();

    const [exact] = await this.db
      .select()
      .from(schema.accountSubjects)
      .where(
        and(
          eq(schema.accountSubjects.enterpriseId, enterpriseId),
          eq(schema.accountSubjects.name, trimmed),
          eq(schema.accountSubjects.isActive, true),
        ),
      )
      .limit(1);

    if (exact) return exact;

    const base = trimmed.split('-')[0]?.trim();
    if (!base || base === trimmed) return null;

    const [prefix] = await this.db
      .select()
      .from(schema.accountSubjects)
      .where(
        and(
          eq(schema.accountSubjects.enterpriseId, enterpriseId),
          eq(schema.accountSubjects.name, base),
          eq(schema.accountSubjects.isActive, true),
        ),
      )
      .limit(1);

    return prefix ?? null;
  }
}
