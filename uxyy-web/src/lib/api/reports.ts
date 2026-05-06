import { ApiError, apiFetch } from "./client";
export interface DashboardData {
  period: string;
  salesAmount: string;
  salesOrderCount: number;
  purchaseAmount: string;
  purchaseOrderCount: number;
  grossProfit: string;
  grossProfitRate: string;
  pendingReceivable: string;
  pendingPayable: string;
  lowStockProducts: {
    productId: number;
    productName: string;
    stockQty: string;
    minStock: string;
  }[];
  topSalesProducts: {
    productId: number;
    productName: string;
    salesQty: string;
    salesAmount: string;
  }[];
}

/** 与 Nest `ArApLineItemDto` 对齐（发票粒度） */
export interface ArApLineItem {
  id: number;
  name: string;
  invoiceNo: string;
  amount: string;
  paidAmount: string;
  balance: string;
  issueDate: string | null;
  daysOverdue: number;
}

export interface ArApData {
  receivables: ArApLineItem[];
  totalReceivables: string;
  payables: ArApLineItem[];
  totalPayables: string;
}

export interface ReportLineItem {
  code: string;
  name: string;
  amount: string;
}

export interface BalanceSheetData {
  period: string;
  assets: ReportLineItem[];
  totalAssets: string;
  liabilities: ReportLineItem[];
  totalLiabilities: string;
  equity: ReportLineItem[];
  totalEquity: string;
}

export interface IncomeStatementData {
  period: string;
  revenue: ReportLineItem[];
  totalRevenue: string;
  costs: ReportLineItem[];
  totalCosts: string;
  expenses: ReportLineItem[];
  totalExpenses: string;
  netProfit: string;
}

export interface CashFlowData {
  period: string;
  operatingActivities: ReportLineItem[];
  netOperatingCashFlow: string;
  investingActivities: ReportLineItem[];
  netInvestingCashFlow: string;
  financingActivities: ReportLineItem[];
  netFinancingCashFlow: string;
  netCashFlow: string;
  beginningCash: string;
  endingCash: string;
}

export async function fetchDashboard(
  period?: string,
  date?: string,
): Promise<DashboardData> {
  const params = new URLSearchParams();
  if (period) params.set("period", period);
  if (date) params.set("date", date);

  const qs = params.toString();
  return apiFetch<DashboardData>(`/finance/reports/dashboard${qs ? `?${qs}` : ""}`);
}

export async function fetchBalanceSheet(
  asOfDate?: string,
): Promise<BalanceSheetData> {
  const params = new URLSearchParams();
  if (asOfDate) params.set("asOfDate", asOfDate);

  const qs = params.toString();
  return apiFetch<BalanceSheetData>(
    `/finance/reports/balance-sheet${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchIncomeStatement(
  period?: string,
): Promise<IncomeStatementData> {
  const params = new URLSearchParams();
  if (period) params.set("period", period);

  const qs = params.toString();
  return apiFetch<IncomeStatementData>(
    `/finance/reports/income-statement${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchCashFlow(
  period?: string,
): Promise<CashFlowData> {
  const params = new URLSearchParams();
  if (period) params.set("period", period);

  const qs = params.toString();
  return apiFetch<CashFlowData>(
    `/finance/reports/cash-flow${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchArAp(): Promise<ArApData> {
  return apiFetch<ArApData>("/finance/reports/ar-ap");
}

/** 友好展示后端 validation / JSON message */
export function formatReportError(err: unknown): string {
  if (!(err instanceof ApiError)) {
    return err instanceof Error ? err.message : String(err);
  }
  try {
    const o = JSON.parse(err.message) as { message?: unknown };
    if (Array.isArray(o.message)) return o.message.join("；");
    if (typeof o.message === "string") return o.message;
  } catch {
    /* 非 JSON */
  }
  return err.message;
}
