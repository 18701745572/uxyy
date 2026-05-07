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
      // 刷新失败，清除登录态
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
  _retry = true, // 内部使用，避免无限重试
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

  // 401 时尝试自动刷新（且尚未重试过）
  if (res.status === 401 && _retry) {
    // 若正在刷新，则排队等待结果
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeToRefresh((newToken) => {
          // 用新 token 重试原请求
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
      // 用新 token 重试原请求（不再自动刷新）
      return apiFetch<T>(path, options, false);
    }

    // 刷新失败，通知排队者并抛出未授权
    notifyRefreshSubscribers("");
    throw new UnauthorizedError();
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text || res.statusText);
  }

  return (await res.json()) as T;
}

export { persistAccessToken };
