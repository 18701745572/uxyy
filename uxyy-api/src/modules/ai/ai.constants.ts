/** BullMQ 主队列：AI / 异步推理 */
export const AI_DEFAULT_QUEUE = 'ai-default';

/** BullMQ 死信队列：超过最大重试次数的任务 */
export const AI_DLQ_QUEUE = 'ai-default-dlq';

/** AI 任务类型 */
export const AI_TASK_TYPES = [
  'ocr_invoice',
  'accounting_suggestion',
  'classification',
] as const;

export type AiTaskType = (typeof AI_TASK_TYPES)[number];

/** BullMQ Job 名（与 Processor 中 @Process 名一致） */
export const AI_PROCESS_JOB = 'ai-process';

/** 默认重试配置 */
export const AI_JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { age: 24 * 3600 }, // 成功任务 24h 后清理
  removeOnFail: { age: 7 * 24 * 3600 }, // 失败任务 7d 后清理
};
