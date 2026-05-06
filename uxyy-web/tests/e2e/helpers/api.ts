const DEFAULT_ORIGIN = "http://localhost:3000";

export function getApiOrigin(): string {
  const raw =
    process.env.E2E_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    DEFAULT_ORIGIN;
  return raw.replace(/\/$/, "");
}

export async function isApiHealthy(timeoutMs = 10_000): Promise<boolean> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${getApiOrigin()}/api/v1/health`, {
      signal: ctl.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}
