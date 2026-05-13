import { Inject, Injectable, Logger, BadRequestException } from '@nestjs/common';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import { AccountMappingService, ComplexVoucherEntry } from './account-mapping.service';
import { AutoAccountingV2Service } from './auto-accounting-v2.service';

// 银行流水交易记录
export interface BankTransaction {
  transactionDate: Date;
  transactionTime?: string;
  direction: 'income' | 'expense';
  amount: string;
  balance?: string;
  counterpartyName?: string;
  counterpartyAccount?: string;
  counterpartyBank?: string;
  transactionType?: string;
  remark?: string;
  purpose?: string;
  referenceNo?: string;
}

// 解析后的银行流水导入结果
export interface BankStatementImportResult {
  success: boolean;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: Array<{ row: number; error: string }>;
  batchId: string;
}

// 流水智能匹配结果
export interface TransactionMatchResult {
  statementId: number;
  matchStatus: 'unmatched' | 'matched' | 'suggested';
  confidence: number;
  suggestedType?: 'sales_receipt' | 'purchase_payment' | 'expense' | 'transfer' | 'salary' | 'tax';
  suggestedAccountId?: number;
  suggestedAccountName?: string;
  matchedVoucherId?: number;
  reason: string;
}

@Injectable()
export class BankStatementService {
  private readonly logger = new Logger(BankStatementService.name);

  // 支持的银行列表
  private readonly supportedBanks = [
    { code: 'ICBC', name: '中国工商银行', formats: ['csv', 'excel'] },
    { code: 'CCB', name: '中国建设银行', formats: ['csv', 'excel'] },
    { code: 'ABC', name: '中国农业银行', formats: ['csv', 'excel'] },
    { code: 'BOC', name: '中国银行', formats: ['csv', 'excel'] },
    { code: 'COMM', name: '交通银行', formats: ['csv', 'excel'] },
    { code: 'CMB', name: '招商银行', formats: ['csv', 'excel'] },
    { code: 'SPDB', name: '浦发银行', formats: ['csv', 'excel'] },
    { code: 'CIB', name: '兴业银行', formats: ['csv', 'excel'] },
    { code: 'CMBC', name: '民生银行', formats: ['csv', 'excel'] },
    { code: 'CITIC', name: '中信银行', formats: ['csv', 'excel'] },
    { code: 'PAB', name: '平安银行', formats: ['csv', 'excel'] },
    { code: 'HXB', name: '华夏银行', formats: ['csv', 'excel'] },
    { code: 'ALIPAY', name: '支付宝', formats: ['csv'] },
    { code: 'WXPAY', name: '微信支付', formats: ['csv'] },
  ];

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
    private readonly accountMappingService: AccountMappingService,
    private readonly autoAccountingService: AutoAccountingV2Service,
  ) {}

  /**
   * 获取支持的银行列表
   */
  getSupportedBanks() {
    return this.supportedBanks;
  }

  /**
   * 解析CSV格式的银行流水
   */
  async parseCSV(
    bankCode: string,
    csvContent: string,
    options?: { encoding?: string; hasHeader?: boolean },
  ): Promise<BankTransaction[]> {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const hasHeader = options?.hasHeader ?? true;
    const startRow = hasHeader ? 1 : 0;

    const transactions: BankTransaction[] = [];

    for (let i = startRow; i < lines.length; i++) {
      const line = lines[i];
      try {
        const transaction = this.parseLine(bankCode, line, i);
        if (transaction) {
          transactions.push(transaction);
        }
      } catch (error) {
        this.logger.warn(`解析第${i + 1}行失败: ${error}`);
      }
    }

    return transactions;
  }

  /**
   * 解析单行数据（根据银行格式）
   */
  private parseLine(bankCode: string, line: string, rowIndex: number): BankTransaction | null {
    // 处理不同分隔符
    const delimiter = line.includes('\t') ? '\t' : ',';
    const columns = this.splitCSVLine(line, delimiter);

    // 根据银行代码选择解析器
    switch (bankCode) {
      case 'ICBC':
        return this.parseICBC(columns);
      case 'CCB':
        return this.parseCCB(columns);
      case 'CMB':
        return this.parseCMB(columns);
      case 'ALIPAY':
        return this.parseAlipay(columns);
      case 'WXPAY':
        return this.parseWechat(columns);
      default:
        // 通用解析器（尝试智能识别）
        return this.parseGeneric(columns);
    }
  }

  /**
   * 解析工商银行格式
   * 格式：日期,时间,收入,支出,余额,对方户名,对方账号,开户行,摘要,用途,流水号
   */
  private parseICBC(columns: string[]): BankTransaction | null {
    if (columns.length < 10) return null;

    const dateStr = columns[0].trim();
    const timeStr = columns[1]?.trim();
    const income = this.parseAmount(columns[2]);
    const expense = this.parseAmount(columns[3]);
    const balance = this.parseAmount(columns[4]);

    if (!dateStr || (income === 0 && expense === 0)) return null;

    const transactionDate = this.parseDate(dateStr);
    if (!transactionDate) return null;

    return {
      transactionDate,
      transactionTime: timeStr,
      direction: income > 0 ? 'income' : 'expense',
      amount: Math.abs(income || expense).toFixed(2),
      balance: balance > 0 ? balance.toFixed(2) : undefined,
      counterpartyName: columns[5]?.trim() || undefined,
      counterpartyAccount: columns[6]?.trim() || undefined,
      counterpartyBank: columns[7]?.trim() || undefined,
      remark: columns[8]?.trim() || undefined,
      purpose: columns[9]?.trim() || undefined,
      referenceNo: columns[10]?.trim() || undefined,
    };
  }

  /**
   * 解析建设银行格式
   * 格式：交易日期,摘要,币种,收入金额,支出金额,账户余额,对方户名,对方账号,对方开户行,交易流水号
   */
  private parseCCB(columns: string[]): BankTransaction | null {
    if (columns.length < 9) return null;

    const dateStr = columns[0].trim();
    const income = this.parseAmount(columns[3]);
    const expense = this.parseAmount(columns[4]);
    const balance = this.parseAmount(columns[5]);

    if (!dateStr || (income === 0 && expense === 0)) return null;

    const transactionDate = this.parseDate(dateStr);
    if (!transactionDate) return null;

    return {
      transactionDate,
      direction: income > 0 ? 'income' : 'expense',
      amount: Math.abs(income || expense).toFixed(2),
      balance: balance > 0 ? balance.toFixed(2) : undefined,
      remark: columns[1]?.trim() || undefined,
      counterpartyName: columns[6]?.trim() || undefined,
      counterpartyAccount: columns[7]?.trim() || undefined,
      counterpartyBank: columns[8]?.trim() || undefined,
      referenceNo: columns[9]?.trim() || undefined,
    };
  }

  /**
   * 解析招商银行格式
   * 格式：交易日,交易时间,摘要,收入,支出,余额,交易类型,对方户名,对方账号,交易地点
   */
  private parseCMB(columns: string[]): BankTransaction | null {
    if (columns.length < 9) return null;

    const dateStr = columns[0].trim();
    const timeStr = columns[1]?.trim();
    const income = this.parseAmount(columns[3]);
    const expense = this.parseAmount(columns[4]);
    const balance = this.parseAmount(columns[5]);

    if (!dateStr || (income === 0 && expense === 0)) return null;

    const transactionDate = this.parseDate(dateStr);
    if (!transactionDate) return null;

    return {
      transactionDate,
      transactionTime: timeStr,
      direction: income > 0 ? 'income' : 'expense',
      amount: Math.abs(income || expense).toFixed(2),
      balance: balance > 0 ? balance.toFixed(2) : undefined,
      remark: columns[2]?.trim() || undefined,
      transactionType: columns[6]?.trim() || undefined,
      counterpartyName: columns[7]?.trim() || undefined,
      counterpartyAccount: columns[8]?.trim() || undefined,
    };
  }

  /**
   * 解析支付宝格式
   */
  private parseAlipay(columns: string[]): BankTransaction | null {
    if (columns.length < 8) return null;

    // 支付宝格式：交易号,商家订单号,交易创建时间,付款时间,最近修改时间,交易来源地,类型,交易对方,对方账号,商品订单名称,金额,收/支,交易状态,服务费,成功退款,备注,资金状态
    const dateStr = columns[2]?.trim();
    const counterparty = columns[7]?.trim();
    const amountStr = columns[10]?.trim();
    const direction = columns[11]?.trim(); // 收入/支出
    const status = columns[12]?.trim();
    const remark = columns[15]?.trim();

    if (!dateStr || !amountStr || status !== '交易成功') return null;

    const transactionDate = this.parseDate(dateStr);
    if (!transactionDate) return null;

    const amount = this.parseAmount(amountStr.replace('￥', '').replace(',', ''));

    return {
      transactionDate,
      direction: direction === '收入' ? 'income' : 'expense',
      amount: amount.toFixed(2),
      counterpartyName: counterparty,
      remark: remark || columns[9]?.trim(), // 商品订单名称
    };
  }

  /**
   * 解析微信支付格式
   */
  private parseWechat(columns: string[]): BankTransaction | null {
    if (columns.length < 8) return null;

    // 微信格式：交易时间,交易类型,交易对方,商品,收/支,金额,支付方式,当前状态,交易单号,商户单号,备注
    const dateStr = columns[0]?.trim();
    const transactionType = columns[1]?.trim();
    const counterparty = columns[2]?.trim();
    const remark = columns[3]?.trim(); // 商品
    const direction = columns[4]?.trim();
    const amountStr = columns[5]?.trim().replace('￥', '').replace(',', '');
    const status = columns[7]?.trim();

    if (!dateStr || !amountStr || status !== '支付成功') return null;

    const transactionDate = this.parseDateTime(dateStr);
    if (!transactionDate) return null;

    const amount = this.parseAmount(amountStr);

    return {
      transactionDate,
      direction: direction === '收入' ? 'income' : 'expense',
      amount: amount.toFixed(2),
      counterpartyName: counterparty,
      transactionType,
      remark: remark,
    };
  }

  /**
   * 通用解析器（智能识别）
   */
  private parseGeneric(columns: string[]): BankTransaction | null {
    // 尝试识别日期列
    let dateIndex = -1;
    let amountIndex = -1;
    let incomeIndex = -1;
    let expenseIndex = -1;
    let remarkIndex = -1;

    for (let i = 0; i < Math.min(columns.length, 10); i++) {
      const col = columns[i].trim();
      
      // 日期识别
      if (dateIndex === -1 && this.isDateString(col)) {
        dateIndex = i;
        continue;
      }
      
      // 金额识别（纯数字或带货币符号）
      if (this.isAmountString(col)) {
        if (amountIndex === -1 && incomeIndex === -1 && expenseIndex === -1) {
          amountIndex = i;
        }
      }
    }

    if (dateIndex === -1) return null;

    const dateStr = columns[dateIndex];
    const transactionDate = this.parseDate(dateStr);
    if (!transactionDate) return null;

    // 尝试找到收入/支出
    let direction: 'income' | 'expense' = 'expense';
    let amount = 0;

    if (incomeIndex >= 0) {
      const income = this.parseAmount(columns[incomeIndex]);
      if (income > 0) {
        direction = 'income';
        amount = income;
      }
    }

    if (amount === 0 && expenseIndex >= 0) {
      amount = this.parseAmount(columns[expenseIndex]);
    }

    if (amount === 0 && amountIndex >= 0) {
      amount = this.parseAmount(columns[amountIndex]);
    }

    if (amount === 0) return null;

    return {
      transactionDate,
      direction,
      amount: amount.toFixed(2),
      remark: remarkIndex >= 0 ? columns[remarkIndex] : undefined,
    };
  }

  /**
   * 智能分割CSV行（处理引号内的逗号）
   */
  private splitCSVLine(line: string, delimiter: string = ','): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      
      if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
        continue;
      }
      
      current += char;
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * 解析金额字符串
   */
  private parseAmount(str: string): number {
    if (!str) return 0;
    // 移除货币符号和千位分隔符
    const cleaned = str
      .replace(/[￥,$¥]/g, '')
      .replace(/,/g, '')
      .trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  /**
   * 解析日期字符串
   */
  private parseDate(str: string): Date | null {
    if (!str) return null;
    
    // 尝试多种格式
    const formats = [
      // 2024-01-15
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      // 2024/01/15
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
      // 2024年01月15日
      /^(\d{4})年(\d{1,2})月(\d{1,2})日$/,
      // 20240115
      /^(\d{4})(\d{2})(\d{2})$/,
    ];

    for (const format of formats) {
      const match = str.match(format);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const day = parseInt(match[3]);
        return new Date(year, month, day);
      }
    }

    // 尝试直接解析
    const date = new Date(str);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * 解析日期时间字符串
   */
  private parseDateTime(str: string): Date | null {
    if (!str) return null;

    // 微信格式：2024-01-15 14:30:25
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (match) {
      return new Date(
        parseInt(match[1]),
        parseInt(match[2]) - 1,
        parseInt(match[3]),
        parseInt(match[4]),
        parseInt(match[5]),
        parseInt(match[6]),
      );
    }

    return this.parseDate(str);
  }

  /**
   * 判断是否为日期字符串
   */
  private isDateString(str: string): boolean {
    return this.parseDate(str) !== null;
  }

  /**
   * 判断是否为金额字符串
   */
  private isAmountString(str: string): boolean {
    if (!str) return false;
    const cleaned = str.replace(/[￥,$¥,]/g, '').trim();
    return /^-?\d+\.?\d*$/.test(cleaned) && parseFloat(cleaned) > 0;
  }

  /**
   * 导入银行流水到数据库
   */
  async importStatements(
    enterpriseId: number,
    userId: number,
    bankCode: string,
    bankAccount: string,
    transactions: BankTransaction[],
  ): Promise<BankStatementImportResult> {
    const batchId = `BS${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const bankInfo = this.supportedBanks.find(b => b.code === bankCode);

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];

      try {
        // 检查是否已存在（根据参考号和日期）
        if (tx.referenceNo) {
          const [existing] = await this.db
            .select({ id: schema.bankStatements.id })
            .from(schema.bankStatements)
            .where(
              and(
                eq(schema.bankStatements.enterpriseId, enterpriseId),
                eq(schema.bankStatements.referenceNo, tx.referenceNo),
                eq(schema.bankStatements.bankAccount, bankAccount),
              ),
            )
            .limit(1);

          if (existing) {
            skippedCount++;
            continue;
          }
        }

        // 插入记录
        await this.db.insert(schema.bankStatements).values({
          enterpriseId,
          bankName: bankInfo?.name || bankCode,
          bankAccount,
          transactionDate: tx.transactionDate,
          transactionTime: tx.transactionTime,
          direction: tx.direction,
          amount: tx.amount,
          balance: tx.balance,
          counterpartyName: tx.counterpartyName,
          counterpartyAccount: tx.counterpartyAccount,
          counterpartyBank: tx.counterpartyBank,
          transactionType: tx.transactionType,
          remark: tx.remark,
          purpose: tx.purpose,
          referenceNo: tx.referenceNo,
          importBatchId: batchId,
          rawData: tx,
          createdBy: userId,
        });

        importedCount++;
      } catch (error) {
        errorCount++;
        errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    // 导入完成后，执行智能匹配
    if (importedCount > 0) {
      await this.matchTransactions(enterpriseId, batchId);
    }

    return {
      success: errorCount === 0,
      totalRows: transactions.length,
      importedCount,
      skippedCount,
      errorCount,
      errors,
      batchId,
    };
  }

  /**
   * 智能匹配银行流水
   */
  async matchTransactions(
    enterpriseId: number,
    batchId?: string,
  ): Promise<TransactionMatchResult[]> {
    const conditions = [
      eq(schema.bankStatements.enterpriseId, enterpriseId),
      eq(schema.bankStatements.matchStatus, 'unmatched'),
    ];

    if (batchId) {
      conditions.push(eq(schema.bankStatements.importBatchId, batchId));
    }

    const statements = await this.db
      .select()
      .from(schema.bankStatements)
      .where(and(...conditions));

    const results: TransactionMatchResult[] = [];

    for (const statement of statements) {
      const result = await this.analyzeTransaction(statement, enterpriseId);
      results.push(result);

      // 更新匹配结果
      await this.db
        .update(schema.bankStatements)
        .set({
          matchStatus: result.matchStatus,
          suggestedAccountId: result.suggestedAccountId,
          confidence: result.confidence.toFixed(2),
        })
        .where(eq(schema.bankStatements.id, statement.id));
    }

    return results;
  }

  /**
   * 分析单笔交易
   */
  private async analyzeTransaction(
    statement: typeof schema.bankStatements.$inferSelect,
    enterpriseId: number,
  ): Promise<TransactionMatchResult> {
    const { id, direction, amount, counterpartyName, remark, transactionType } = statement;

    let suggestedType: TransactionMatchResult['suggestedType'];
    let confidence = 0.5;
    let reason = '';

    // 1. 根据交易类型识别
    if (transactionType) {
      const typeLower = transactionType.toLowerCase();
      if (typeLower.includes('工资') || typeLower.includes('薪资')) {
        suggestedType = 'salary';
        confidence = 0.9;
        reason = '交易类型识别为工资';
      } else if (typeLower.includes('税款') || typeLower.includes('税费')) {
        suggestedType = 'tax';
        confidence = 0.9;
        reason = '交易类型识别为税款';
      } else if (typeLower.includes('转账')) {
        suggestedType = 'transfer';
        confidence = 0.6;
        reason = '交易类型为转账';
      }
    }

    // 2. 根据备注识别
    if (!suggestedType && remark) {
      const remarkLower = remark.toLowerCase();
      if (remarkLower.includes('货款') || remarkLower.includes('材料')) {
        suggestedType = direction === 'income' ? 'sales_receipt' : 'purchase_payment';
        confidence = 0.8;
        reason = '备注关键词识别';
      } else if (remarkLower.includes('费用') || remarkLower.includes('报销')) {
        suggestedType = 'expense';
        confidence = 0.7;
        reason = '备注关键词识别';
      }
    }

    // 3. 根据交易对手识别
    if (!suggestedType && counterpartyName) {
      // 查询客户/供应商匹配
      const [matchedCustomer] = await this.db
        .select()
        .from(schema.customers)
        .where(
          and(
            eq(schema.customers.enterpriseId, enterpriseId),
            eq(schema.customers.name, counterpartyName),
          ),
        )
        .limit(1);

      if (matchedCustomer) {
        suggestedType = direction === 'income' ? 'sales_receipt' : 'purchase_payment';
        confidence = 0.85;
        reason = `匹配到客户/供应商: ${counterpartyName}`;
      }
    }

    // 4. 根据金额特征识别
    if (!suggestedType) {
      const amountNum = parseFloat(amount);
      if (amountNum > 100000) {
        suggestedType = direction === 'income' ? 'sales_receipt' : 'purchase_payment';
        confidence = 0.6;
        reason = '大额交易，推测为业务往来';
      } else if (amountNum < 1000) {
        suggestedType = 'expense';
        confidence = 0.5;
        reason = '小额交易，推测为费用支出';
      }
    }

    // 5. 默认分类
    if (!suggestedType) {
      suggestedType = direction === 'income' ? 'sales_receipt' : 'expense';
      confidence = 0.4;
      reason = '默认分类';
    }

    // 获取建议科目
    const suggestedAccount = await this.getSuggestedAccount(suggestedType, enterpriseId);

    return {
      statementId: id,
      matchStatus: confidence > 0.7 ? 'suggested' : 'unmatched',
      confidence,
      suggestedType,
      suggestedAccountId: suggestedAccount?.id,
      suggestedAccountName: suggestedAccount?.name,
      reason,
    };
  }

  /**
   * 根据类型获取建议科目
   */
  private async getSuggestedAccount(
    type: TransactionMatchResult['suggestedType'],
    enterpriseId: number,
  ): Promise<{ id: number; name: string } | null> {
    const accountCodeMap: Record<string, string> = {
      'sales_receipt': '1002', // 银行存款
      'purchase_payment': '2202', // 应付账款
      'expense': '6602', // 管理费用
      'transfer': '1002', // 银行存款
      'salary': '2211', // 应付职工薪酬
      'tax': '2221', // 应交税费
    };

    const code = accountCodeMap[type || ''];
    if (!code) return null;

    const [account] = await this.db
      .select({ id: schema.accounts.id, name: schema.accounts.name })
      .from(schema.accounts)
      .where(
        and(
          eq(schema.accounts.enterpriseId, enterpriseId),
          eq(schema.accounts.code, code),
        ),
      )
      .limit(1);

    return account || null;
  }

  /**
   * 根据银行流水生成凭证
   */
  async generateVoucherFromStatement(
    statementId: number,
    enterpriseId: number,
    userId: number,
    customAccountId?: number,
  ): Promise<{ success: boolean; voucherId?: number; error?: string }> {
    const [statement] = await this.db
      .select()
      .from(schema.bankStatements)
      .where(
        and(
          eq(schema.bankStatements.id, statementId),
          eq(schema.bankStatements.enterpriseId, enterpriseId),
        ),
      )
      .limit(1);

    if (!statement) {
      return { success: false, error: '流水记录不存在' };
    }

    if (statement.matchStatus === 'voucher_created' && statement.matchedVoucherId) {
      return { success: false, error: '该流水已生成凭证' };
    }

    // 确定科目
    const accountId = customAccountId || statement.suggestedAccountId;
    if (!accountId) {
      return { success: false, error: '无法确定会计科目，请手动选择' };
    }

    const [account] = await this.db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.id, accountId))
      .limit(1);

    if (!account) {
      return { success: false, error: '科目不存在' };
    }

    // 构建凭证分录
    const entries: ComplexVoucherEntry[] = [];

    if (statement.direction === 'income') {
      // 收入：借 银行存款，贷 应收账款/其他应付款
      entries.push({
        accountId: account.id,
        accountName: account.name,
        accountCode: account.code,
        direction: 'debit',
        amount: statement.amount,
        summary: statement.remark || `${statement.counterpartyName || ''} 收款`,
      });

      // 对方科目默认为应收账款
      const [receivableAccount] = await this.db
        .select()
        .from(schema.accounts)
        .where(
          and(
            eq(schema.accounts.enterpriseId, enterpriseId),
            eq(schema.accounts.code, '1122'),
          ),
        )
        .limit(1);

      if (receivableAccount) {
        entries.push({
          accountId: receivableAccount.id,
          accountName: receivableAccount.name,
          accountCode: receivableAccount.code,
          direction: 'credit',
          amount: statement.amount,
          summary: statement.remark || `${statement.counterpartyName || ''} 收款`,
          auxiliaries: statement.counterpartyName ? [{
            type: 'customer',
            id: 0, // 这里需要查询客户ID
            name: statement.counterpartyName,
          }] : undefined,
        });
      }
    } else {
      // 支出：借 费用/应付账款，贷 银行存款
      entries.push({
        accountId: account.id,
        accountName: account.name,
        accountCode: account.code,
        direction: 'debit',
        amount: statement.amount,
        summary: statement.remark || `${statement.counterpartyName || ''} 付款`,
      });

      // 贷方科目为银行存款
      const [bankAccount] = await this.db
        .select()
        .from(schema.accounts)
        .where(
          and(
            eq(schema.accounts.enterpriseId, enterpriseId),
            eq(schema.accounts.code, '1002'),
          ),
        )
        .limit(1);

      if (bankAccount) {
        entries.push({
          accountId: bankAccount.id,
          accountName: bankAccount.name,
          accountCode: bankAccount.code,
          direction: 'credit',
          amount: statement.amount,
          summary: statement.remark || `${statement.counterpartyName || ''} 付款`,
        });
      }
    }

    // 创建凭证
    const result = await this.autoAccountingService.createComplexVoucher(
      {
        enterpriseId,
        userId,
        sourceType: 'bank_statement',
        sourceData: { id: statementId },
      },
      {
        voucherNo: '',
        voucherDate: statement.transactionDate,
        summary: `银行流水 ${statement.bankName} ${statement.referenceNo || ''}`,
        sourceType: 'bank_statement',
        sourceId: statementId,
        entries,
        totalDebit: statement.amount,
        totalCredit: statement.amount,
      },
    );

    if (result.success && result.voucherId) {
      // 更新流水状态
      await this.db
        .update(schema.bankStatements)
        .set({
          matchStatus: 'voucher_created',
          matchedVoucherId: result.voucherId,
        })
        .where(eq(schema.bankStatements.id, statementId));

      return { success: true, voucherId: result.voucherId };
    }

    return { success: false, error: result.error || '生成凭证失败' };
  }

  /**
   * 获取银行流水列表
   */
  async getStatementList(
    enterpriseId: number,
    options?: {
      matchStatus?: string;
      bankAccount?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      pageSize?: number;
    },
  ) {
    const {
      matchStatus,
      bankAccount,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
    } = options || {};

    const conditions = [eq(schema.bankStatements.enterpriseId, enterpriseId)];

    if (matchStatus) {
      conditions.push(eq(schema.bankStatements.matchStatus, matchStatus));
    }
    if (bankAccount) {
      conditions.push(eq(schema.bankStatements.bankAccount, bankAccount));
    }
    if (startDate) {
      conditions.push(gte(schema.bankStatements.transactionDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(schema.bankStatements.transactionDate, endDate));
    }

    const [countResult] = await this.db
      .select({ count: schema.bankStatements.id })
      .from(schema.bankStatements)
      .where(and(...conditions));

    const statements = await this.db
      .select()
      .from(schema.bankStatements)
      .where(and(...conditions))
      .orderBy(desc(schema.bankStatements.transactionDate))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      list: statements,
      total: countResult?.count || 0,
    };
  }
}
