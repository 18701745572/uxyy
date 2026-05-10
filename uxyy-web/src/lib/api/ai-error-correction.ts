import { apiFetch } from "./client";

/** 与 PostgreSQL `integer` / serial 一致；超出会触发后端/数据库错误 */
export const VOUCHER_ENTRY_ID_MAX = 2_147_483_647;

export interface ErrorDetectionResult {
  type: 'error' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  suggestion: string;
  data?: Record<string, unknown>;
}

export interface BatchDetectResponse {
  totalChecked: number;
  errorVouchers: number;
  details: Array<{
    voucherId: number;
    voucherNo: string;
    voucherDate: string;
    totalAmount: string;
    errorCount: number;
    errors: ErrorDetectionResult[];
  }>;
}

export interface CorrectionSuggestion {
  priority: 'high' | 'medium' | 'low';
  error: string;
  action: string;
  autoFixable: boolean;
}

export interface FinancialHealthReport {
  period: string;
  summary: {
    /** 后端统计 voucher_entries 条数 */
    totalVoucherEntries: number;
    errorEntries: number;
    errorRate: string;
    healthLevel: string;
  };
  errorCategories: Record<string, number>;
  topIssues: Array<[string, number]>;
}

export interface AutoFixResult {
  message: string;
  adjustment?: {
    account: string;
    amount: string;
    direction: string;
  };
}

export async function detectVoucherErrors(voucherId: number): Promise<ErrorDetectionResult[]> {
  return apiFetch<ErrorDetectionResult[]>(`/finance/ai-error-correction/check/${voucherId}`);
}

export async function batchDetectErrors(startDate?: string, endDate?: string): Promise<BatchDetectResponse> {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const qs = params.toString();
  return apiFetch<BatchDetectResponse>(`/finance/ai-error-correction/batch-check${qs ? `?${qs}` : ''}`);
}

export async function getCorrectionSuggestions(voucherId: number): Promise<CorrectionSuggestion[]> {
  return apiFetch<CorrectionSuggestion[]>(`/finance/ai-error-correction/suggestions/${voucherId}`);
}

export async function autoFixBalance(voucherId: number): Promise<AutoFixResult> {
  return apiFetch<AutoFixResult>(`/finance/ai-error-correction/auto-fix/${voucherId}`, {
    method: 'POST',
  });
}

export async function getFinancialHealthReport(month?: string): Promise<FinancialHealthReport> {
  const params = new URLSearchParams();
  if (month) params.set('month', month);
  const qs = params.toString();
  return apiFetch<FinancialHealthReport>(`/finance/ai-error-correction/health-report${qs ? `?${qs}` : ''}`);
}