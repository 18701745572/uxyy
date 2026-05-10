/**
 * 与 Nest `CreateInvoiceDto` 中 `@Matches(/^\d+(\.\d{1,2})?$/)` 对齐；
 * OCR / 手工常输入 `6%`、带千分位逗号等，需先规范化再提交。
 */
const DECIMAL_RE = /^\d+(\.\d{1,2})?$/;

function parseToNormalizedDecimalString(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  if (/免|不征税|免税|零税率/i.test(trimmed)) return "0";

  const s = trimmed.replace(/%/g, "").replace(/,/g, "").replace(/\s/g, "");
  if (s === "") return undefined;

  const n = parseFloat(s);
  if (!Number.isFinite(n) || n < 0) return undefined;

  const rounded = Math.round(n * 100) / 100;
  const out = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2);
  return DECIMAL_RE.test(out) ? out : rounded.toFixed(2);
}

/** 可选金额/税率：空则 undefined，不随 DTO 发送 */
export function normalizeOptionalInvoiceDecimalField(
  raw: string | undefined,
): string | undefined {
  if (raw == null) return undefined;
  return parseToNormalizedDecimalString(raw);
}

/** 必填金额字段 */
export function normalizeRequiredInvoiceDecimalField(raw: string): string {
  const v = parseToNormalizedDecimalString(raw);
  if (v !== undefined) return v;
  const s = raw.trim().replace(/,/g, "").replace(/\s/g, "");
  const n = parseFloat(s);
  if (Number.isFinite(n) && n >= 0) {
    const rounded = Math.round(n * 100) / 100;
    return Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toFixed(2);
  }
  return "0";
}
