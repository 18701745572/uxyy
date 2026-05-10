import { Buffer } from "node:buffer";

/** 与 `readJwtAccessClaims` 兼容的 base64url（不验签，仅 E2E mock） */
function b64UrlJson(obj: Record<string, unknown>): string {
  const b64 = Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * 生成含 `sub` / `enterpriseId` / `role` 的最小 access_token，供 mock 模式下通过 Zustand `syncJwtSession`。
 */
export function encodeE2eMockAccessToken(role: string): string {
  const header = b64UrlJson({ alg: "none", typ: "JWT" });
  const payload = b64UrlJson({
    sub: "1",
    enterpriseId: 1,
    role,
  });
  return `${header}.${payload}.e2e`;
}
