/**
 * @deprecated 使用 src/lib/api/customers.ts 与 @uxyy/shared 类型。
 * 保留此文件以免破坏现有 import，逐步迁移后删除。
 */
export { readStoredAccessToken, persistAccessToken } from "./token-store";
export type { CustomerDto, CustomerListResponse } from "@uxyy/shared";

import type { CustomerListResponse } from "@uxyy/shared";
import { readStoredAccessToken } from "./token-store";
import { getPublicApiBaseUrl } from "./public-env";

/** @deprecated 用 fetchCustomers 替代 */
export async function fetchCustomersList(params: {
  page: number;
  pageSize: number;
  accessToken?: string;
}): Promise<CustomerListResponse> {
  const base = getPublicApiBaseUrl();
  if (!base) {
    throw new Error(
      "缺少 NEXT_PUBLIC_API_URL（见 uxyy-web/.env.example → .env.local）",
    );
  }
  const sp = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });

  const headers: HeadersInit = { Accept: "application/json" };
  const bearer = params.accessToken ?? readStoredAccessToken();
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  const res = await fetch(`${base}/api/v1/crm/customers?${sp}`, { headers });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`CRM API ${res.status}: ${txt || res.statusText}`);
  }

  return (await res.json()) as CustomerListResponse;
}
