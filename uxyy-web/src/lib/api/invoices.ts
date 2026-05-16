import {
  type CreateInvoiceDto,
  type InvoiceListQueryDto,
  type InvoiceListResponseDto,
  type InvoiceOcrResult,
  type InvoiceResponseDto,
  type UpdateInvoiceDto,
  ocrInvoiceResultSchema,
} from "@uxyy/shared";
import { apiFetch, apiUploadFile, ApiError, formatApiErrorBody } from "./client";

export type InvoiceImportResult = {
  created: number;
  skipped: number;
  failures: Array<{ row: number; reason: string }>;
};

/** multipart 导入发票（与导出表头对齐；mode=skip 跳过同发票号码重复） */
export async function importInvoices(
  file: File,
  mode: "skip" | "force" = "skip",
): Promise<InvoiceImportResult> {
  const q = new URLSearchParams({ mode });
  const res = await apiUploadFile(`/finance/invoices/import?${q.toString()}`, file);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(
      res.status,
      formatApiErrorBody(text, `导入失败（${res.status}）`),
    );
  }
  return res.json() as Promise<InvoiceImportResult>;
}

export async function fetchInvoices(
  query: InvoiceListQueryDto,
): Promise<InvoiceListResponseDto> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.status) params.set("status", query.status);
  if (query.startDate) params.set("startDate", query.startDate);
  if (query.endDate) params.set("endDate", query.endDate);

  const qs = params.toString();
  const raw = await apiFetch<
    InvoiceListResponseDto & {
      items?: InvoiceListResponseDto["list"];
    }
  >(`/finance/invoices${qs ? `?${qs}` : ""}`);
  const list = raw.list ?? raw.items ?? [];
  return { ...raw, list };
}

export async function postInvoiceOcr(file: File): Promise<InvoiceOcrResult> {
  const fd = new FormData();
  fd.append("file", file);
  const raw = await apiFetch<unknown>("/finance/invoices/ocr", {
    method: "POST",
    body: fd,
  });
  const parsed = ocrInvoiceResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("OCR 接口返回格式异常，请稍后重试或改用人工录入");
  }
  return parsed.data;
}

export async function createInvoice(
  data: CreateInvoiceDto,
): Promise<InvoiceResponseDto> {
  return apiFetch<InvoiceResponseDto>("/finance/invoices", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateInvoice(
  id: number,
  data: UpdateInvoiceDto,
): Promise<InvoiceResponseDto> {
  return apiFetch<InvoiceResponseDto>(`/finance/invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteInvoice(id: number): Promise<void> {
  return apiFetch<void>(`/finance/invoices/${id}`, {
    method: "DELETE",
  });
}

export async function fetchInvoice(id: number): Promise<InvoiceResponseDto> {
  return apiFetch<InvoiceResponseDto>(`/finance/invoices/${id}`);
}

export async function verifyInvoice(id: number): Promise<InvoiceResponseDto> {
  return apiFetch<InvoiceResponseDto>(`/finance/invoices/${id}/verify`, {
    method: "POST",
  });
}

export async function enterInvoice(id: number): Promise<InvoiceResponseDto> {
  return apiFetch<InvoiceResponseDto>(`/finance/invoices/${id}/enter`, {
    method: "POST",
  });
}

export async function voidInvoice(id: number): Promise<InvoiceResponseDto> {
  return apiFetch<InvoiceResponseDto>(`/finance/invoices/${id}/void`, {
    method: "POST",
  });
}
