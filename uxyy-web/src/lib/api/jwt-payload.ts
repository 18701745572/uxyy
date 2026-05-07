/**
 * 解码 Access Token 的 JWT payload（不验证签名），用于读取 sub / enterpriseId。
 */
export function readJwtAccessClaims(
  token: string,
): { sub?: string; enterpriseId?: number; role?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const json = atob(padded);
    const payload = JSON.parse(json) as Record<string, unknown>;
    const sub = typeof payload.sub === "string" ? payload.sub : undefined;
    const enterpriseId =
      typeof payload.enterpriseId === "number" ? payload.enterpriseId : undefined;
    const role = typeof payload.role === "string" ? payload.role : undefined;
    return { sub, enterpriseId, role };
  } catch {
    return null;
  }
}
