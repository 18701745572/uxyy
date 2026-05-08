import { getPublicApiBaseUrl } from "./public-env";
import {
  readStoredAccessToken,
  readStoredRefreshToken,
  persistAccessToken,
  persistRefreshToken,
  clearAllTokens,
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

/** 将 JSON 错误体中的 `message` 提取为可读文案（兼容 Nest 校验数组 message） */
function nestStyleErrorMessage(text: string, fallback: string): string {
  const raw = (text ?? "").trim();
  if (!raw) return fallback;
  try {
    const j = JSON.parse(raw) as { message?: unknown };
    if (typeof j.message === "string" && j.message.trim()) return j.message;
    if (Array.isArray(j.message) && j.message.length > 0)
      return j.message.map(String).join("; ");
  } catch {
    /* 非 JSON，整段作为说明 */
  }
  return raw || fallback;
}

/** 表示未授权（401）且刷新失败 */
export class UnauthorizedError extends ApiError {
  constructor(message = "未授权，请重新登录") {
    super(401, message);
    this.name = "UnauthorizedError";
  }
}

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeToRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function notifyRefreshSubscribers(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function doRefresh(): Promise<string | null> {
  const refresh = readStoredRefreshToken();
  if (!refresh) return null;

  const base = getPublicApiBaseUrl();
  if (!base) return null;

  try {
    const res = await fetch(`${base}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });

    if (!res.ok) {
      clearAllTokens();
      return null;
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
    };

    persistAccessToken(data.access_token);
    if (data.refresh_token) {
      persistRefreshToken(data.refresh_token);
    }
    return data.access_token;
  } catch {
    clearAllTokens();
    return null;
  }
}

/** 统一 API fetch：自动拼接基址、前缀、Bearer token，401 时自动刷新 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  _retry = true,
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

  if (res.status === 401 && _retry) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeToRefresh(() => {
          apiFetch<T>(path, options, false)
            .then(resolve)
            .catch(reject);
        });
      });
    }

    isRefreshing = true;
    const newToken = await doRefresh();
    isRefreshing = false;

    if (newToken) {
      notifyRefreshSubscribers(newToken);
      return apiFetch<T>(path, options, false);
    }

    notifyRefreshSubscribers("");
    throw new UnauthorizedError();
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    const message = nestStyleErrorMessage(text, res.statusText);
    throw new ApiError(res.status, message || res.statusText);
  }

  return (await res.json()) as T;
}

export { persistAccessToken };