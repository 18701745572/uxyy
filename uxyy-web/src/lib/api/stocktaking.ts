import type {
  CreateStocktakingDto,
  StocktakingListQueryDto,
  StocktakingListResponseDto,
  StocktakingDto,
  UpdateStocktakingItemDto,
} from "@uxyy/shared";
import { apiFetch } from "./client";

export async function fetchStocktakingList(
  query: StocktakingListQueryDto,
): Promise<StocktakingListResponseDto> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.status) params.set("status", query.status);

  const qs = params.toString();
  return apiFetch<StocktakingListResponseDto>(
    `/inventory/stocktaking${qs ? `?${qs}` : ""}`,
  );
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
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function confirmStocktaking(id: number): Promise<StocktakingDto> {
  return apiFetch<StocktakingDto>(`/inventory/stocktaking/${id}/confirm`, {
    method: "POST",
  });
}
