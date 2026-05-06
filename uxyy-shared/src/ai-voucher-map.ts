/**
 * 将 AI 任务 outputPayload 映射为凭证录入所需的一借一贷字段。
 * - 分录类：含 entries[]（与 PRD「智能记账 → 审核确认 → 凭证入库」一致）
 * - 发票 OCR 类：结构化价税字段，按「费用 + 应付」生成默认可编辑建议（采购取景）
 */

export type SuggestedVoucherFields = {
  debitAccount: string;
  creditAccount: string;
  amount: string;
  summary: string;
};

function parseFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** 识别发票 OCR 的结构化输出（无 entries） */
function isOcrInvoiceShape(o: Record<string, unknown>): boolean {
  const hasParty =
    (o.buyerName != null && String(o.buyerName).trim() !== "") ||
    (o.sellerName != null && String(o.sellerName).trim() !== "");
  const hasInvoiceId =
    (o.invoiceNumber != null && String(o.invoiceNumber).trim() !== "") ||
    (o.invoiceCode != null && String(o.invoiceCode).trim() !== "");
  const total = parseFiniteNumber(o.totalAmount);
  const amount = parseFiniteNumber(o.amount);
  const tax = parseFiniteNumber(o.taxAmount);
  const hasMoney =
    (total != null && total > 0) ||
    (amount != null && amount > 0) ||
    (tax != null && tax > 0);
  return hasParty && hasInvoiceId && hasMoney;
}

function pickInvoiceTotal(o: Record<string, unknown>): number {
  const total = parseFiniteNumber(o.totalAmount);
  if (total != null && total > 0) return total;

  const amount = parseFiniteNumber(o.amount);
  const tax = parseFiniteNumber(o.taxAmount) ?? 0;
  if (amount != null && amount > 0) {
    const sum = amount + tax;
    if (sum > 0) return sum;
  }
  throw new Error("发票 OCR 输出缺少可用的价税合计或金额字段");
}

function firstLineItemSummary(o: Record<string, unknown>): string {
  const items = o.items;
  if (!Array.isArray(items) || items.length === 0) return "";
  const first = items[0];
  if (!first || typeof first !== "object") return "";
  const name = (first as Record<string, unknown>).name;
  return name != null ? String(name).trim() : "";
}

/**
 * OCR 采购场景默认：**借管理费用 / 贷应付账款**，入账前须在界面核对科目。
 */
function mapOcrInvoiceToSuggested(
  outputPayload: Record<string, unknown>,
): SuggestedVoucherFields {
  const rawTotal = pickInvoiceTotal(outputPayload);
  const total = Math.round(rawTotal * 100) / 100;
  const invoiceNo =
    outputPayload.invoiceNumber != null
      ? String(outputPayload.invoiceNumber).trim()
      : "";
  const itemHint = firstLineItemSummary(outputPayload);
  const summaryParts = ["OCR发票", invoiceNo, itemHint].filter(Boolean);

  return {
    debitAccount: "管理费用",
    creditAccount: "应付账款",
    amount: total.toFixed(2),
    summary: summaryParts.join(" ") || "OCR 发票入账",
  };
}

function mapEntriesPayloadToSuggested(
  outputPayload: Record<string, unknown>,
): SuggestedVoucherFields {
  const entries = outputPayload.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("AI 输出缺少 entries 数组");
  }

  type Line = {
    debit: number;
    credit: number;
    accountSubject: string;
    description?: string;
  };

  let debitLine: Line | undefined;
  let creditLine: Line | undefined;

  for (const raw of entries) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as Record<string, unknown>;
    const debit = Number(e.debit ?? 0);
    const credit = Number(e.credit ?? 0);
    const accountSubject = String(e.accountSubject ?? "").trim();
    const description =
      e.description != null ? String(e.description).trim() : undefined;

    if (debit > 0 && !debitLine) {
      if (!accountSubject) {
        throw new Error("借方分录缺少 accountSubject");
      }
      debitLine = { debit, credit, accountSubject, description };
    }
    if (credit > 0 && !creditLine) {
      if (!accountSubject) {
        throw new Error("贷方分录缺少 accountSubject");
      }
      creditLine = { debit, credit, accountSubject, description };
    }
  }

  if (!debitLine) {
    throw new Error(
      "未找到借方分录（需存在 debit>0 且含 accountSubject 的分录）",
    );
  }
  if (!creditLine) {
    throw new Error(
      "未找到贷方分录（需存在 credit>0 且含 accountSubject 的分录）",
    );
  }

  const debitAmt = debitLine.debit;
  const creditAmt = creditLine.credit;
  if (Math.abs(debitAmt - creditAmt) > 0.01) {
    throw new Error("借贷金额不平衡");
  }
  if (debitLine.accountSubject === creditLine.accountSubject) {
    throw new Error("借方与贷方科目不能相同");
  }

  const amount = debitAmt.toFixed(2);
  const summary =
    [debitLine.description, creditLine.description].filter(Boolean).join("；") ||
    "AI 智能任务生成";

  return {
    debitAccount: debitLine.accountSubject,
    creditAccount: creditLine.accountSubject,
    amount,
    summary,
  };
}

/** 从已完成任务的 outputPayload 解析建议分录：支持 entries[] 或发票 OCR 结构化字段 */
export function mapAiOutputToSuggestedVoucher(
  outputPayload: Record<string, unknown> | null | undefined,
): SuggestedVoucherFields {
  if (!outputPayload || typeof outputPayload !== "object") {
    throw new Error("AI 输出为空");
  }

  const entries = outputPayload.entries;
  if (Array.isArray(entries) && entries.length > 0) {
    return mapEntriesPayloadToSuggested(outputPayload);
  }

  if (isOcrInvoiceShape(outputPayload)) {
    return mapOcrInvoiceToSuggested(outputPayload);
  }

  throw new Error(
    "无法解析为一借一贷：分录类需含 entries（借贷平衡、科目不同）；OCR 类需含购/销方与价税金额字段",
  );
}
