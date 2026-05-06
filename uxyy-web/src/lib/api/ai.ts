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
