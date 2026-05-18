/**
 * CSRF Token 管理工具
 * 实现双提交 Cookie 模式：
 * 1. 从 Cookie 读取 XSRF-TOKEN
 * 2. 添加到请求头 X-CSRF-Token
 */

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * 从 Cookie 中获取指定名称的值
 */
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return decodeURIComponent(cookieValue);
    }
  }
  return undefined;
}

/**
 * 获取 CSRF Token
 */
export function getCsrfToken(): string | undefined {
  return getCookie(CSRF_COOKIE_NAME);
}

/**
 * 获取 CSRF Header 名称
 */
export function getCsrfHeaderName(): string {
  return CSRF_HEADER_NAME;
}

/**
 * 检查是否需要 CSRF Token（非 GET/HEAD/OPTIONS 请求）
 */
export function needsCsrfToken(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

/**
 * 为请求头添加 CSRF Token
 */
export function addCsrfHeader(headers: Headers, method: string): Headers {
  if (needsCsrfToken(method)) {
    const token = getCsrfToken();
    if (token) {
      headers.set(CSRF_HEADER_NAME, token);
    }
  }
  return headers;
}
