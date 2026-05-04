import { getPublicApiBaseUrl } from "./public-env";

const TOKEN_KEY = "uxyy_access_token";

export function readStoredAccessToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.sessionStorage.getItem(TOKEN_KEY) ?? undefined;
}

export function persistAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export type CustomerDto = {
  id: number;
  enterpriseId: number;
  name: string;
  phone: string | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerListResponse = {
  items: CustomerDto[];
  total: number;
  page: number;
  pageSize: number;
};

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
