import { expect, test as base } from "@playwright/test";
import { getApiOrigin, isApiHealthy } from "../helpers/api";
import { encodeE2eMockAccessToken } from "../helpers/mock-access-jwt";
import { installApiMocks } from "../helpers/install-api-mocks";

const TOKEN_KEY = "uxyy_access_token";

/** 可解码 JWT（`role: boss`）；非 LIVE 时与 `installApiMocks` 的 profile/permissions 一致 */
export const MOCK_ACCESS_TOKEN = encodeE2eMockAccessToken("boss");

const LIVE = process.env.E2E_LIVE_API === "1";

export const test = base.extend<{ _e2eAuth: undefined }, { liveAccessToken: string }>({
  liveAccessToken: [
    async ({ playwright }, use) => {
      if (!LIVE) {
        await use("");
        return;
      }
      const ctx = await playwright.request.newContext({
        baseURL: getApiOrigin(),
      });
      try {
        if (!(await isApiHealthy())) {
          await use("");
          return;
        }
        const phone = process.env.E2E_PHONE ?? "13800138000";
        const password = process.env.E2E_PASSWORD ?? "Dev12345!";
        const res = await ctx.post("/api/v1/auth/login", {
          data: { phone, password },
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok()) {
          await use("");
          return;
        }
        const body = (await res.json()) as { access_token?: string };
        await use(body.access_token ?? "");
      } finally {
        await ctx.dispose();
      }
    },
    { scope: "worker" },
  ],

  /** 写入 sessionStorage token；非 LIVE 时注册 API mock */
  _e2eAuth: [
    async ({ page, liveAccessToken }, use, testInfo) => {
      if (LIVE && !liveAccessToken) {
        testInfo.skip(
          true,
          `E2E_LIVE_API=1 时需要可用的 Nest（${getApiOrigin()}）且能登录获取 access_token（默认 seed：13800138000 / Dev12345!）。`,
        );
      }

      const token = LIVE ? liveAccessToken : MOCK_ACCESS_TOKEN;
      if (!LIVE) {
        await installApiMocks(page);
      }
      await page.addInitScript(
        ({
          storageKey,
          accessToken,
        }: {
          storageKey: string;
          accessToken: string;
        }) => {
          sessionStorage.setItem(storageKey, accessToken);
        },
        { storageKey: TOKEN_KEY, accessToken: token },
      );

      await use(undefined);
    },
    { scope: "test", auto: true },
  ],
});

export { expect };
