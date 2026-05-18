import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';

export interface TaxReportItem {
  taxType: string;
  taxTypeCode: string;
  period: string;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  status: 'pending' | 'ready' | 'filed';
}

export interface TaxReportSummary {
  enterpriseId: number;
  period: string;
  taxTypes: {
    type: string;
    code: string;
    amount: number;
  }[];
  totalTaxableIncome: number;
  totalTaxPayable: number;
  generatedAt: string;
  fileUrl?: string;
}

export interface VATReportData {
  period: string;
  salesAmount: number;
  salesTax: number;
  purchaseAmount: number;
  purchaseTax: number;
  inputTax: number;
  outputTax: number;
  netVAT: number;
  smallScaleRate: number;
  details: {
    taxableSales: number;
    taxExemptSales: number;
    zeroRateSales: number;
  };
}

export interface IncomeTaxReportData {
  period: string;
  revenue: number;
  costs: number;
  expenses: number;
  profitBeforeTax: number;
  deductibleExpenses: number;
  taxableIncome: number;
  incomeTaxRate: number;
  incomeTaxPayable: number;
}

export interface TaxFilingGuide {
  taxType: string;
  taxTypeCode: string;
  filingPeriod: string;
  deadline: string;
  applicableEnterprises: string;
  requiredDocuments: string[];
  steps: string[];
  notes: string[];
}

@Injectable()
export class TaxReportService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  private invoiceDateExpr() {
    return sql<Date>`COALESCE(${schema.invoices.issueDate}, ${schema.invoices.createdAt})`;
  }

  async generateTaxReport(
    enterpriseId: number,
    period: string,
  ): Promise<TaxReportSummary> {
    const periodStart = new Date(`${period}-01`);
    const periodEnd = new Date(
      periodStart.getFullYear(),
      periodStart.getMonth() + 1,
      0,
    );

    const invoices = await this.db
      .select()
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.enterpriseId, enterpriseId),
          gte(this.invoiceDateExpr(), periodStart),
          lte(this.invoiceDateExpr(), periodEnd),
        ),
      )
      .orderBy(desc(this.invoiceDateExpr()));

    const taxTypeMap = new Map<string, number>();
    let totalTaxableIncome = 0;
    let totalTaxPayable = 0;

    for (const invoice of invoices) {
      if (invoice.status === 'verified' && invoice.taxAmount) {
        const taxTypeLabel =
          invoice.sourceType === 'purchase_order'
            ? '增值税（进项税额）'
            : '增值税（销项税额）';
        const taxType = this.categorizeTaxType(taxTypeLabel);
        const amount = Number(invoice.amount || 0);
        const tax = Number(invoice.taxAmount || 0);

        taxTypeMap.set(taxType, (taxTypeMap.get(taxType) || 0) + tax);
        totalTaxableIncome += amount;
        totalTaxPayable += tax;
      }
    }

    const taxTypes = Array.from(taxTypeMap.entries()).map(([type, amount]) => ({
      type: type.split('（')[0],
      code: this.getTaxTypeCode(type),
      amount: Math.round(amount * 100) / 100,
    }));

    return {
      enterpriseId,
      period,
      taxTypes,
      totalTaxableIncome: Math.round(totalTaxableIncome * 100) / 100,
      totalTaxPayable: Math.round(totalTaxPayable * 100) / 100,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateVATReport(
    enterpriseId: number,
    period: string,
  ): Promise<VATReportData> {
    const periodStart = new Date(`${period}-01`);
    const periodEnd = new Date(
      periodStart.getFullYear(),
      periodStart.getMonth() + 1,
      0,
    );

    const invoices = await this.db
      .select()
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.enterpriseId, enterpriseId),
          gte(this.invoiceDateExpr(), periodStart),
          lte(this.invoiceDateExpr(), periodEnd),
        ),
      );

    let salesAmount = 0;
    let salesTax = 0;
    let purchaseAmount = 0;
    let purchaseTax = 0;
    let taxableSales = 0;
    const taxExemptSales = 0;
    const zeroRateSales = 0;

    for (const invoice of invoices) {
      if (invoice.status !== 'verified') continue;

      const amount = Number(invoice.amount || 0);
      const tax = Number(invoice.taxAmount || 0);

      if (invoice.sourceType === 'sales_order') {
        salesAmount += amount;
        salesTax += tax;
        taxableSales += amount;
      } else if (invoice.sourceType === 'purchase_order') {
        purchaseAmount += amount;
        purchaseTax += tax;
      }
    }

    const outputTax = salesTax;
    const inputTax = purchaseTax;
    const netVAT = outputTax - inputTax;

    return {
      period,
      salesAmount: Math.round(salesAmount * 100) / 100,
      salesTax: Math.round(salesTax * 100) / 100,
      purchaseAmount: Math.round(purchaseAmount * 100) / 100,
      purchaseTax: Math.round(purchaseTax * 100) / 100,
      inputTax: Math.round(inputTax * 100) / 100,
      outputTax: Math.round(outputTax * 100) / 100,
      netVAT: Math.round(netVAT * 100) / 100,
      smallScaleRate: 0.03,
      details: {
        taxableSales: Math.round(taxableSales * 100) / 100,
        taxExemptSales: Math.round(taxExemptSales * 100) / 100,
        zeroRateSales: Math.round(zeroRateSales * 100) / 100,
      },
    };
  }

  async generateIncomeTaxReport(
    enterpriseId: number,
    period: string,
  ): Promise<IncomeTaxReportData> {
    const periodStart = new Date(`${period}-01`);
    const periodEnd = new Date(
      periodStart.getFullYear(),
      periodStart.getMonth() + 1,
      0,
    );

    const entries = await this.db
      .select()
      .from(schema.voucherEntries)
      .where(
        and(
          eq(schema.voucherEntries.enterpriseId, enterpriseId),
          gte(schema.voucherEntries.entryDate, periodStart),
          lte(schema.voucherEntries.entryDate, periodEnd),
        ),
      );

    const subjectAmounts = new Map<string, number>();
    for (const entry of entries) {
      const amt = Number(entry.amount || 0);
      const d = entry.debitAccount || '';
      const c = entry.creditAccount || '';
      if (d) subjectAmounts.set(d, (subjectAmounts.get(d) || 0) + amt);
      if (c) subjectAmounts.set(c, (subjectAmounts.get(c) || 0) - amt);
    }

    const revenue =
      this.sumByPrefix(subjectAmounts, '主营业务收入') +
      this.sumByPrefix(subjectAmounts, '其他业务收入');
    const costs = this.sumByPrefix(subjectAmounts, '主营业务成本');
    const expenses =
      this.sumByPrefix(subjectAmounts, '管理费用') +
      this.sumByPrefix(subjectAmounts, '销售费用') +
      this.sumByPrefix(subjectAmounts, '财务费用');
    const profitBeforeTax = revenue - costs - expenses;
    const deductibleExpenses = Math.min(expenses * 0.15, profitBeforeTax * 0.5);
    const taxableIncome = Math.max(0, profitBeforeTax - deductibleExpenses);
    const incomeTaxRate = taxableIncome <= 1000000 ? 0.05 : 0.25;
    const incomeTaxPayable = taxableIncome * incomeTaxRate;

    return {
      period,
      revenue: Math.round(revenue * 100) / 100,
      costs: Math.round(costs * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      profitBeforeTax: Math.round(profitBeforeTax * 100) / 100,
      deductibleExpenses: Math.round(deductibleExpenses * 100) / 100,
      taxableIncome: Math.round(taxableIncome * 100) / 100,
      incomeTaxRate,
      incomeTaxPayable: Math.round(incomeTaxPayable * 100) / 100,
    };
  }

  async generateTaxFilingGuide(
    enterpriseId: number,
  ): Promise<TaxFilingGuide[]> {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const guides: TaxFilingGuide[] = [
      {
        taxType: '增值税',
        taxTypeCode: '10100',
        filingPeriod: '月报/季报',
        deadline: '每月15日（节假日顺延）',
        applicableEnterprises: '所有增值税纳税人',
        requiredDocuments: [
          '增值税纳税申报表',
          '发票汇总表',
          '进项税额抵扣清单',
        ],
        steps: [
          '登录电子税务局',
          '选择「增值税及附加税费申报」',
          '核对销项税额数据',
          '核对进项税额数据',
          '确认应纳税额',
          '提交申报',
        ],
        notes: [
          '小规模纳税人季度销售额≤30万免征增值税',
          '一般纳税人进项发票需在勾选平台认证',
          '注意检查发票品目与税率是否匹配',
        ],
      },
      {
        taxType: '企业所得税',
        taxTypeCode: '10200',
        filingPeriod: '季报/年报',
        deadline: '季度15日，年度5月31日',
        applicableEnterprises: '所有企业所得税纳税人',
        requiredDocuments: [
          '企业所得税预缴申报表',
          '财务报表（资产负债表、利润表）',
          '成本费用明细表',
        ],
        steps: [
          '登录电子税务局',
          '选择「企业所得税申报」',
          '填写季度预缴数据',
          '核对利润总额',
          '确认应纳税所得额',
          '提交申报',
        ],
        notes: [
          '小微企业年应纳税所得额≤300万减按20%',
          '研发费用可加计75%扣除',
          '注意关联交易同期资料准备',
        ],
      },
      {
        taxType: '个人所得税',
        taxTypeCode: '10300',
        filingPeriod: '月报',
        deadline: '每月15日',
        applicableEnterprises: '扣缴义务人',
        requiredDocuments: [
          '个人所得税代扣代缴申报表',
          '员工工资发放记录',
          '专项附加扣除信息',
        ],
        steps: [
          '登录自然人电子税务局',
          '选择「扣缴申报」',
          '导入或录入员工薪资数据',
          '核对专项附加扣除',
          '确认应纳税额',
          '提交申报并缴款',
        ],
        notes: [
          '每月15日前完成上月中报',
          '专项附加扣除需员工自行确认',
          '全年一次性奖金可单独计税',
        ],
      },
      {
        taxType: '附加税费',
        taxTypeCode: '10400',
        filingPeriod: '月报/季报',
        deadline: '与增值税同步',
        applicableEnterprises: '增值税纳税人',
        requiredDocuments: ['附加税费申报表', '增值税申报表'],
        steps: [
          '登录电子税务局',
          '选择「附加税费申报」',
          '系统自动带出增值税数据',
          '确认减征优惠',
          '提交申报',
        ],
        notes: [
          '教育费附加3%、地方教育附加2%',
          '，月销售额≤10万免征',
          '疫情期间可能有减征优惠',
        ],
      },
    ];

    return guides;
  }

  async exportTaxReportExcel(
    enterpriseId: number,
    period: string,
    taxType?: string,
  ): Promise<{ fileName: string; data: unknown[] }> {
    const report = await this.generateTaxReport(enterpriseId, period);
    const rows: unknown[] = [];

    for (const item of report.taxTypes) {
      if (!taxType || item.type.includes(taxType)) {
        rows.push({
          税种: item.type,
          税种代码: item.code,
          税款所属期: period,
          金额: item.amount,
          生成时间: report.generatedAt,
        });
      }
    }

    rows.push({
      税种: '合计',
      税种代码: '-',
      税款所属期: period,
      金额: report.totalTaxPayable,
      生成时间: report.generatedAt,
    });

    return {
      fileName: `税务申报数据_${period}_${new Date().getTime()}.xlsx`,
      data: rows,
    };
  }

  async exportTaxReportPdf(
    enterpriseId: number,
    period: string,
  ): Promise<{ fileName: string; htmlContent: string }> {
    const summary = await this.generateTaxReport(enterpriseId, period);
    const vatReport = await this.generateVATReport(enterpriseId, period);
    const incomeTaxReport = await this.generateIncomeTaxReport(
      enterpriseId,
      period,
    );
    const guides = await this.generateTaxFilingGuide(enterpriseId);

    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>税务申报数据 - ${period}</title>
  <style>
    body { font-family: "SimHei", "Microsoft YaHei", Arial, sans-serif; margin: 40px; font-size: 14px; }
    h1 { text-align: center; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #007bff; margin-top: 30px; border-left: 4px solid #007bff; padding-left: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #f8f9fa; font-weight: bold; }
    .summary-box { background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .guide-box { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; }
    .highlight { color: #007bff; font-weight: bold; }
    .footer { text-align: center; color: #666; margin-top: 40px; font-size: 12px; }
  </style>
</head>
<body>
  <h1>📊 税务申报数据报告</h1>
  
  <div class="summary-box">
    <p><strong>企业ID：</strong>${enterpriseId}</p>
    <p><strong>税款所属期：</strong>${period}</p>
    <p><strong>生成时间：</strong>${summary.generatedAt}</p>
    <p><strong>应税收入合计：</strong><span class="highlight">¥${summary.totalTaxableIncome.toLocaleString()}</span></p>
    <p><strong>应纳税额合计：</strong><span class="highlight">¥${summary.totalTaxPayable.toLocaleString()}</span></p>
  </div>

  <h2>一、增值税申报数据</h2>
  <table>
    <tr><th>项目</th><th>金额（元）</th></tr>
    <tr><td>销项税额</td><td>¥${vatReport.outputTax.toLocaleString()}</td></tr>
    <tr><td>进项税额</td><td>¥${vatReport.inputTax.toLocaleString()}</td></tr>
    <tr><td>应纳税额（销项-进项）</td><td><strong>¥${vatReport.netVAT.toLocaleString()}</strong></td></tr>
  </table>
  <p>📌 <em>小规模纳税人适用税率：${vatReport.smallScaleRate * 100}%</em></p>

  <h2>二、企业所得税数据</h2>
  <table>
    <tr><th>项目</th><th>金额（元）</th></tr>
    <tr><td>营业收入</td><td>¥${incomeTaxReport.revenue.toLocaleString()}</td></tr>
    <tr><td>营业成本</td><td>¥${incomeTaxReport.costs.toLocaleString()}</td></tr>
    <tr><td>期间费用</td><td>¥${incomeTaxReport.expenses.toLocaleString()}</td></tr>
    <tr><td>税前利润</td><td>¥${incomeTaxReport.profitBeforeTax.toLocaleString()}</td></tr>
    <tr><td>可扣除限额</td><td>¥${incomeTaxReport.deductibleExpenses.toLocaleString()}</td></tr>
    <tr><td>应纳税所得额</td><td><strong>¥${incomeTaxReport.taxableIncome.toLocaleString()}</strong></td></tr>
    <tr><td>适用税率</td><td>${incomeTaxReport.incomeTaxRate * 100}%</td></tr>
    <tr><td>应纳所得税额</td><td><strong>¥${incomeTaxReport.incomeTaxPayable.toLocaleString()}</strong></td></tr>
  </table>

  <h2>三、申报操作指南</h2>
  ${guides
    .map(
      (guide, index) => `
  <div class="guide-box">
    <h3>${index + 1}. ${guide.taxType}（${guide.taxTypeCode}）</h3>
    <p><strong>申报周期：</strong>${guide.filingPeriod}</p>
    <p><strong>申报截止日：</strong>${guide.deadline}</p>
    <p><strong>适用企业：</strong>${guide.applicableEnterprises}</p>
    <p><strong>操作步骤：</strong></p>
    <ol>${guide.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
    <p><strong>注意事项：</strong></p>
    <ul>${guide.notes.map((n) => `<li>${n}</li>`).join('')}</ul>
  </div>
  `,
    )
    .join('')}

  <div class="footer">
    <p>本报告由优效营（uxyy.cn）自动生成</p>
    <p>数据仅供参考，最终以税局申报系统为准</p>
    <p>生成时间：${new Date().toLocaleString('zh-CN')}</p>
  </div>
</body>
</html>`;

    return {
      fileName: `税务申报报告_${period}_${new Date().getTime()}.html`,
      htmlContent,
    };
  }

  private categorizeTaxType(taxType: string): string {
    if (taxType.includes('增值税') || taxType.includes('VAT')) {
      return '增值税';
    } else if (taxType.includes('所得税') || taxType.includes('企业所得税')) {
      return '企业所得税';
    } else if (taxType.includes('个人所得税')) {
      return '个人所得税';
    } else if (taxType.includes('附加税')) {
      return '附加税费';
    }
    return '其他税费';
  }

  private getTaxTypeCode(taxType: string): string {
    const codeMap: Record<string, string> = {
      增值税: '10100',
      企业所得税: '10200',
      个人所得税: '10300',
      附加税费: '10400',
      其他税费: '10900',
    };
    return codeMap[taxType] || '10900';
  }

  private sumByPrefix(amounts: Map<string, number>, prefix: string): number {
    let sum = 0;
    for (const [name, amount] of amounts) {
      if (name.startsWith(prefix) || name.includes(prefix)) {
        sum += amount;
      }
    }
    return sum;
  }
}
