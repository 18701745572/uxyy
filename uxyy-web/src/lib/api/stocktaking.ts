import type {
  CreateStocktakingDto,
  StocktakingListQueryDto,
  StocktakingListResponseDto,
  StocktakingDto,
  UpdateStocktakingItemDto,
} from "@uxyy/shared";
import { apiFetch } from "./client";

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
