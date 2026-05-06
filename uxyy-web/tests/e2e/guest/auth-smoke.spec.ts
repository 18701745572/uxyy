import { expect, test } from "@playwright/test";

test.describe("未登录访问", () => {
  test("登录页展示表单", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle", timeout: 60_000 });
    await expect(
      page.getByRole("heading", { name: "优效营 uxyy" }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "登录" })).toBeVisible();
    await expect(page.getByLabel("手机号")).toBeVisible();
    await expect(page.getByLabel("密码")).toBeVisible();
  });

  test("受保护路由会跳到登录", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForURL("**/login", { timeout: 45_000 });
    await expect(
      page.getByRole("heading", { name: "优效营 uxyy" }),
    ).toBeVisible();
  });
});
