import { z } from "zod";

export const AI_TASK_TYPES = [
  "ocr_invoice",
  "accounting_suggestion",
  "classification",
] as const;

export const aiTaskTypeEnum = z.enum(AI_TASK_TYPES);
export type AiTaskType = z.infer<typeof aiTaskTypeEnum>;

export const AI_TASK_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
  "dead",
] as const;

export const aiTaskStatusEnum = z.enum(AI_TASK_STATUSES);
export type AiTaskStatus = z.infer<typeof aiTaskStatusEnum>;

export const aiSubmitTaskSchema = z.object({
  taskType: aiTaskTypeEnum,
  clientKey: z.string().max(255).optional(),
  payload: z.record(z.unknown()),
});
export type AiSubmitTask = z.infer<typeof aiSubmitTaskSchema>;

export const aiAccountingEntrySchema = z.object({
  accountSubject: z.string(),
  debit: z.number().min(0),
  credit: z.number().min(0),
  description: z.string(),
});
export type AiAccountingEntry = z.infer<typeof aiAccountingEntrySchema>;

export const AI_SUGGESTION_TYPES = [
  "invoice_entry",
  "voucher_suggestion",
  "classification",
] as const;

export const aiAccountingSuggestionSchema = z.object({
  suggestionType: z.enum(AI_SUGGESTION_TYPES),
  confidence: z.number().min(0).max(1),
  entries: z.array(aiAccountingEntrySchema),
});
export type AiAccountingSuggestion = z.infer<
  typeof aiAccountingSuggestionSchema
>;

export const aiTaskResultSchema = z.object({
  id: z.number(),
  taskType: aiTaskTypeEnum,
  status: aiTaskStatusEnum,
  clientKey: z.string().nullable(),
  inputPayload: z.record(z.unknown()).nullable(),
  outputPayload: z.record(z.unknown()).nullable(),
  errorMessage: z.string().nullable(),
  attempts: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AiTaskResult = z.infer<typeof aiTaskResultSchema>;
