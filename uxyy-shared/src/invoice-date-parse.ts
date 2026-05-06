/** 将日历日期规范为 UTC 当日 00:00:00.000，与凭证 entryDate 常用 ISO 串一致 */
function toIsoUtcMidnight(y: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(Date.UTC(y, month - 1, day, 0, 0, 0, 0));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return dt.toISOString();
}

/**
 * 将 OCR/票面「开票日期」常见写法转为 `entryDate` 可用的 ISO 8601 字符串（当日 UTC 午夜）。
 * 支持：`2025-03-26`、`2025/3/26`、`2025.03.26`、`2025年03月26日` 等；无法识别时返回 `null`。
 */
export function invoiceDateStringToEntryDateIso(raw: unknown): string | null {
  if (raw == null) return null;
  const s0 = String(raw).trim();
  if (!s0) return null;

  const isoLike = s0.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/,
  );
  if (isoLike) {
    return toIsoUtcMidnight(
      Number(isoLike[1]),
      Number(isoLike[2]),
      Number(isoLike[3]),
    );
  }

  const slashDot = s0.match(
    /^(\d{4})[./](\d{1,2})[./](\d{1,2})$/,
  );
  if (slashDot) {
    return toIsoUtcMidnight(
      Number(slashDot[1]),
      Number(slashDot[2]),
      Number(slashDot[3]),
    );
  }

  const zh = s0.match(/^(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日?$/);
  if (zh) {
    return toIsoUtcMidnight(Number(zh[1]), Number(zh[2]), Number(zh[3]));
  }

  const t = Date.parse(s0);
  if (!Number.isNaN(t)) {
    const dt = new Date(t);
    return toIsoUtcMidnight(
      dt.getUTCFullYear(),
      dt.getUTCMonth() + 1,
      dt.getUTCDate(),
    );
  }

  return null;
}
