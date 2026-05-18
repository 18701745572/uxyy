/**
 * 财务报表导出 — 与 FinanceService 返回结构的字段映射说明
 *
 * 【资产负债表 getBalanceSheet】
 * - Excel：三张工作表「资产 / 负债 / 所有者权益」
 *   - 行数据：BalanceSheetItemDto → 列 科目编码(code)、科目名称(name)、期末余额(amount)
 *   - 每表末行：小计 → name 为「小计」，amount 为 totalAssets | totalLiabilities | totalEquity
 * - PDF：同上三区表格 + 表头 period（截止日期）
 *
 * 【利润表 getIncomeStatement】
 * - 行字段：报表段落(category) + 科目编码 + 科目名称 + 本期金额
 *   - category：营业收入 | 营业成本 | 期间费用 | 合计
 *   - 营业收入/成本/费用：来自 revenue[] / costs[] / expenses[]（code, name, amount）
 *   - 各段落后跟小计行：小计字段 → totalRevenue / totalCosts / totalExpenses
 *   - 末行：净利润 → netProfit（category=合计）
 *
 * 【现金流量表 getCashFlow】
 * - 行字段：报表段落(category) + 代码 + 项目 + 金额
 *   - category：经营活动 | 投资活动 | 筹资活动 | 现金流量汇总
 *   - operatingActivities / investingActivities / financingActivities：CashFlowItemDto（code, name, amount）
 *   - 汇总行：netOperatingCashFlow、netInvestingCashFlow、netFinancingCashFlow、netCashFlow、beginningCash、endingCash
 *
 * 【应收应付 getArAp】
 * - Excel：两张工作表「应收账款」「应付账款」
 *   - 行：ArApItemDto → 发票ID、往来单位、发票号码、应收/应付金额、已收/已付、余额、开票日、逾期天数
 *   - 注意：当前应付「已付」无独立表，paidAmount 可能为 0
 * - PDF：两个表格 + totalReceivables / totalPayables 页脚
 */

import type { ExportColumn } from '../services/export.service';
import type {
  ArApResponseDto,
  BalanceSheetResponseDto,
  CashFlowResponseDto,
  IncomeStatementResponseDto,
} from '../../modules/finance/dto/report.dto';

export type BalanceSheetReport = BalanceSheetResponseDto;
export type IncomeStatementReport = IncomeStatementResponseDto;
export type CashFlowReport = CashFlowResponseDto;
export type ArApReport = ArApResponseDto;

const col = (key: string, header: string, width: number): ExportColumn => ({
  key,
  header,
  width,
});

export function balanceSheetExcelWorkbook(r: BalanceSheetReport): {
  name: string;
  data: Record<string, unknown>[];
  columns: ExportColumn[];
}[] {
  const itemCols: ExportColumn[] = [
    col('code', '科目编码', 14),
    col('name', '科目名称', 28),
    col('amount', '期末余额', 16),
  ];
  const block = (
    sheetName: string,
    items: { code: string; name: string; amount: string }[],
    total: string,
    totalLabel: string,
  ) => ({
    name: sheetName,
    columns: itemCols,
    data: [
      ...items.map((x) => ({
        code: x.code,
        name: x.name,
        amount: x.amount,
      })),
      { code: '', name: totalLabel, amount: total },
    ],
  });
  return [
    block('资产', r.assets, r.totalAssets, '资产合计'),
    block('负债', r.liabilities, r.totalLiabilities, '负债合计'),
    block('所有者权益', r.equity, r.totalEquity, '权益合计'),
  ];
}

/** 单表 CSV：带「报表段落」列，便于筛选 */
export function balanceSheetCsvRows(
  r: BalanceSheetReport,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const x of r.assets) rows.push({ section: '资产', ...x });
  rows.push({
    section: '资产',
    code: '',
    name: '资产合计',
    amount: r.totalAssets,
  });
  for (const x of r.liabilities) rows.push({ section: '负债', ...x });
  rows.push({
    section: '负债',
    code: '',
    name: '负债合计',
    amount: r.totalLiabilities,
  });
  for (const x of r.equity) rows.push({ section: '所有者权益', ...x });
  rows.push({
    section: '所有者权益',
    code: '',
    name: '权益合计',
    amount: r.totalEquity,
  });
  return rows;
}

export function incomeStatementExcelRows(
  r: IncomeStatementReport,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [
    { category: '报表期间', code: '', name: r.period, amount: '' },
  ];
  const pushBlock = (
    category: string,
    items: { code: string; name: string; amount: string }[],
    subtotal: string,
    subLabel: string,
  ) => {
    for (const x of items)
      rows.push({ category, code: x.code, name: x.name, amount: x.amount });
    rows.push({ category, code: '', name: subLabel, amount: subtotal });
  };
  pushBlock('营业收入', r.revenue, r.totalRevenue, '营业收入小计');
  pushBlock('营业成本', r.costs, r.totalCosts, '营业成本小计');
  pushBlock('期间费用', r.expenses, r.totalExpenses, '期间费用小计');
  rows.push({
    category: '合计',
    code: '',
    name: '净利润',
    amount: r.netProfit,
  });
  return rows;
}

export const incomeStatementExcelColumns: ExportColumn[] = [
  col('category', '报表段落', 12),
  col('code', '科目编码', 12),
  col('name', '科目名称', 28),
  col('amount', '本期金额', 16),
];

export function cashFlowExcelRows(
  r: CashFlowReport,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [
    { category: '报表期间', code: '', name: r.period, amount: '' },
  ];
  const pushLines = (
    category: string,
    lines: { code: string; name: string; amount: string }[],
    net: string,
    netLabel: string,
  ) => {
    for (const x of lines)
      rows.push({ category, code: x.code, name: x.name, amount: x.amount });
    rows.push({ category, code: '', name: netLabel, amount: net });
  };
  pushLines(
    '经营活动',
    r.operatingActivities,
    r.netOperatingCashFlow,
    '经营活动现金流量净额',
  );
  pushLines(
    '投资活动',
    r.investingActivities,
    r.netInvestingCashFlow,
    '投资活动现金流量净额',
  );
  pushLines(
    '筹资活动',
    r.financingActivities,
    r.netFinancingCashFlow,
    '筹资活动现金流量净额',
  );
  rows.push({
    category: '现金流量汇总',
    code: '',
    name: '现金及等价物净增加额',
    amount: r.netCashFlow,
  });
  rows.push({
    category: '现金流量汇总',
    code: '',
    name: '期初现金及等价物余额',
    amount: r.beginningCash,
  });
  rows.push({
    category: '现金流量汇总',
    code: '',
    name: '期末现金及等价物余额',
    amount: r.endingCash,
  });
  return rows;
}

export const cashFlowExcelColumns: ExportColumn[] = [
  col('category', '报表段落', 14),
  col('code', '代码', 12),
  col('name', '项目', 40),
  col('amount', '金额', 16),
];

const arApItemColumns: ExportColumn[] = [
  col('id', '发票ID', 10),
  col('name', '往来单位', 22),
  col('invoiceNo', '发票号码', 18),
  col('amount', '价税合计', 14),
  col('paidAmount', '已收/已付', 14),
  col('balance', '余额', 14),
  col('issueDate', '开票日期', 18),
  col('daysOverdue', '逾期天数', 10),
];

export function arApExcelWorkbook(r: ArApReport): {
  name: string;
  data: Record<string, unknown>[];
  columns: ExportColumn[];
}[] {
  return [
    {
      name: '应收账款',
      columns: arApItemColumns,
      data: r.receivables.map((x) => ({
        id: x.id,
        name: x.name,
        invoiceNo: x.invoiceNo,
        amount: x.amount,
        paidAmount: x.paidAmount,
        balance: x.balance,
        issueDate: x.issueDate ?? '',
        daysOverdue: x.daysOverdue,
      })),
    },
    {
      name: '应付账款',
      columns: arApItemColumns,
      data: r.payables.map((x) => ({
        id: x.id,
        name: x.name,
        invoiceNo: x.invoiceNo,
        amount: x.amount,
        paidAmount: x.paidAmount,
        balance: x.balance,
        issueDate: x.issueDate ?? '',
        daysOverdue: x.daysOverdue,
      })),
    },
    {
      name: '汇总',
      columns: [col('item', '项目', 24), col('amount', '金额', 18)],
      data: [
        { item: '应收账款余额合计', amount: r.totalReceivables },
        { item: '应付账款余额合计', amount: r.totalPayables },
      ],
    },
  ];
}

/** 单表 CSV：列「类型」区分应收/应付 */
export function arApCsvRows(r: ArApReport): Record<string, unknown>[] {
  return [
    ...r.receivables.map((x) => ({ type: '应收', ...x })),
    ...r.payables.map((x) => ({ type: '应付', ...x })),
  ];
}

export const arApCsvColumns: ExportColumn[] = [
  col('type', '类型', 8),
  col('id', '发票ID', 10),
  col('name', '往来单位', 22),
  col('invoiceNo', '发票号码', 18),
  col('amount', '价税合计', 14),
  col('paidAmount', '已收/已付', 14),
  col('balance', '余额', 14),
  col('issueDate', '开票日期', 18),
  col('daysOverdue', '逾期天数', 10),
];

export const balanceSheetCsvColumns: ExportColumn[] = [
  col('section', '报表段落', 14),
  col('code', '科目编码', 14),
  col('name', '科目名称', 28),
  col('amount', '期末余额', 16),
];
