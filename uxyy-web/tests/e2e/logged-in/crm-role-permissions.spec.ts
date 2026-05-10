import { expect, test as base } from "@playwright/test";
import { expectPrimaryHeading } from "../helpers/assertions";
import { encodeE2eMockAccessToken } from "../helpers/mock-access-jwt";
import { installApiMocks } from "../helpers/install-api-mocks";

const TOKEN_KEY = "uxyy_access_token";

/**
 * 使用与财务角色一致的 `/auth/permissions` mock，验证 CRM 写操作在 UI 层被收敛。
 * Live API 路径下需独立 seed 账号，此处跳过。
 */
const financeTest = base.extend<{ _financeAuth: undefined }>({
  _financeAuth: [
    async ({ page }, use, testInfo) => {
      if (process.env.E2E_LIVE_API === "1") {
        testInfo.skip(
          true,
          "财务只读场景当前仅覆盖 mock API；Live 需专用 finance 账号后再启用。",
        );
      }
      await installApiMocks(page, "finance");
      await page.addInitScript(
        (args: { storageKey: string; accessToken: string }) => {
          sessionStorage.setItem(args.storageKey, args.accessToken);
        },
        {
          storageKey: TOKEN_KEY,
          accessToken: encodeE2eMockAccessToken("finance"),
        },
      );
      await use(undefined);
    },
    { scope: "test", auto: true },
  ],
});

financeTest.describe("登录后 · CRM 权限（财务·mock）", () => {
  financeTest("客户列表只读：无新建入口", async ({ page }) => {
    await page.goto("/dashboard/crm/customers", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectPrimaryHeading(page, "客户列表");
    await expect(page.getByText("无 crm:write，仅可浏览列表")).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole("button", { name: "+ 新建客户" }),
    ).toHaveCount(0);
  });
});
