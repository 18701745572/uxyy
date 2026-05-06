import type {
  CustomerListResponse,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerDto,
  CustomerListQuery,
} from "@uxyy/shared";
import { apiFetch } from "./client";

/** 与 `CustomerDto` 同义，供 CRM 模块页面类型引用 */
export type CustomerResponseDto = CustomerDto;

/** 与后端 `PaginationQueryDto` / shared `paginationSchema` 一致 */
const CRM_CUSTOMERS_PAGE_SIZE_MAX = 100;

export async function fetchCustomers(
  params: CustomerListQuery,
): Promise<CustomerListResponse> {
  const page = Math.max(1, params.page);
  const pageSize = Math.min(
    CRM_CUSTOMERS_PAGE_SIZE_MAX,
    Math.max(1, params.pageSize),
  );
  const sp = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  return apiFetch<CustomerListResponse>(`/crm/customers?${sp}`);
}

/** 后端单页 pageSize 上限为 100；下拉等需尽可能多的客户时用多页串联 */
export async function fetchCustomersAllPages(opts?: {
  maxPages?: number;
}): Promise<{ items: CustomerDto[]; total: number }> {
  const maxPages = opts?.maxPages ?? 500;
  const pageSize = CRM_CUSTOMERS_PAGE_SIZE_MAX;
  const items: CustomerDto[] = [];
  let total = 0;
  let page = 1;

  while (page <= maxPages) {
    const res = await fetchCustomers({ page, pageSize });
    total = res.total;
    items.push(...res.items);
    if (items.length >= total || res.items.length === 0) break;
    page += 1;
  }

  return { items, total };
}

export async function createCustomer(
  input: CreateCustomerInput,
): Promise<CustomerDto> {
  return apiFetch<CustomerDto>("/crm/customers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCustomer(
  id: number,
  input: UpdateCustomerInput,
): Promise<CustomerDto> {
  return apiFetch<CustomerDto>(`/crm/customers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteCustomer(id: number): Promise<void> {
  await apiFetch(`/crm/customers/${id}`, { method: "DELETE" });
}
