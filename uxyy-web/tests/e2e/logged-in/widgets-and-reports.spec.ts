import type { Page } from "@playwright/test";
import { expect, test } from "./fixture";

async function gotoWorkstation(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded", timeout: 60_000 });
}

test.describe("登录后 · AI 与报表", () => {
  test("AI 页面可访问并显示任务类型", async ({ page }) => {
    await gotoWorkstation(page, "/dashboard/ai");

    // 验证 AI 页面标题
    await expect(page.getByRole("heading", { name: "AI 助手" })).toBeVisible();

    // 验证任务类型选项卡存在 - 使用更精确的选择器
    await expect(page.getByRole("button", { name: /AI 任务/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /客户流失预警/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /商机成单预测/ })).toBeVisible();

    // 验证任务提交区域 - 使用 heading 选择器更精确
    await expect(page.getByRole("heading", { name: "发票 OCR 识别" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "会计分录建议" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "智能分类" })).toBeVisible();
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
