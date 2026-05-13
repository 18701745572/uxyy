import { apiFetch } from "./client";

export type BankStatementMatchStatus = "unmatched" | "matched" | "ignored" | "voucher_created";
export type TransactionType = "income" | "expense" | "transfer" | "other";

export interface BankStatementResponseDto {
  id: number;
  enterpriseId: number;
  bankCode: string;
  bankName: string;
  bankAccount: string;
  transactionDate: string;
  referenceNo: string;
  counterpartyName?: string;
  counterpartyAccount?: string;
  amount: string;
  currency: string;
  balance: string;
  transactionType: TransactionType;
  summary: string;
  matchStatus: BankStatementMatchStatus;
  matchedVoucherId?: number;
  suggestedAccountId?: number;
  suggestedAccountName?: string;
  importBatchId: string;
  createdBy: number;
  createdAt: string;
}

export interface BankStatementListResponseDto {
  items: BankStatementResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BankInfo {
  code: string;
  name: string;
  shortName: string;
  supported: boolean;
}

export interface BankStatementImportResult {
  success: boolean;
  message: string;
  totalRows: number;
  validRows: number;
  importedRows: number;
  duplicateRows: number;
  errorRows: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
  statements: BankStatementResponseDto[];
}

export interface StatementMatchResult {
  statementId: number;
  matchStatus: BankStatementMatchStatus;
  matchedVoucherId?: number;
  suggestedAccountId?: number;
  confidence: number;
}

// 获取支持的银行列表
export async function fetchSupportedBanks(): Promise<BankInfo[]> {
  return apiFetch<BankInfo[]>("/finance/extension/bank/supported-banks");
}

// 导入银行流水
export async function importBankStatement(data: {
  bankCode: string;
  bankAccount: string;
  csvContent: string;
  hasHeader?: boolean;
}): Promise<BankStatementImportResult> {
  return apiFetch<BankStatementImportResult>("/finance/extension/bank/import", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// 获取银行流水列表
export async function fetchBankStatements(params?: {
  matchStatus?: string;
  bankAccount?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<BankStatementListResponseDto> {
  const searchParams = new URLSearchParams();
  if (params?.matchStatus) searchParams.set("matchStatus", params.matchStatus);
  if (params?.bankAccount) searchParams.set("bankAccount", params.bankAccount);
  if (params?.startDate) searchParams.set("startDate", params.startDate);
  if (params?.endDate) searchParams.set("endDate", params.endDate);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));

  const qs = searchParams.toString();
  return apiFetch<BankStatementListResponseDto>(
    `/finance/extension/bank/statements${qs ? `?${qs}` : ""}`,
  );
}

// 匹配单条流水
export async function matchBankStatement(id: number): Promise<StatementMatchResult> {
  return apiFetch<StatementMatchResult>(`/finance/extension/bank/statements/${id}/match`, {
    method: "POST",
  });
}

// 批量匹配所有未匹配流水
export async function batchMatchBankStatements(): Promise<StatementMatchResult[]> {
  return apiFetch<StatementMatchResult[]>("/finance/extension/bank/batch-match", {
    method: "POST",
  });
}

// 根据流水生成凭证
export async function generateVoucherFromStatement(
  id: number,
  accountId?: number,
): Promise<{ success: boolean; voucherId?: number; message: string }> {
  return apiFetch(`/finance/extension/bank/statements/${id}/generate-voucher`, {
    method: "POST",
    body: JSON.stringify({ accountId }),
  });
}

// 获取匹配状态标签
export function getMatchStatusLabel(status: BankStatementMatchStatus): string {
  const labels: Record<BankStatementMatchStatus, string> = {
    unmatched: "未匹配",
    matched: "已匹配",
    ignored: "已忽略",
    voucher_created: "已生成凭证",
  };
  return labels[status];
}

// 获取匹配状态颜色
export function getMatchStatusColor(status: BankStatementMatchStatus): string {
  const colors: Record<BankStatementMatchStatus, string> = {
    unmatched: "text-yellow-600 bg-yellow-50",
    matched: "text-green-600 bg-green-50",
    ignored: "text-text-tertiary bg-bg-tertiary",
    voucher_created: "text-blue-600 bg-blue-50",
  };
  return colors[status];
}

// 获取交易类型标签
export function getTransactionTypeLabel(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    income: "收入",
    expense: "支出",
    transfer: "转账",
    other: "其他",
  };
  return labels[type];
}

// 获取交易类型颜色
export function getTransactionTypeColor(type: TransactionType): string {
  const colors: Record<TransactionType, string> = {
    income: "text-green-600",
    expense: "text-red-600",
    transfer: "text-blue-600",
    other: "text-text-secondary",
  };
  return colors[type];
}

// 格式化金额显示
export function formatAmount(amount: string | number, currency = "CNY"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const symbol = currency === "CNY" ? "¥" : currency;
  return `${symbol}${num.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// CSV内容示例生成
export function getCSVTemplate(bankCode: string): string {
  const templates: Record<string, string> = {
    ICBC: "交易日期,交易时间,收入金额,支出金额,余额,对方户名,对方账号,交易类型,备注\n2024-01-01,10:00:00,10000.00,,50000.00,客户A,622202******1234,货款,1月货款",
    CCB: "日期,摘要,收入,支出,余额,对方账户,对方姓名\n2024-01-01,转账收入,5000.00,,30000.00,622700******5678,供应商B",
    ABC: "交易时间,交易金额,账户余额,交易类型,对方账户,对方户名,用途\n2024-01-01 09:30:00,2000.00,15000.00,转账存入,622845******9012,客户C,定金",
    default: "日期,收入,支出,余额,对方户名,摘要\n2024-01-01,10000.00,,50000.00,客户A,货款",
  };
  return templates[bankCode] || templates.default;
}
