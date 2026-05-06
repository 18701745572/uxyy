import type { Page } from "@playwright/test";
import { expect, test } from "./fixture";

async function gotoWorkstation(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded", timeout: 60_000 });
}

test.describe("登录后 · AI 与报表", () => {
  test("AI · 队列状态自 mock 加载", async ({ page }) => {
    await gotoWorkstation(page, "/dashboard/ai");
    await expect(page.getByText("mock-ai-queue")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("等待:").first()).toBeVisible();
  });

  test("财务报表 · 切换到应收应付标签", async ({ page }) => {
    await gotoWorkstation(page, "/dashboard/finance/reports");
    await expect(page.getByRole("button", { name: "经营仪表盘" })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("button", { name: "应收应付" }).click();
    await expect(page.getByText("应收账款合计")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("应付账款合计")).toBeVisible();
  });
});
