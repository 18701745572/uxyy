import { z } from 'zod';

// ==================== 枚举 ====================

export const invoiceTypeSchema = z.enum(['special', 'normal', 'electronic']);
export type InvoiceType = z.infer<typeof invoiceTypeSchema>;

export const invoiceStatusSchema = z.enum([
  'unverified',
  'verified',
  'entered',
  'void',
]);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const balanceDirectionSchema = z.enum(['debit', 'credit']);
export type BalanceDirection = z.infer<typeof balanceDirectionSchema>;

export const accountCategorySchema = z.enum([
  'asset',
  'liability',
  'equity',
  'income',
  'expense',
]);
export type AccountCategory = z.infer<typeof accountCategorySchema>;

// ==================== 金额（字符串序列化，避免浮点误差）====================

export const amountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, '金额格式：整数或最多两位小数，如 10000.00');

// ==================== 发票 ====================

export const invoiceResponseSchema = z.object({
  id: z.number(),
  enterpriseId: z.number(),
  invoiceNo: z.string(),
  invoiceCode: z.string().nullable(),
  type: invoiceTypeSchema,
  amount: amountSchema,
  taxRate: amountSchema,
  taxAmount: amountSchema,
  totalAmount: amountSchema,
  buyerName: z.string().nullable(),
  buyerTaxNo: z.string().nullable(),
  sellerName: z.string().nullable(),
  sellerTaxNo: z.string().nullable(),
  issueDate: z.string().nullable(),
  status: invoiceStatusSchema,
  ocrData: z.unknown().nullable(),
  sourceType: z.string().nullable(),
  sourceId: z.number().nullable(),
  createdBy: z.number().nullable(),
  createdAt: z.string(),
});
export type InvoiceResponse = z.infer<typeof invoiceResponseSchema>;

export const invoiceListResponseSchema = z.object({
  items: z.array(invoiceResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type InvoiceListResponse = z.infer<typeof invoiceListResponseSchema>;

// ==================== 凭证分录 ====================

export const voucherEntryResponseSchema = z.object({
  id: z.number(),
  enterpriseId: z.number(),
  voucherNo: z.string(),
  sourceType: z.string(),
  sourceId: z.number().nullable(),
  entryDate: z.string(),
  debitAccount: z.string(),
  creditAccount: z.string(),
  amount: amountSchema,
  summary: z.string().nullable(),
  createdBy: z.number(),
  createdAt: z.string(),
});
export type VoucherEntryResponse = z.infer<typeof voucherEntryResponseSchema>;

export const voucherEntryListResponseSchema = z.object({
  items: z.array(voucherEntryResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type VoucherEntryListResponse = z.infer<
  typeof voucherEntryListResponseSchema
>;

// ==================== 会计科目 ====================

export const accountSubjectResponseSchema = z.object({
  id: z.number(),
  enterpriseId: z.number(),
  code: z.string(),
  name: z.string(),
  category: accountCategorySchema,
  parentId: z.number().nullable(),
  balanceDirection: balanceDirectionSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
});
export type AccountSubjectResponse = z.infer<
  typeof accountSubjectResponseSchema
>;

// ==================== 经营概览报表 ====================

export const lowStockProductSchema = z.object({
  productId: z.number(),
  productName: z.string(),
  stockQty: amountSchema,
  minStock: amountSchema,
});

export const topSalesProductSchema = z.object({
  productId: z.number(),
  productName: z.string(),
  salesQty: amountSchema,
  salesAmount: amountSchema,
});

export const dashboardReportResponseSchema = z.object({
  period: z.string(),
  salesAmount: amountSchema,
  salesOrderCount: z.number(),
  purchaseAmount: amountSchema,
  purchaseOrderCount: z.number(),
  grossProfit: amountSchema,
  grossProfitRate: z.string(),
  pendingReceivable: amountSchema,
  pendingPayable: amountSchema,
  lowStockProducts: z.array(lowStockProductSchema),
  topSalesProducts: z.array(topSalesProductSchema),
});
export type DashboardReportResponse = z.infer<
  typeof dashboardReportResponseSchema
>;

// ==================== 资产负债表 ====================

export const balanceSheetItemSchema = z.object({
  code: z.string(),
  name: z.string(),
  amount: amountSchema,
});

export const balanceSheetResponseSchema = z.object({
  period: z.string(),
  assets: z.array(balanceSheetItemSchema),
  totalAssets: amountSchema,
  liabilities: z.array(balanceSheetItemSchema),
  totalLiabilities: amountSchema,
  equity: z.array(balanceSheetItemSchema),
  totalEquity: amountSchema,
});
export type BalanceSheetResponse = z.infer<typeof balanceSheetResponseSchema>;

// ==================== 利润表 ====================

export const incomeStatementItemSchema = z.object({
  code: z.string(),
  name: z.string(),
  amount: amountSchema,
});

export const incomeStatementResponseSchema = z.object({
  period: z.string(),
  revenue: z.array(incomeStatementItemSchema),
  totalRevenue: amountSchema,
  costs: z.array(incomeStatementItemSchema),
  totalCosts: amountSchema,
  expenses: z.array(incomeStatementItemSchema),
  totalExpenses: amountSchema,
  netProfit: amountSchema,
});
export type IncomeStatementResponse = z.infer<
  typeof incomeStatementResponseSchema
>;

// ==================== 现金流量表 ====================

export const cashFlowItemSchema = z.object({
  code: z.string(),
  name: z.string(),
  amount: amountSchema,
});

export const cashFlowResponseSchema = z.object({
  period: z.string(),
  operatingActivities: z.array(cashFlowItemSchema),
  netOperatingCashFlow: amountSchema,
  investingActivities: z.array(cashFlowItemSchema),
  netInvestingCashFlow: amountSchema,
  financingActivities: z.array(cashFlowItemSchema),
  netFinancingCashFlow: amountSchema,
  netCashFlow: amountSchema,
  beginningCash: amountSchema,
  endingCash: amountSchema,
});
export type CashFlowResponse = z.infer<typeof cashFlowResponseSchema>;

// ==================== 应收应付 ====================

export const arApItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  invoiceNo: z.string(),
  amount: amountSchema,
  paidAmount: amountSchema,
  balance: amountSchema,
  issueDate: z.string().nullable(),
  daysOverdue: z.number(),
});

export const arApResponseSchema = z.object({
  receivables: z.array(arApItemSchema),
  totalReceivables: amountSchema,
  payables: z.array(arApItemSchema),
  totalPayables: amountSchema,
});
export type ArApResponse = z.infer<typeof arApResponseSchema>;
