import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';

// 预警类型
export type AlertType =
  | 'unbalanced_voucher'
  | 'large_amount'
  | 'duplicate_voucher'
  | 'unusual_account'
  | 'missing_attachment'
  | 'cross_period'
  | 'tax_risk'
  | 'cash_limit'
  | 'budget_overrun';

// 预警严重程度
export type AlertSeverity = 'high' | 'medium' | 'low';

// 预警配置
export interface AlertConfig {
  id?: number;
  alertType: AlertType;
  isEnabled: boolean;
  thresholdValue?: number;
  notifyChannels: string[];
  notifyTargets: number[];
}

// 预警项
export interface AlertItem {
  id: number;
  alertType: AlertType;
  severity: AlertSeverity;
  sourceType: string;
  sourceId: number;
  title: string;
  description: string;
  suggestion?: string;
  status: 'active' | 'resolved' | 'ignored';
  createdAt: Date;
  notifiedAt?: Date;
}

// 检测结果
export interface DetectionResult {
  alerts: Array<{
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    description: string;
    suggestion?: string;
  }>;
  hasAlert: boolean;
}

@Injectable()
export class FinanceAlertService {
  private readonly logger = new Logger(FinanceAlertService.name);

  // 默认预警配置
  private readonly defaultConfigs: AlertConfig[] = [
    {
      alertType: 'unbalanced_voucher',
      isEnabled: true,
      notifyChannels: ['app'],
      notifyTargets: [],
    },
    {
      alertType: 'large_amount',
      isEnabled: true,
      thresholdValue: 10000, // 1万元
      notifyChannels: ['app', 'email'],
      notifyTargets: [],
    },
    {
      alertType: 'duplicate_voucher',
      isEnabled: true,
      notifyChannels: ['app'],
      notifyTargets: [],
    },
    {
      alertType: 'missing_attachment',
      isEnabled: true,
      thresholdValue: 1000, // 1000元以上需要附件
      notifyChannels: ['app'],
      notifyTargets: [],
    },
    {
      alertType: 'cash_limit',
      isEnabled: true,
      thresholdValue: 1000, // 现金交易限额
      notifyChannels: ['app'],
      notifyTargets: [],
    },
    {
      alertType: 'tax_risk',
      isEnabled: true,
      notifyChannels: ['app', 'email'],
      notifyTargets: [],
    },
  ];

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
  ) {}

  /**
   * 初始化企业预警配置
   */
  async initializeAlertConfigs(
    enterpriseId: number,
    userId: number,
  ): Promise<void> {
    // 检查是否已初始化
    const [existing] = await this.db
      .select({ id: schema.financeAlertConfigs.id })
      .from(schema.financeAlertConfigs)
      .where(eq(schema.financeAlertConfigs.enterpriseId, enterpriseId))
      .limit(1);

    if (existing) {
      return;
    }

    // 创建默认配置
    for (const config of this.defaultConfigs) {
      await this.db.insert(schema.financeAlertConfigs).values({
        enterpriseId,
        alertType: config.alertType,
        isEnabled: config.isEnabled,
        thresholdValue: config.thresholdValue?.toString(),
        notifyChannels: config.notifyChannels,
        notifyTargets: config.notifyTargets,
        createdBy: userId,
      });
    }

    this.logger.log(`企业${enterpriseId}预警配置初始化完成`);
  }

  /**
   * 检测凭证异常
   */
  async detectVoucherAnomalies(
    voucherId: number,
    enterpriseId: number,
  ): Promise<DetectionResult> {
    const alerts: DetectionResult['alerts'] = [];

    // 获取凭证详情
    const [voucher] = await this.db
      .select()
      .from(schema.vouchers)
      .where(
        and(
          eq(schema.vouchers.id, voucherId),
          eq(schema.vouchers.enterpriseId, enterpriseId),
        ),
      )
      .limit(1);

    if (!voucher) {
      return { alerts: [], hasAlert: false };
    }

    // 获取凭证明细
    const items = await this.db
      .select({
        item: schema.voucherItems,
        account: schema.accounts,
      })
      .from(schema.voucherItems)
      .leftJoin(schema.accounts, eq(schema.voucherItems.accountId, schema.accounts.id))
      .where(eq(schema.voucherItems.voucherId, voucherId));

    const totalDebit = items.reduce(
      (sum, { item }) => sum + parseFloat(item.debitAmount || '0'),
      0,
    );
    const totalCredit = items.reduce(
      (sum, { item }) => sum + parseFloat(item.creditAmount || '0'),
      0,
    );

    // 1. 检测借贷不平衡
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      alerts.push({
        type: 'unbalanced_voucher',
        severity: 'high',
        title: '借贷不平衡',
        description: `借方 ${totalDebit.toFixed(2)} ≠ 贷方 ${totalCredit.toFixed(2)}，差额 ${Math.abs(totalDebit - totalCredit).toFixed(2)}`,
        suggestion: '请检查凭证分录，确保借贷金额相等',
      });
    }

    // 2. 检测大额交易
    const maxAmount = Math.max(totalDebit, totalCredit);
    const largeAmountConfig = await this.getAlertConfig(enterpriseId, 'large_amount');
    if (largeAmountConfig?.isEnabled && largeAmountConfig.thresholdValue) {
      const threshold = parseFloat(largeAmountConfig.thresholdValue);
      if (maxAmount >= threshold) {
        alerts.push({
          type: 'large_amount',
          severity: maxAmount >= threshold * 10 ? 'high' : 'medium',
          title: '大额交易预警',
          description: `凭证金额 ${maxAmount.toFixed(2)} 元，超过阈值 ${threshold} 元`,
          suggestion: '请确认交易真实性，保留相关合同和审批单据',
        });
      }
    }

    // 3. 检测重复凭证
    const duplicateAlert = await this.checkDuplicateVoucher(voucher, items, enterpriseId);
    if (duplicateAlert) {
      alerts.push(duplicateAlert);
    }

    // 4. 检测现金交易限额
    const cashAlert = await this.checkCashLimit(items, enterpriseId);
    if (cashAlert) {
      alerts.push(cashAlert);
    }

    // 5. 检测税务风险科目
    const taxAlerts = await this.checkTaxRisks(items, enterpriseId);
    alerts.push(...taxAlerts);

    // 保存预警
    for (const alert of alerts) {
      await this.createAlert(enterpriseId, {
        alertType: alert.type,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        suggestion: alert.suggestion,
        sourceType: 'voucher',
        sourceId: voucherId,
      });
    }

    return { alerts, hasAlert: alerts.length > 0 };
  }

  /**
   * 检测重复凭证
   */
  private async checkDuplicateVoucher(
    voucher: typeof schema.vouchers.$inferSelect,
    items: Array<{ item: typeof schema.voucherItems.$inferSelect; account: any }>,
    enterpriseId: number,
  ): Promise<DetectionResult['alerts'][0] | null> {
    // 简化：检查同一天相同金额的凭证
    const startOfDay = new Date(voucher.voucherDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(voucher.voucherDate);
    endOfDay.setHours(23, 59, 59, 999);

    const totalAmount = items.reduce(
      (sum, { item }) => sum + parseFloat(item.debitAmount || '0'),
      0,
    );

    const similarVouchers = await this.db
      .select({
        voucher: schema.vouchers,
        sumDebit: sql<string>`SUM(CAST(${schema.voucherItems.debitAmount} AS DECIMAL))`,
      })
      .from(schema.vouchers)
      .leftJoin(
        schema.voucherItems,
        eq(schema.voucherItems.voucherId, schema.vouchers.id),
      )
      .where(
        and(
          eq(schema.vouchers.enterpriseId, enterpriseId),
          gte(schema.vouchers.voucherDate, startOfDay),
          lte(schema.vouchers.voucherDate, endOfDay),
          sql`${schema.vouchers.id} != ${voucher.id}`,
        ),
      )
      .groupBy(schema.vouchers.id)
      .having(sql`ABS(SUM(CAST(${schema.voucherItems.debitAmount} AS DECIMAL)) - ${totalAmount}) < 0.01`);

    if (similarVouchers.length > 0) {
      return {
        type: 'duplicate_voucher',
        severity: 'medium',
        title: '疑似重复凭证',
        description: `发现 ${similarVouchers.length} 张同一天相同金额的凭证，请确认是否为重复录入`,
        suggestion: '请检查凭证号：' + similarVouchers.map(v => v.voucher.voucherNo).join(', '),
      };
    }

    return null;
  }

  /**
   * 检测现金限额
   */
  private async checkCashLimit(
    items: Array<{ item: typeof schema.voucherItems.$inferSelect; account: any }>,
    enterpriseId: number,
  ): Promise<DetectionResult['alerts'][0] | null> {
    const cashConfig = await this.getAlertConfig(enterpriseId, 'cash_limit');
    if (!cashConfig?.isEnabled || !cashConfig.thresholdValue) {
      return null;
    }

    const threshold = parseFloat(cashConfig.thresholdValue);

    for (const { item, account } of items) {
      // 检查库存现金科目
      if (account?.code === '1001') {
        const amount = parseFloat(item.debitAmount || '0') + parseFloat(item.creditAmount || '0');
        if (amount > threshold) {
          return {
            type: 'cash_limit',
            severity: 'medium',
            title: '现金交易超限',
            description: `库存现金交易金额 ${amount.toFixed(2)} 元，超过 ${threshold} 元限额`,
            suggestion: '大额交易建议通过银行转账，便于留下资金痕迹',
          };
        }
      }
    }

    return null;
  }

  /**
   * 检测税务风险
   */
  private async checkTaxRisks(
    items: Array<{ item: typeof schema.voucherItems.$inferSelect; account: any }>,
    enterpriseId: number,
  ): Promise<DetectionResult['alerts']> {
    const alerts: DetectionResult['alerts'] = [];

    for (const { item, account } of items) {
      if (!account) continue;

      // 业务招待费风险提示
      if (account.code.startsWith('6602') && account.name.includes('招待')) {
        const amount = parseFloat(item.debitAmount || '0');
        alerts.push({
          type: 'tax_risk',
          severity: 'medium',
          title: '业务招待费税务提示',
          description: `业务招待费 ${amount.toFixed(2)} 元，税前扣除有限制`,
          suggestion: '业务招待费按发生额60%扣除，且不超过当年销售收入的0.5%',
        });
      }

      // 检查福利费
      if (account.code.startsWith('2211') && account.name.includes('福利')) {
        const amount = parseFloat(item.creditAmount || '0');
        if (amount > 0) {
          alerts.push({
            type: 'tax_risk',
            severity: 'low',
            title: '职工福利费提示',
            description: `职工福利费 ${amount.toFixed(2)} 元，不超过工资总额14%的部分准予扣除`,
            suggestion: '请确保福利费支出符合税法规定',
          });
        }
      }
    }

    return alerts;
  }

  /**
   * 检测发票异常
   */
  async detectInvoiceAnomalies(
    invoiceId: number,
    enterpriseId: number,
  ): Promise<DetectionResult> {
    const alerts: DetectionResult['alerts'] = [];

    const [invoice] = await this.db
      .select()
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.id, invoiceId),
          eq(schema.invoices.enterpriseId, enterpriseId),
        ),
      )
      .limit(1);

    if (!invoice) {
      return { alerts: [], hasAlert: false };
    }

    const amount = parseFloat(invoice.amount || '0');

    // 大额发票无附件风险
    const missingAttachmentConfig = await this.getAlertConfig(enterpriseId, 'missing_attachment');
    if (missingAttachmentConfig?.isEnabled && missingAttachmentConfig.thresholdValue) {
      const threshold = parseFloat(missingAttachmentConfig.thresholdValue);
      if (amount >= threshold && !invoice.ocrData) {
        alerts.push({
          type: 'missing_attachment',
          severity: 'low',
          title: '大额发票无影像',
          description: `发票金额 ${amount.toFixed(2)} 元，建议上传发票影像备查`,
          suggestion: '请上传发票扫描件或拍照存档',
        });
      }
    }

    // 跨期发票检测
    const issueDate = invoice.issueDate;
    if (issueDate) {
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 365) {
        alerts.push({
          type: 'cross_period',
          severity: 'medium',
          title: '跨期发票',
          description: `发票开具时间距今 ${daysDiff} 天，超过1年`,
          suggestion: '跨期发票可能无法抵扣或税前扣除，请及时处理',
        });
      }
    }

    // 保存预警
    for (const alert of alerts) {
      await this.createAlert(enterpriseId, {
        alertType: alert.type,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        suggestion: alert.suggestion,
        sourceType: 'invoice',
        sourceId: invoiceId,
      });
    }

    return { alerts, hasAlert: alerts.length > 0 };
  }

  /**
   * 创建预警记录
   */
  private async createAlert(
    enterpriseId: number,
    alert: {
      alertType: AlertType;
      severity: AlertSeverity;
      sourceType: string;
      sourceId: number;
      title: string;
      description: string;
      suggestion?: string;
    },
  ): Promise<void> {
    // 检查是否已存在相同预警
    const [existing] = await this.db
      .select({ id: schema.financeAlerts.id })
      .from(schema.financeAlerts)
      .where(
        and(
          eq(schema.financeAlerts.enterpriseId, enterpriseId),
          eq(schema.financeAlerts.alertType, alert.alertType),
          eq(schema.financeAlerts.sourceType, alert.sourceType),
          eq(schema.financeAlerts.sourceId, alert.sourceId),
          eq(schema.financeAlerts.status, 'active'),
        ),
      )
      .limit(1);

    if (existing) {
      return; // 已存在活跃预警，不再创建
    }

    await this.db.insert(schema.financeAlerts).values({
      enterpriseId,
      alertType: alert.alertType,
      severity: alert.severity,
      sourceType: alert.sourceType,
      sourceId: alert.sourceId,
      title: alert.title,
      description: alert.description,
      suggestion: alert.suggestion,
      status: 'active',
    });
  }

  /**
   * 获取预警配置
   */
  private async getAlertConfig(
    enterpriseId: number,
    alertType: AlertType,
  ): Promise<typeof schema.financeAlertConfigs.$inferSelect | null> {
    const [config] = await this.db
      .select()
      .from(schema.financeAlertConfigs)
      .where(
        and(
          eq(schema.financeAlertConfigs.enterpriseId, enterpriseId),
          eq(schema.financeAlertConfigs.alertType, alertType),
        ),
      )
      .limit(1);

    return config || null;
  }

  /**
   * 获取预警列表
   */
  async getAlerts(
    enterpriseId: number,
    options?: {
      status?: 'active' | 'resolved' | 'ignored';
      severity?: AlertSeverity;
      page?: number;
      pageSize?: number;
    },
  ): Promise<{ list: AlertItem[]; total: number }> {
    const { status, severity, page = 1, pageSize = 20 } = options || {};

    const conditions = [eq(schema.financeAlerts.enterpriseId, enterpriseId)];

    if (status) {
      conditions.push(eq(schema.financeAlerts.status, status));
    }
    if (severity) {
      conditions.push(eq(schema.financeAlerts.severity, severity));
    }

    const [countResult] = await this.db
      .select({ count: schema.financeAlerts.id })
      .from(schema.financeAlerts)
      .where(and(...conditions));

    const alerts = await this.db
      .select()
      .from(schema.financeAlerts)
      .where(and(...conditions))
      .orderBy(desc(schema.financeAlerts.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      list: alerts.map(a => ({
        id: a.id,
        alertType: a.alertType as AlertType,
        severity: a.severity as AlertSeverity,
        sourceType: a.sourceType || '',
        sourceId: a.sourceId || 0,
        title: a.title,
        description: a.description,
        suggestion: a.suggestion || undefined,
        status: a.status as AlertItem['status'],
        createdAt: a.createdAt,
        notifiedAt: a.notifiedAt || undefined,
      })),
      total: countResult?.count || 0,
    };
  }

  /**
   * 解决预警
   */
  async resolveAlert(
    alertId: number,
    enterpriseId: number,
    userId: number,
    resolutionNote?: string,
  ): Promise<void> {
    const [alert] = await this.db
      .select()
      .from(schema.financeAlerts)
      .where(
        and(
          eq(schema.financeAlerts.id, alertId),
          eq(schema.financeAlerts.enterpriseId, enterpriseId),
        ),
      )
      .limit(1);

    if (!alert) {
      throw new Error('预警不存在');
    }

    if (alert.status !== 'active') {
      throw new Error('该预警已处理');
    }

    await this.db
      .update(schema.financeAlerts)
      .set({
        status: 'resolved',
        resolvedBy: userId,
        resolvedAt: new Date(),
        resolutionNote,
      })
      .where(eq(schema.financeAlerts.id, alertId));
  }

  /**
   * 忽略预警
   */
  async ignoreAlert(
    alertId: number,
    enterpriseId: number,
    userId: number,
    reason: string,
  ): Promise<void> {
    const [alert] = await this.db
      .select()
      .from(schema.financeAlerts)
      .where(
        and(
          eq(schema.financeAlerts.id, alertId),
          eq(schema.financeAlerts.enterpriseId, enterpriseId),
        ),
      )
      .limit(1);

    if (!alert) {
      throw new Error('预警不存在');
    }

    await this.db
      .update(schema.financeAlerts)
      .set({
        status: 'ignored',
        resolvedBy: userId,
        resolvedAt: new Date(),
        resolutionNote: reason,
      })
      .where(eq(schema.financeAlerts.id, alertId));
  }

  /**
   * 获取预警统计
   */
  async getAlertStats(enterpriseId: number): Promise<{
    total: number;
    active: number;
    high: number;
    medium: number;
    low: number;
  }> {
    const result = await this.db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN severity = 'high' AND status = 'active' THEN 1 END) as high,
        COUNT(CASE WHEN severity = 'medium' AND status = 'active' THEN 1 END) as medium,
        COUNT(CASE WHEN severity = 'low' AND status = 'active' THEN 1 END) as low
      FROM ${schema.financeAlerts}
      WHERE enterprise_id = ${enterpriseId}
    `);

    const row = (result as unknown as any[])[0];
    return {
      total: parseInt(row.total),
      active: parseInt(row.active),
      high: parseInt(row.high),
      medium: parseInt(row.medium),
      low: parseInt(row.low),
    };
  }

  /**
   * 更新预警配置
   */
  async updateAlertConfig(
    enterpriseId: number,
    configId: number,
    userId: number,
    data: Partial<AlertConfig>,
  ): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(schema.financeAlertConfigs)
      .where(
        and(
          eq(schema.financeAlertConfigs.id, configId),
          eq(schema.financeAlertConfigs.enterpriseId, enterpriseId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new Error('配置不存在');
    }

    await this.db
      .update(schema.financeAlertConfigs)
      .set({
        isEnabled: data.isEnabled ?? existing.isEnabled,
        thresholdValue: data.thresholdValue?.toString() ?? existing.thresholdValue,
        notifyChannels: data.notifyChannels ?? existing.notifyChannels,
        notifyTargets: data.notifyTargets ?? existing.notifyTargets,
        updatedAt: new Date(),
      })
      .where(eq(schema.financeAlertConfigs.id, configId));
  }

  /**
   * 批量检测
   */
  async batchDetect(
    enterpriseId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<{ processed: number; alerts: number }> {
    // 获取期间内所有凭证
    const vouchers = await this.db
      .select({ id: schema.vouchers.id })
      .from(schema.vouchers)
      .where(
        and(
          eq(schema.vouchers.enterpriseId, enterpriseId),
          gte(schema.vouchers.voucherDate, startDate),
          lte(schema.vouchers.voucherDate, endDate),
        ),
      );

    let totalAlerts = 0;

    for (const voucher of vouchers) {
      const result = await this.detectVoucherAnomalies(voucher.id, enterpriseId);
      totalAlerts += result.alerts.length;
    }

    return { processed: vouchers.length, alerts: totalAlerts };
  }
}
