import type {
  CreateProductDto,
  ProductListQueryDto,
  ProductListResponseDto,
  ProductResponseDto,
  UpdateProductDto,
} from "@uxyy/shared";
import { apiFetch, apiUploadFile, ApiError, formatApiErrorBody } from "./client";

export type ProductImportResult = {
  created: number;
  skipped: number;
  failures: Array<{ row: number; reason: string }>;
};

/** multipart 导入商品（与导出表头对齐；mode=skip 跳过同企编码重复） */
export async function importProducts(
  file: File,
  mode: "skip" | "force" = "skip",
): Promise<ProductImportResult> {
  const q = new URLSearchParams({ mode });
  const res = await apiUploadFile(`/inventory/products/import?${q.toString()}`, file);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(
      res.status,
      formatApiErrorBody(text, `导入失败（${res.status}）`),
    );
  }
  return res.json() as Promise<ProductImportResult>;
}

export async function fetchProducts(
  query: ProductListQueryDto,
): Promise<ProductListResponseDto> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.categoryId) params.set("categoryId", String(query.categoryId));
  if (query.keyword) params.set("keyword", query.keyword);

  const qs = params.toString();
  const raw = await apiFetch<{
    list?: ProductResponseDto[];
    items?: ProductResponseDto[];
    total: number;
    page: number;
    pageSize: number;
  }>(`/inventory/products${qs ? `?${qs}` : ""}`);

  return {
    list: raw.list ?? raw.items ?? [],
    total: raw.total,
    page: raw.page,
    pageSize: raw.pageSize,
  };
}

/** 分页拉取全部商品（单页最大 100，与后端 PaginationQueryDto 一致） */
export async function fetchAllProducts(): Promise<ProductResponseDto[]> {
  const pageSize = 100;
  const out: ProductResponseDto[] = [];
  let page = 1;
  const maxPages = 100;
  for (; page <= maxPages; page += 1) {
    const res = await fetchProducts({ page, pageSize });
    out.push(...res.list);
    if (out.length >= res.total || res.list.length < pageSize) break;
  }
  return out;
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
