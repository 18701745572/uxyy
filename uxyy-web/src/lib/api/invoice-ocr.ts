import { apiFetch } from "./client";

export interface InvoiceItem {
  name: string;
  specification?: string;
  unit?: string;
  quantity?: number;
  price?: number;
  amount?: number;
  taxRate?: string;
  taxAmount?: number;
}

export interface InvoiceOcrResult {
  invoiceType: string;
  invoiceCode: string;
  invoiceNumber: string;
  invoiceDate: string;
  buyerName: string;
  buyerTaxId: string;
  buyerAddress?: string;
  buyerBank?: string;
  sellerName: string;
  sellerTaxId: string;
  sellerAddress?: string;
  sellerBank?: string;
  items: InvoiceItem[];
  amount: number;
  taxRate?: string;
  taxAmount: number;
  totalAmount: number;
  totalAmountCn?: string;
  remarks?: string;
  drawer?: string;
  reviewer?: string;
  payee?: string;
  confidence: number;
  ocrText?: string;
}

export interface OcrTaskResponse {
  id: number;
  taskType: string;
  status: "pending" | "processing" | "completed" | "failed" | "dead";
  clientKey?: string;
  inputPayload: Record<string, unknown> | null;
  outputPayload: InvoiceOcrResult | null;
  errorMessage?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export async function submitOcrTask(imageUrl: string): Promise<OcrTaskResponse> {
  return apiFetch<OcrTaskResponse>("/ai/tasks", {
    method: "POST",
    body: JSON.stringify({
      taskType: "ocr_invoice",
      payload: { imageUrl },
    }),
  });
}

export async function getOcrTask(taskId: number): Promise<OcrTaskResponse> {
  return apiFetch<OcrTaskResponse>(`/ai/tasks/${taskId}`);
}

export async function listOcrTasks(page?: number, pageSize?: number): Promise<{
  list: OcrTaskResponse[];
  pagination: { page: number; pageSize: number; total: number };
}> {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (pageSize) params.set("pageSize", String(pageSize));
  params.set("taskType", "ocr_invoice");
  const qs = params.toString();
  return apiFetch(`/ai/tasks${qs ? `?${qs}` : ""}`);
}