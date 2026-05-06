import { getPublicApiBaseUrl } from "./public-env";
import {
  readStoredAccessToken,
  persistAccessToken,
} from "./token-store";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** 统一的 API fetch：自动拼接基址、前缀、Bearer token */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const base = getPublicApiBaseUrl();
  if (!base) {
    throw new Error(
      "缺少 NEXT_PUBLIC_API_URL（见 uxyy-web/.env.example → .env.local）",
    );
  }

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!headers.has("Content-Type") && options.body != null && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  const token = readStoredAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${base}/api/v1${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text || res.statusText);
  }

  return (await res.json()) as T;
}

export { persistAccessToken };
