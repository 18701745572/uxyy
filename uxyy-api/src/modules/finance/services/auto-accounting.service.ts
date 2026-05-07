import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';

/**
 * 自动记账规则引擎
 * 根据业务单据自动生成财务凭证
 */

export interface AutoAccountingRule {
  sourceType: string;
  condition?: (data: any) => boolean;
  generateVoucher: (data: any, enterpriseId: number, userId: number) => {
    debitAccount: string;
    creditAccount: string;
    amount: string;
    summary: string;
  };
}

@Injectable()
export class AutoAccountingService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  // 预定义记账规则
  private readonly rules: AutoAccountingRule[] = [
    // 销售单记账规则
    {
      sourceType: 'sales_order',
      generateVoucher: (order: any) => ({
        debitAccount: '应收账款',
        creditAccount: '主营业务收入',
        amount: order.payableAmount || order.totalAmount,
        summary: `销售订单 ${order.orderNo} 收入确认`,
      }),
    },
    // 销售单（现结）记账规则
    {
      sourceType: 'sales_order_cash',
      condition: (order: any) => order.paymentMethod === 'cash' || order.isCashSale,
      generateVoucher: (order: any) => ({
        debitAccount: '库存现金',
        creditAccount: '主营业务收入',
        amount: order.payableAmount || order.totalAmount,
        summary: `销售订单 ${order.orderNo} 现销收入`,
      }),
    },
    // 销售出库成本结转
    {
      sourceType: 'sales_outbound',
      generateVoucher: (data: any) => ({
        debitAccount: '主营业务成本',
        creditAccount: '库存商品',
        amount: data.costAmount,
        summary: `销售订单 ${data.orderNo} 成本结转`,
      }),
    },
    // 采购单记账规则
    {
      sourceType: 'purchase_order',
      generateVoucher: (order: any) => ({
        debitAccount: '库存商品',
        creditAccount: '应付账款',
        amount: order.totalAmount,
        summary: `采购订单 ${order.orderNo} 商品入库`,
      }),
    },
    // 采购单（现付）记账规则
    {
      sourceType: 'purchase_order_cash',
      condition: (order: any) => order.paymentMethod === 'cash',
      generateVoucher: (order: any) => ({
        debitAccount: '库存商品',
        creditAccount: '银行存款',
        amount: order.totalAmount,
        summary: `采购订单 ${order.orderNo} 现付采购`,
      }),
    },
    // 费用报销记账规则
    {
      sourceType: 'expense_request',
      generateVoucher: (expense: any) => ({
        debitAccount: expense.accountSubject || '管理费用-其他',
        creditAccount: '其他应付款',
        amount: expense.amount,
        summary: `报销单 ${expense.expenseNo || expense.id} - ${expense.category}`,
      }),
    },
    // 费用报销（现金支付）
    {
      sourceType: 'expense_payment',
      generateVoucher: (expense: any) => ({
        debitAccount: '其他应付款',
        creditAccount: '库存现金',
        amount: expense.amount,
        summary: `报销单 ${expense.expenseNo || expense.id} 付款`,
      }),
    },
    // 发票入账（进项）
    {
      sourceType: 'invoice_purchase',
      generateVoucher: (invoice: any) => ({
        debitAccount: '应交税费-应交增值税-进项税额',
        creditAccount: '应付账款',
        amount: invoice.taxAmount,
        summary: `发票 ${invoice.invoiceNo} 进项税额`,
      }),
    },
    // 发票入账（销项）
    {
      sourceType: 'invoice_sales',
      generateVoucher: (invoice: any) => ({
        debitAccount: '应收账款',
        creditAccount: '应交税费-应交增值税-销项税额',
        amount: invoice.taxAmount,
        summary: `发票 ${invoice.invoiceNo} 销项税额`,
      }),
    },
  ];

  /**
   * 生成凭证号
   */
  private generateVoucherNo(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PZ${y}${m}${d}${random}`;
  }

  /**
   * 根据业务单据自动生成凭证
   */
  async autoGenerateVoucher(params: {
    sourceType: string;
    sourceData: any;
    enterpriseId: number;
    userId: number;
    skipIfExists?: boolean;
  }): Promise<typeof schema.voucherEntries.$inferSelect | null> {
    const { sourceType, sourceData, enterpriseId, userId, skipIfExists = true } = params;

    // 检查是否已生成凭证
    if (skipIfExists && sourceData.id) {
      const existing = await this.db
        .select()
        .from(schema.voucherEntries)
        .where(
          eq(schema.voucherEntries.sourceType, sourceType) &&
            eq(schema.voucherEntries.sourceId, sourceData.id),
        )
        .limit(1);

      if (existing.length > 0) {
        return existing[0];
      }
    }

    // 查找匹配的规则
    const rule = this.rules.find((r) => {
      if (r.sourceType !== sourceType) return false;
      if (r.condition && !r.condition(sourceData)) return false;
      return true;
    });

    if (!rule) {
      return null;
    }

    // 生成凭证数据
    const voucherData = rule.generateVoucher(sourceData, enterpriseId, userId);

    // 创建凭证
    const [voucher] = await this.db
      .insert(schema.voucherEntries)
      .values({
        enterpriseId,
        voucherNo: this.generateVoucherNo(),
        sourceType,
        sourceId: sourceData.id,
        debitAccount: voucherData.debitAccount,
        creditAccount: voucherData.creditAccount,
        amount: voucherData.amount,
        summary: voucherData.summary,
        createdBy: userId,
      })
      .returning();

    return voucher;
  }

  /**
   * 销售单自动记账
   * 1. 确认收入：借 应收账款 / 贷 主营业务收入
   * 2. 结转成本：借 主营业务成本 / 贷 库存商品
   */
  async autoAccountSalesOrder(order: any, enterpriseId: number, userId: number) {
    const results = [];

    // 1. 收入确认凭证
    const incomeVoucher = await this.autoGenerateVoucher({
      sourceType: order.paymentMethod === 'cash' ? 'sales_order_cash' : 'sales_order',
      sourceData: order,
      enterpriseId,
      userId,
    });
    if (incomeVoucher) results.push(incomeVoucher);

    // 2. 成本结转凭证（如果有成本数据）
    if (order.costAmount && parseFloat(order.costAmount) > 0) {
      const costVoucher = await this.autoGenerateVoucher({
        sourceType: 'sales_outbound',
        sourceData: order,
        enterpriseId,
        userId,
      });
      if (costVoucher) results.push(costVoucher);
    }

    return results;
  }

  /**
   * 采购单自动记账
   * 借 库存商品 / 贷 应付账款
   */
  async autoAccountPurchaseOrder(order: any, enterpriseId: number, userId: number) {
    return this.autoGenerateVoucher({
      sourceType: order.paymentMethod === 'cash' ? 'purchase_order_cash' : 'purchase_order',
      sourceData: order,
      enterpriseId,
      userId,
    });
  }

  /**
   * 报销单自动记账
   * 1. 费用确认：借 费用科目 / 贷 其他应付款
   * 2. 付款：借 其他应付款 / 贷 库存现金/银行存款
   */
  async autoAccountExpenseRequest(expense: any, enterpriseId: number, userId: number) {
    const results = [];

    // 1. 费用确认凭证
    const expenseVoucher = await this.autoGenerateVoucher({
      sourceType: 'expense_request',
      sourceData: expense,
      enterpriseId,
      userId,
    });
    if (expenseVoucher) results.push(expenseVoucher);

    // 2. 付款凭证（如果已付款）
    if (expense.status === 'paid' || expense.status === 'completed') {
      const paymentVoucher = await this.autoGenerateVoucher({
        sourceType: 'expense_payment',
        sourceData: expense,
        enterpriseId,
        userId,
      });
      if (paymentVoucher) results.push(paymentVoucher);
    }

    return results;
  }

  /**
   * 发票自动入账
   */
  async autoAccountInvoice(invoice: any, enterpriseId: number, userId: number) {
    const sourceType = invoice.type === 'input' ? 'invoice_purchase' : 'invoice_sales';

    return this.autoGenerateVoucher({
      sourceType,
      sourceData: invoice,
      enterpriseId,
      userId,
    });
  }
}
