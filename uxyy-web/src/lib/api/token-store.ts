const TOKEN_KEY = "uxyy_access_token";
const REFRESH_KEY = "uxyy_refresh_token";

export function readStoredAccessToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.sessionStorage.getItem(TOKEN_KEY) ?? undefined;
}

export function readStoredRefreshToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.sessionStorage.getItem(REFRESH_KEY) ?? undefined;
}

export function persistAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function persistRefreshToken(token: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(REFRESH_KEY, token);
}

export function persistTokens(access: string, refresh: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(TOKEN_KEY, access);
  window.sessionStorage.setItem(REFRESH_KEY, refresh);
}

export function clearStoredAccessToken(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(TOKEN_KEY);
}

export function clearStoredRefreshToken(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(REFRESH_KEY);
}

export function clearAllTokens(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_KEY);
}
