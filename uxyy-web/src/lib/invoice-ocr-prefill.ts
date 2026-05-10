import type { InvoiceType } from "@uxyy/shared";
import type { InvoiceOcrResult } from "@/lib/api/invoice-ocr";
import { normalizeOptionalInvoiceDecimalField } from "@/lib/invoice-create-field-normalize";

/** 与发票新建表单预填共用（`InvoicesPanel` ← OCR 确认入账） */
export const INVOICE_OCR_PREFILL_STORAGE_KEY = "uxyy_invoice_ocr_prefill_v1";

export type StoredInvoiceOcrPrefillV1 = {
  v: 1;
  payload: InvoiceOcrResult;
};

export function guessInvoiceTypeFromOcrLabel(label: string): InvoiceType {
  const t = label.trim();
  if (/增值\s*税\s*专用|专用\s*发票|^专票/.test(t)) return "special";
  if (/电子.*普通|电子发票|数电|电子普通/.test(t)) return "electronic";
  if (/普通/.test(t)) return "normal";
  return "electronic";
}

function fmtMoney(n: number): string {
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

function webOcrResultToInvoiceFormPartial(ocr: InvoiceOcrResult): {
  invoiceNo: string;
  invoiceCode?: string;
  type: InvoiceType;
  amount: string;
  taxRate?: string;
  taxAmount: string;
  totalAmount: string;
  buyerName?: string;
  buyerTaxNo?: string;
  sellerName?: string;
  sellerTaxNo?: string;
  invoiceDate: string;
  remark?: string;
} {
  const today = new Date().toISOString().slice(0, 10);
  let invoiceDate = "";
  const raw = ocr.invoiceDate?.trim() ?? "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    invoiceDate = raw.slice(0, 10);
  }
  if (!invoiceDate) invoiceDate = today;

  return {
    invoiceNo: ocr.invoiceNumber?.trim() ?? "",
    invoiceCode: ocr.invoiceCode?.trim() || undefined,
    type: guessInvoiceTypeFromOcrLabel(ocr.invoiceType ?? ""),
    amount: fmtMoney(ocr.amount),
    taxRate: normalizeOptionalInvoiceDecimalField(ocr.taxRate) ?? undefined,
    taxAmount: fmtMoney(ocr.taxAmount),
    totalAmount: fmtMoney(ocr.totalAmount),
    buyerName: ocr.buyerName?.trim() || undefined,
    buyerTaxNo: ocr.buyerTaxId?.trim() || undefined,
    sellerName: ocr.sellerName?.trim() || undefined,
    sellerTaxNo: ocr.sellerTaxId?.trim() || undefined,
    invoiceDate,
    remark: ocr.remarks?.trim() || undefined,
  };
}

/** OCR 面板结果 → 发票新建表单初始值（与 `invoices-panel` 中 `InvoiceFormData` 兼容） */
export function webOcrResultToInvoiceFormData(
  ocr: InvoiceOcrResult,
): {
  invoiceNo: string;
  invoiceCode: string;
  type: InvoiceType;
  amount: string;
  taxRate: string;
  taxAmount: string;
  totalAmount: string;
  buyerName: string;
  buyerTaxNo: string;
  sellerName: string;
  sellerTaxNo: string;
  invoiceDate: string;
  remark: string;
} {
  const p = webOcrResultToInvoiceFormPartial(ocr);
  return {
    invoiceNo: p.invoiceNo,
    invoiceCode: p.invoiceCode ?? "",
    type: p.type,
    amount: p.amount,
    taxRate: p.taxRate ?? "",
    taxAmount: p.taxAmount ?? "",
    totalAmount: p.totalAmount,
    buyerName: p.buyerName ?? "",
    buyerTaxNo: p.buyerTaxNo ?? "",
    sellerName: p.sellerName ?? "",
    sellerTaxNo: p.sellerTaxNo ?? "",
    invoiceDate: p.invoiceDate ?? new Date().toISOString().slice(0, 10),
    remark: p.remark ?? "",
  };
}
