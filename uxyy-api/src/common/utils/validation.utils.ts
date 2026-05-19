/**
 * 验证手机号是否有效（中国大陆）
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 验证邮箱是否有效
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && !email.includes('..');
}

/**
 * 验证企业名称是否有效
 */
export function isValidEnterpriseName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 100;
}

/**
 * 验证密码强度
 * - 至少8位
 * - 包含大小写字母
 * - 包含数字
 * - 包含特殊字符
 */
export function isValidPassword(password: string): boolean {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8) return false;

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecial;
}

/**
 * 清理字符串，移除危险字符
 */
export function sanitizeString(input: string | null | undefined): string {
  if (input == null) return '';
  return input
    .trim()
    .replace(/[<>]/g, '') // 移除 HTML 标签
    .replace(/\x00/g, '') // 移除 null 字符
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // 移除控制字符
}

/**
 * 解析正整数
 */
export function parsePositiveInt(value: unknown, defaultValue = 0): number {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 ? value : defaultValue;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return !isNaN(parsed) && parsed >= 0 && parsed.toString() === value
      ? parsed
      : defaultValue;
  }
  return defaultValue;
}

/**
 * 解析正浮点数
 */
export function parsePositiveFloat(value: unknown, defaultValue = 0): number {
  if (typeof value === 'number') {
    return value >= 0 ? value : defaultValue;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return !isNaN(parsed) && parsed >= 0 ? parsed : defaultValue;
  }
  return defaultValue;
}

/**
 * 截断字符串
 */
export function truncateString(
  input: string,
  maxLength: number,
  suffix = '...',
): string {
  if (!input || input.length <= maxLength) return input || '';
  return input.substring(0, maxLength) + suffix;
}
