import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, desc, gte, lt } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import {
  AccountMappingService,
  ComplexVoucher,
  ComplexVoucherEntry,
} from './account-mapping.service';

export interface AutoAccountingContext {
  enterpriseId: number;
  userId: number;
  sourceType: string;
  sourceData: any;
  skipIfExists?: boolean;
}

export interface AutoAccountingResult {
  success: boolean;
  voucherId?: number;
  voucherNo?: string;
  entries?: ComplexVoucherEntry[];
  error?: string;
  warnings?: string[];
}

@Injectable()
export class AutoAccountingV2Service {
  private readonly logger = new Logger(AutoAccountingV2Service.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
    private readonly accountMappingService: AccountMappingService,
  ) {}

  /**
   * 生成凭证号
   */
  private async generateVoucherNo(enterpriseId: number): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');

    // 查询当天最大凭证号
    const todayStart = new Date(y, now.getMonth(), now.getDate());
    const todayEnd = new Date(y, now.getMonth(), now.getDate() + 1);

    const [latest] = await this.db
      .select({ voucherNo: schema.vouchers.voucherNo })
      .from(schema.vouchers)
      .where(
        and(
          eq(schema.vouchers.enterpriseId, enterpriseId),
          gte(schema.vouchers.createdAt, todayStart),
          lt(schema.vouchers.createdAt, todayEnd),
        ),
      )
      .orderBy(desc(schema.vouchers.createdAt))
      .limit(1);

    let sequence = 1;
    if (latest?.voucherNo) {
      const match = latest.voucherNo.match(/(\d{3})$/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    return `PZ${y}${m}${d}${String(sequence).padStart(3, '0')}`;
  }

  /**
   * 创建复杂多行凭证
   */
  async createComplexVoucher(
    context: AutoAccountingContext,
    voucherData: ComplexVoucher,
  ): Promise<AutoAccountingResult> {
    const {
      enterpriseId,
      userId,
      sourceType,
      sourceData,
      skipIfExists = true,
    } = context;

    try {
      // 检查是否已存在
      if (skipIfExists && sourceData?.id) {
        const existing = await this.db
          .select()
          .from(schema.vouchers)
          .where(
            and(
              eq(schema.vouchers.enterpriseId, enterpriseId),
              eq(schema.vouchers.sourceType, sourceType),
              eq(schema.vouchers.sourceId, sourceData.id),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          return {
            success: true,
            voucherId: existing[0].id,
            voucherNo: existing[0].voucherNo,
            warnings: ['凭证已存在，返回已有凭证'],
          };
        }
      }

      // 验证借贷平衡
      const totalDebit = voucherData.entries
        .filter((e) => e.direction === 'debit')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const totalCredit = voucherData.entries
        .filter((e) => e.direction === 'credit')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return {
          success: false,
          error: `借贷不平衡：借方${totalDebit} ≠ 贷方${totalCredit}`,
        };
      }

      // 生成凭证号
      const voucherNo =
        voucherData.voucherNo || (await this.generateVoucherNo(enterpriseId));

      // 创建凭证主表
      const [voucher] = await this.db
        .insert(schema.vouchers)
        .values({
          enterpriseId,
          voucherNo,
          voucherDate: voucherData.voucherDate,
          totalAmount: totalDebit.toFixed(2),
          summary: voucherData.summary,
          sourceType,
          sourceId: sourceData?.id,
          status: 'draft', // 初始状态为草稿
          createdBy: userId,
        })
        .returning();

      // 创建凭证明细
      for (const entry of voucherData.entries) {
        const [voucherItem] = await this.db
          .insert(schema.voucherItems)
          .values({
            voucherId: voucher.id,
            accountId: entry.accountId,
            debitAmount: entry.direction === 'debit' ? entry.amount : '0',
            creditAmount: entry.direction === 'credit' ? entry.amount : '0',
            summary: entry.summary,
          })
          .returning();

        // 保存辅助核算
        if (entry.auxiliaries && entry.auxiliaries.length > 0) {
          for (const aux of entry.auxiliaries) {
            await this.db.insert(schema.voucherItemAuxiliaries).values({
              voucherItemId: voucherItem.id,
              auxiliaryType: aux.type,
              auxiliaryId: aux.id,
              auxiliaryName: aux.name,
            });
          }
        }
      }

      return {
        success: true,
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo,
        entries: voucherData.entries,
      };
    } catch (error) {
      this.logger.error('创建凭证失败', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建凭证失败',
      };
    }
  }

  /**
   * 销售单自动记账 - 复杂多行版本
   * 包含：收入确认、销项税额、成本结转
   */
  async autoAccountSalesOrder(
    order: any,
    enterpriseId: number,
    userId: number,
  ): Promise<AutoAccountingResult> {
    const entries: ComplexVoucherEntry[] = [];
    const warnings: string[] = [];

    // 判断是现销还是赊销
    const isCashSale = order.paymentMethod === 'cash' || order.isCashSale;
    const debitAccountCode = isCashSale ? '1001' : '1122'; // 库存现金 / 应收账款
    const debitAccountName = isCashSale ? '库存现金' : '应收账款';

    // 计算金额
    const totalAmount = parseFloat(order.totalAmount || 0);
    const taxAmount = parseFloat(order.taxAmount || 0);
    const netAmount = totalAmount - taxAmount;

    // 1. 借方：银行存款/应收账款
    entries.push({
      accountId: 0, // 将在后面通过科目代码查询
      accountName: debitAccountName,
      accountCode: debitAccountCode,
      direction: 'debit',
      amount: totalAmount.toFixed(2),
      summary: `销售订单 ${order.orderNo} 收入确认`,
      auxiliaries: isCashSale
        ? undefined
        : [
            {
              type: 'customer',
              id: order.customerId,
              name: order.customerName || '',
            },
          ],
    });

    // 2. 贷方：主营业务收入
    entries.push({
      accountId: 0,
      accountName: '主营业务收入',
      accountCode: '6001',
      direction: 'credit',
      amount: netAmount.toFixed(2),
      summary: `销售订单 ${order.orderNo} 收入`,
    });

    // 3. 贷方：销项税额（如有）
    if (taxAmount > 0) {
      entries.push({
        accountId: 0,
        accountName: '应交税费-应交增值税-销项税额',
        accountCode: '22210105',
        direction: 'credit',
        amount: taxAmount.toFixed(2),
        summary: `销售订单 ${order.orderNo} 销项税额`,
      });
    }

    // 4. 成本结转（如有成本数据）
    const costAmount = parseFloat(order.costAmount || 0);
    if (costAmount > 0) {
      entries.push({
        accountId: 0,
        accountName: '主营业务成本',
        accountCode: '6401',
        direction: 'debit',
        amount: costAmount.toFixed(2),
        summary: `销售订单 ${order.orderNo} 成本`,
      });

      entries.push({
        accountId: 0,
        accountName: '库存商品',
        accountCode: '1405',
        direction: 'credit',
        amount: costAmount.toFixed(2),
        summary: `销售订单 ${order.orderNo} 成本结转`,
      });
    } else {
      warnings.push('未找到成本数据，未生成成本结转凭证');
    }

    // 查询并填充实际科目ID
    const resolvedEntries = await this.resolveAccountIds(entries, enterpriseId);
    if (!resolvedEntries.success) {
      return { success: false, error: resolvedEntries.error };
    }

    // 创建凭证
    return this.createComplexVoucher(
      {
        enterpriseId,
        userId,
        sourceType: 'sales_order',
        sourceData: order,
      },
      {
        voucherNo: '',
        voucherDate: new Date(),
        summary: `销售订单 ${order.orderNo}`,
        sourceType: 'sales_order',
        sourceId: order.id,
        entries: resolvedEntries.entries!,
        totalDebit: totalAmount.toFixed(2),
        totalCredit: totalAmount.toFixed(2),
      },
    );
  }

  /**
   * 采购单自动记账 - 复杂多行版本
   */
  async autoAccountPurchaseOrder(
    order: any,
    enterpriseId: number,
    userId: number,
  ): Promise<AutoAccountingResult> {
    const entries: ComplexVoucherEntry[] = [];

    const isCashPurchase = order.paymentMethod === 'cash';
    const totalAmount = parseFloat(order.totalAmount || 0);
    const taxAmount = parseFloat(order.taxAmount || 0);
    const netAmount = totalAmount - taxAmount;

    if (isCashPurchase) {
      // 现购：直接入库存，银行存款减少
      entries.push({
        accountId: 0,
        accountName: '库存商品',
        accountCode: '1405',
        direction: 'debit',
        amount: netAmount.toFixed(2),
        summary: `采购订单 ${order.orderNo} 商品入库`,
      });

      if (taxAmount > 0) {
        entries.push({
          accountId: 0,
          accountName: '应交税费-应交增值税-进项税额',
          accountCode: '22210101',
          direction: 'debit',
          amount: taxAmount.toFixed(2),
          summary: `采购订单 ${order.orderNo} 进项税额`,
        });
      }

      entries.push({
        accountId: 0,
        accountName: '银行存款',
        accountCode: '1002',
        direction: 'credit',
        amount: totalAmount.toFixed(2),
        summary: `采购订单 ${order.orderNo} 现付`,
      });
    } else {
      // 赊购：在途物资增加，应付账款增加
      entries.push({
        accountId: 0,
        accountName: '在途物资',
        accountCode: '1402',
        direction: 'debit',
        amount: netAmount.toFixed(2),
        summary: `采购订单 ${order.orderNo} 采购确认`,
      });

      if (taxAmount > 0) {
        entries.push({
          accountId: 0,
          accountName: '应交税费-应交增值税-进项税额',
          accountCode: '22210101',
          direction: 'debit',
          amount: taxAmount.toFixed(2),
          summary: `采购订单 ${order.orderNo} 进项税额`,
        });
      }

      entries.push({
        accountId: 0,
        accountName: '应付账款',
        accountCode: '2202',
        direction: 'credit',
        amount: totalAmount.toFixed(2),
        summary: `采购订单 ${order.orderNo} 应付账款`,
        auxiliaries: [
          {
            type: 'supplier',
            id: order.supplierId,
            name: order.supplierName || '',
          },
        ],
      });
    }

    const resolvedEntries = await this.resolveAccountIds(entries, enterpriseId);
    if (!resolvedEntries.success) {
      return { success: false, error: resolvedEntries.error };
    }

    return this.createComplexVoucher(
      {
        enterpriseId,
        userId,
        sourceType: 'purchase_order',
        sourceData: order,
      },
      {
        voucherNo: '',
        voucherDate: new Date(),
        summary: `采购订单 ${order.orderNo}`,
        sourceType: 'purchase_order',
        sourceId: order.id,
        entries: resolvedEntries.entries!,
        totalDebit: totalAmount.toFixed(2),
        totalCredit: totalAmount.toFixed(2),
      },
    );
  }

  /**
   * 采购入库自动记账
   */
  async autoAccountPurchaseInbound(
    inbound: any,
    enterpriseId: number,
    userId: number,
  ): Promise<AutoAccountingResult> {
    const totalAmount = parseFloat(inbound.totalAmount || 0);

    const entries: ComplexVoucherEntry[] = [
      {
        accountId: 0,
        accountName: '库存商品',
        accountCode: '1405',
        direction: 'debit',
        amount: totalAmount.toFixed(2),
        summary: `采购入库 ${inbound.orderNo || inbound.id}`,
      },
      {
        accountId: 0,
        accountName: '在途物资',
        accountCode: '1402',
        direction: 'credit',
        amount: totalAmount.toFixed(2),
        summary: `采购入库 ${inbound.orderNo || inbound.id}`,
      },
    ];

    const resolvedEntries = await this.resolveAccountIds(entries, enterpriseId);
    if (!resolvedEntries.success) {
      return { success: false, error: resolvedEntries.error };
    }

    return this.createComplexVoucher(
      {
        enterpriseId,
        userId,
        sourceType: 'purchase_inbound',
        sourceData: inbound,
      },
      {
        voucherNo: '',
        voucherDate: new Date(),
        summary: `采购入库 ${inbound.orderNo || inbound.id}`,
        sourceType: 'purchase_inbound',
        sourceId: inbound.id,
        entries: resolvedEntries.entries!,
        totalDebit: totalAmount.toFixed(2),
        totalCredit: totalAmount.toFixed(2),
      },
    );
  }

  /**
   * 费用报销自动记账
   */
  async autoAccountExpenseRequest(
    expense: any,
    enterpriseId: number,
    userId: number,
  ): Promise<AutoAccountingResult> {
    const entries: ComplexVoucherEntry[] = [];
    const amount = parseFloat(expense.amount || 0);

    // 1. 费用确认
    const expenseAccountCode = this.mapExpenseCategory(expense.category);
    entries.push({
      accountId: 0,
      accountName: expense.category || '管理费用',
      accountCode: expenseAccountCode,
      direction: 'debit',
      amount: amount.toFixed(2),
      summary: `报销单 ${expense.expenseNo || expense.id} - ${expense.category}`,
      auxiliaries: expense.departmentId
        ? [
            {
              type: 'department',
              id: expense.departmentId,
              name: expense.departmentName || '',
            },
          ]
        : undefined,
    });

    entries.push({
      accountId: 0,
      accountName: '其他应付款',
      accountCode: '2241',
      direction: 'credit',
      amount: amount.toFixed(2),
      summary: `报销单 ${expense.expenseNo || expense.id}`,
      auxiliaries: [
        {
          type: 'employee',
          id: expense.employeeId || expense.createdBy,
          name: expense.employeeName || '',
        },
      ],
    });

    // 2. 付款（如果已付款）
    if (expense.status === 'paid' || expense.status === 'completed') {
      const paymentMethod = expense.paymentMethod || 'cash';
      const paymentAccountCode = paymentMethod === 'bank' ? '1002' : '1001';
      const paymentAccountName =
        paymentMethod === 'bank' ? '银行存款' : '库存现金';

      entries.push({
        accountId: 0,
        accountName: '其他应付款',
        accountCode: '2241',
        direction: 'debit',
        amount: amount.toFixed(2),
        summary: `报销单 ${expense.expenseNo || expense.id} 付款`,
      });

      entries.push({
        accountId: 0,
        accountName: paymentAccountName,
        accountCode: paymentAccountCode,
        direction: 'credit',
        amount: amount.toFixed(2),
        summary: `报销单 ${expense.expenseNo || expense.id} 付款`,
      });
    }

    const resolvedEntries = await this.resolveAccountIds(entries, enterpriseId);
    if (!resolvedEntries.success) {
      return { success: false, error: resolvedEntries.error };
    }

    return this.createComplexVoucher(
      {
        enterpriseId,
        userId,
        sourceType: 'expense_request',
        sourceData: expense,
      },
      {
        voucherNo: '',
        voucherDate: new Date(),
        summary: `费用报销 ${expense.expenseNo || expense.id}`,
        sourceType: 'expense_request',
        sourceId: expense.id,
        entries: resolvedEntries.entries!,
        totalDebit: (amount * (expense.status === 'paid' ? 2 : 1)).toFixed(2),
        totalCredit: (amount * (expense.status === 'paid' ? 2 : 1)).toFixed(2),
      },
    );
  }

  /**
   * 客户回款自动记账
   */
  async autoAccountPaymentReceived(
    payment: any,
    enterpriseId: number,
    userId: number,
  ): Promise<AutoAccountingResult> {
    const amount = parseFloat(payment.amount || 0);

    const entries: ComplexVoucherEntry[] = [
      {
        accountId: 0,
        accountName: '银行存款',
        accountCode: '1002',
        direction: 'debit',
        amount: amount.toFixed(2),
        summary: `客户回款 ${payment.customerName || ''} ${payment.referenceNo || ''}`,
      },
      {
        accountId: 0,
        accountName: '应收账款',
        accountCode: '1122',
        direction: 'credit',
        amount: amount.toFixed(2),
        summary: `客户回款 ${payment.customerName || ''}`,
        auxiliaries: payment.customerId
          ? [
              {
                type: 'customer',
                id: payment.customerId,
                name: payment.customerName || '',
              },
            ]
          : undefined,
      },
    ];

    const resolvedEntries = await this.resolveAccountIds(entries, enterpriseId);
    if (!resolvedEntries.success) {
      return { success: false, error: resolvedEntries.error };
    }

    return this.createComplexVoucher(
      {
        enterpriseId,
        userId,
        sourceType: 'payment_received',
        sourceData: payment,
      },
      {
        voucherNo: '',
        voucherDate: new Date(),
        summary: `客户回款 ${payment.customerName || ''}`,
        sourceType: 'payment_received',
        sourceId: payment.id,
        entries: resolvedEntries.entries!,
        totalDebit: amount.toFixed(2),
        totalCredit: amount.toFixed(2),
      },
    );
  }

  /**
   * 供应商付款自动记账
   */
  async autoAccountPaymentMade(
    payment: any,
    enterpriseId: number,
    userId: number,
  ): Promise<AutoAccountingResult> {
    const amount = parseFloat(payment.amount || 0);

    const entries: ComplexVoucherEntry[] = [
      {
        accountId: 0,
        accountName: '应付账款',
        accountCode: '2202',
        direction: 'debit',
        amount: amount.toFixed(2),
        summary: `供应商付款 ${payment.supplierName || ''} ${payment.referenceNo || ''}`,
        auxiliaries: payment.supplierId
          ? [
              {
                type: 'supplier',
                id: payment.supplierId,
                name: payment.supplierName || '',
              },
            ]
          : undefined,
      },
      {
        accountId: 0,
        accountName: '银行存款',
        accountCode: '1002',
        direction: 'credit',
        amount: amount.toFixed(2),
        summary: `供应商付款 ${payment.supplierName || ''}`,
      },
    ];

    const resolvedEntries = await this.resolveAccountIds(entries, enterpriseId);
    if (!resolvedEntries.success) {
      return { success: false, error: resolvedEntries.error };
    }

    return this.createComplexVoucher(
      {
        enterpriseId,
        userId,
        sourceType: 'payment_made',
        sourceData: payment,
      },
      {
        voucherNo: '',
        voucherDate: new Date(),
        summary: `供应商付款 ${payment.supplierName || ''}`,
        sourceType: 'payment_made',
        sourceId: payment.id,
        entries: resolvedEntries.entries!,
        totalDebit: amount.toFixed(2),
        totalCredit: amount.toFixed(2),
      },
    );
  }

  /**
   * 发票自动入账
   */
  async autoAccountInvoice(
    invoice: any,
    enterpriseId: number,
    userId: number,
  ): Promise<AutoAccountingResult> {
    const amount = parseFloat(invoice.taxAmount || 0);

    if (amount <= 0) {
      return { success: false, error: '发票税额为零，无需生成凭证' };
    }

    const entries: ComplexVoucherEntry[] = [];

    if (invoice.type === 'input') {
      // 进项发票
      entries.push({
        accountId: 0,
        accountName: '应交税费-应交增值税-进项税额',
        accountCode: '22210101',
        direction: 'debit',
        amount: amount.toFixed(2),
        summary: `发票 ${invoice.invoiceNo} 进项税额`,
      });

      entries.push({
        accountId: 0,
        accountName: '应付账款',
        accountCode: '2202',
        direction: 'credit',
        amount: amount.toFixed(2),
        summary: `发票 ${invoice.invoiceNo} 税额`,
      });
    } else {
      // 销项发票
      entries.push({
        accountId: 0,
        accountName: '应收账款',
        accountCode: '1122',
        direction: 'debit',
        amount: amount.toFixed(2),
        summary: `发票 ${invoice.invoiceNo} 销项税额`,
      });

      entries.push({
        accountId: 0,
        accountName: '应交税费-应交增值税-销项税额',
        accountCode: '22210105',
        direction: 'credit',
        amount: amount.toFixed(2),
        summary: `发票 ${invoice.invoiceNo} 销项税额`,
      });
    }

    const resolvedEntries = await this.resolveAccountIds(entries, enterpriseId);
    if (!resolvedEntries.success) {
      return { success: false, error: resolvedEntries.error };
    }

    return this.createComplexVoucher(
      {
        enterpriseId,
        userId,
        sourceType:
          invoice.type === 'input' ? 'invoice_purchase' : 'invoice_sales',
        sourceData: invoice,
      },
      {
        voucherNo: '',
        voucherDate: new Date(),
        summary: `发票 ${invoice.invoiceNo} ${invoice.type === 'input' ? '进项' : '销项'}税额`,
        sourceType:
          invoice.type === 'input' ? 'invoice_purchase' : 'invoice_sales',
        sourceId: invoice.id,
        entries: resolvedEntries.entries!,
        totalDebit: amount.toFixed(2),
        totalCredit: amount.toFixed(2),
      },
    );
  }

  /**
   * 解析科目代码为科目ID
   */
  private async resolveAccountIds(
    entries: ComplexVoucherEntry[],
    enterpriseId: number,
  ): Promise<{
    success: boolean;
    entries?: ComplexVoucherEntry[];
    error?: string;
  }> {
    const resolvedEntries: ComplexVoucherEntry[] = [];

    for (const entry of entries) {
      const [account] = await this.db
        .select()
        .from(schema.accounts)
        .where(
          and(
            eq(schema.accounts.enterpriseId, enterpriseId),
            eq(schema.accounts.code, entry.accountCode),
            eq(schema.accounts.isActive, true),
          ),
        )
        .limit(1);

      if (!account) {
        return {
          success: false,
          error: `找不到科目: ${entry.accountCode} ${entry.accountName}，请先初始化科目表`,
        };
      }

      resolvedEntries.push({
        ...entry,
        accountId: account.id,
        accountName: account.name,
      });
    }

    return { success: true, entries: resolvedEntries };
  }

  /**
   * 费用类别映射到科目代码
   */
  private mapExpenseCategory(category?: string): string {
    const mapping: Record<string, string> = {
      办公费: '660201',
      差旅费: '660202',
      业务招待费: '660203',
      车辆费: '660204',
      广告费: '660205',
      咨询费: '660206',
      工资: '660207',
      社保: '660208',
      租金: '660209',
      水电费: '660210',
    };

    return mapping[category || ''] || '660201'; // 默认为办公费
  }
}
