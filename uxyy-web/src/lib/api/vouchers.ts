import { apiFetch } from "./client";

/** 与后端 `VoucherResponseDto` / `voucher_entries` 单行结构一致 */
export type LedgerVoucherRow = {
  id: number;
  enterpriseId: number;
  voucherNo: string;
  sourceType: string;
  sourceId: number | null;
  entryDate: string;
  debitAccount: string;
  creditAccount: string;
  amount: string;
  summary: string | null;
  createdBy: number;
  createdAt: string;
};

export type LedgerVoucherListResponse = {
  items: LedgerVoucherRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type LedgerVoucherListQuery = {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  /** 后端已支持：manual / ai_task / invoice / sales_order / purchase_order 等 */
  sourceType?: string;
};

/** 列表查询（勿传 `status`：库表无草稿/过账状态，后端会 400） */
export async function fetchVouchers(
  query: LedgerVoucherListQuery,
): Promise<LedgerVoucherListResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.startDate) params.set("startDate", query.startDate);
  if (query.endDate) params.set("endDate", query.endDate);
  if (query.sourceType) params.set("sourceType", query.sourceType);

  const qs = params.toString();
  return apiFetch<LedgerVoucherListResponse>(
    `/finance/vouchers${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchVoucher(id: number): Promise<LedgerVoucherRow> {
  return apiFetch<LedgerVoucherRow>(`/finance/vouchers/${id}`);
}
