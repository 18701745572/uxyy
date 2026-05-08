import type {
  AiSubmitTask,
  AiTaskResult,
} from "@uxyy/shared";
import { apiFetch } from "./client";

export interface QueueStats {
  queue: string;
  counts: Record<string, number>;
  dlqQueue: string;
  dlqCounts: Record<string, number>;
}

export async function fetchAiQueueStats(): Promise<QueueStats> {
  return apiFetch<QueueStats>("/ai/queue/stats");
}

export async function submitAiTask(
  data: AiSubmitTask,
): Promise<AiTaskResult> {
  return apiFetch<AiTaskResult>("/ai/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchAiTask(id: number): Promise<AiTaskResult> {
  return apiFetch<AiTaskResult>(`/ai/tasks/${id}`);
}

export async function fetchAiTaskByClientKey(
  taskType: string,
  clientKey: string,
): Promise<AiTaskResult> {
  return apiFetch<AiTaskResult>(`/ai/tasks/by-client-key?taskType=${taskType}&clientKey=${clientKey}`);
}

/** 人工核对字段后写入财务凭证（未传字段则使用服务端解析 AI 输出的建议值） */
export type ApplyAiTaskVoucherBody = {
  debitAccount?: string;
  creditAccount?: string;
  amount?: string;
  summary?: string;
  entryDate?: string;
};

export type ApplyAiTaskVoucherResult = {
  created: boolean;
  voucher: Record<string, unknown>;
};

export async function applyAiTaskVoucher(
  taskId: number,
  body: ApplyAiTaskVoucherBody = {},
): Promise<ApplyAiTaskVoucherResult> {
  return apiFetch<ApplyAiTaskVoucherResult>(`/ai/tasks/${taskId}/voucher`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ========== 商机成单预测 API ==========

/** 与 `OpportunityPredictionService` 中单条预测结构一致 */
export interface PredictionFactor {
  name: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;
  description: string;
}

export interface OpportunityPrediction {
  opportunityId: number;
  opportunityName: string;
  customerName: string;
  currentStage: string;
  estimatedAmount: string;
  winProbability: number;
  expectedCloseDate: string;
  predictionFactors: PredictionFactor[];
  recommendedActions: string[];
  riskLevel: "high" | "medium" | "low";
}

/** 与 `getSalesFunnelPrediction` 返回的单行结构一致 */
export interface SalesFunnelPrediction {
  stage: string;
  opportunityCount: number;
  totalAmount: string;
  avgWinProbability: string;
  weightedAmount: string;
  opportunities: OpportunityPrediction[];
}

export async function predictOpportunity(
  opportunityId: number,
): Promise<OpportunityPrediction> {
  return apiFetch<OpportunityPrediction>(`/ai/predictions/opportunity/${opportunityId}`);
}

export async function batchPredictOpportunities(
  stage?: string,
): Promise<OpportunityPrediction[]> {
  const params = stage ? `?stage=${stage}` : "";
  return apiFetch<OpportunityPrediction[]>(`/ai/predictions/opportunities${params}`);
}

export async function getSalesFunnelPrediction(): Promise<SalesFunnelPrediction[]> {
  return apiFetch<SalesFunnelPrediction[]>("/ai/predictions/sales-funnel");
}

// ========== 客户流失预警 API ==========

export interface ChurnRiskFactor {
  name: string;
  severity: "critical" | "warning" | "info";
  description: string;
  metric: string;
}

/** 与 `ChurnPredictionService` 返回结构一致 */
export interface ChurnPrediction {
  customerId: number;
  customerName: string;
  churnRisk: "high" | "medium" | "low";
  churnProbability: number;
  riskFactors: ChurnRiskFactor[];
  recommendedActions: string[];
  lastOrderDate?: string;
  lastFollowUpDate?: string;
  totalOrders: number;
  totalAmount: string;
}

export interface ChurnStats {
  totalCustomers: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  highRiskPercentage: string;
  atRiskRevenue: string;
  topRiskCustomers: ChurnPrediction[];
}

export async function predictCustomerChurn(
  customerId: number,
): Promise<ChurnPrediction> {
  return apiFetch<ChurnPrediction>(`/ai/predictions/churn/${customerId}`);
}

export async function batchPredictChurn(
  riskLevel?: "high" | "medium" | "low",
): Promise<ChurnPrediction[]> {
  const params = riskLevel ? `?riskLevel=${riskLevel}` : "";
  return apiFetch<ChurnPrediction[]>(`/ai/predictions/churn${params}`);
}

export async function getChurnRiskStats(): Promise<ChurnStats> {
  return apiFetch<ChurnStats>("/ai/predictions/churn-stats");
}