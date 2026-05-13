/**
 * 浏览器可用的 API 基址（与 Nest 全局前缀 `/api/v1` 拼接）。
 *
 * - 本地：`.env.local` 中 `NEXT_PUBLIC_API_URL=http://127.0.0.1:3000`
 * - 使用 Next.js rewrites 代理时，设置为空字符串使用相对路径
 */
export function getPublicApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  // 默认返回空字符串，使用相对路径（配合 next.config.mjs rewrites）
  return "";
}
