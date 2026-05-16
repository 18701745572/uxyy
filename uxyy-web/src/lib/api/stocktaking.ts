import type {
  CreateStocktakingDto,
  StocktakingListQueryDto,
  StocktakingListResponseDto,
  StocktakingDto,
  UpdateStocktakingItemDto,
} from "@uxyy/shared";
import { apiFetch, apiUploadFile, ApiError, formatApiErrorBody } from "./client";

export type StocktakingImportResult = {
  created: number;
  skipped: number;
  failures: Array<{ row: number; reason: string }>;
};

/** multipart 导入盘点单（与导出表头对齐；mode=skip 跳过重复单号） */
export async function importStocktaking(
  file: File,
  mode: "skip" | "force" = "skip",
): Promise<StocktakingImportResult> {
  const q = new URLSearchParams({ mode });
  const res = await apiUploadFile(`/inventory/stocktaking/import?${q.toString()}`, file);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(
      res.status,
      formatApiErrorBody(text, `导入失败（${res.status}）`),
    );
  }
  return res.json() as Promise<StocktakingImportResult>;
}

/** 后端分页返回使用 `items`；与前端/共享约定的 `list` 对齐 */
export async function fetchStocktakingList(
  query: StocktakingListQueryDto,
): Promise<StocktakingListResponseDto> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.status) params.set("status", query.status);

  const qs = params.toString();
  const raw = await apiFetch<
    Omit<StocktakingListResponseDto, "list"> & {
      list?: StocktakingListResponseDto["list"];
      items?: StocktakingListResponseDto["list"];
    }
  >(`/inventory/stocktaking${qs ? `?${qs}` : ""}`);
  const list = raw.list ?? raw.items ?? [];
  return { ...raw, list };
}

export async function createStocktaking(
  data: CreateStocktakingDto,
): Promise<StocktakingDto> {
  return apiFetch<StocktakingDto>("/inventory/stocktaking", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchStocktaking(id: number): Promise<StocktakingDto> {
  return apiFetch<StocktakingDto>(`/inventory/stocktaking/${id}`);
}

export async function updateStocktakingItem(
  stocktakingId: number,
  itemId: number,
  data: UpdateStocktakingItemDto,
): Promise<StocktakingDto> {
  return apiFetch<StocktakingDto>(`/inventory/stocktaking/${stocktakingId}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function confirmStocktaking(id: number): Promise<StocktakingDto> {
  return apiFetch<StocktakingDto>(`/inventory/stocktaking/${id}/confirm`, {
    method: "PUT",
  });
}
