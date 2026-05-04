/**
 * 浏览器可用的 API 基址（与 Nest 全局前缀 `/api/v1` 拼接）。
 *
 * - 本地：`.env.local` 中 `NEXT_PUBLIC_API_URL=http://127.0.0.1:3000`
 * - 服务端代理场景可改用相对路径或由 next.config rewrites 处理
 */
export function getPublicApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "";
}
