import type {
  CreateProductDto,
  ProductListQueryDto,
  ProductListResponseDto,
  ProductResponseDto,
  UpdateProductDto,
} from "@uxyy/shared";
import { apiFetch } from "./client";

export async function fetchProducts(
  query: ProductListQueryDto,
): Promise<ProductListResponseDto> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.categoryId) params.set("categoryId", String(query.categoryId));
  if (query.keyword) params.set("keyword", query.keyword);

  const qs = params.toString();
  return apiFetch<ProductListResponseDto>(
    `/inventory/products${qs ? `?${qs}` : ""}`,
  );
}

export async function createProduct(
  data: CreateProductDto,
): Promise<ProductResponseDto> {
  return apiFetch<ProductResponseDto>("/inventory/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProduct(
  id: number,
  data: UpdateProductDto,
): Promise<ProductResponseDto> {
  return apiFetch<ProductResponseDto>(`/inventory/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteProduct(id: number): Promise<void> {
  return apiFetch<void>(`/inventory/products/${id}`, {
    method: "DELETE",
  });
}

export async function fetchProduct(id: number): Promise<ProductResponseDto> {
  return apiFetch<ProductResponseDto>(`/inventory/products/${id}`);
}
