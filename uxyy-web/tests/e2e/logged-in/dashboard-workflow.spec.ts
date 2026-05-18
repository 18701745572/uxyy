import { expect, test } from "./fixture";
import { expectPrimaryHeading } from "../helpers/assertions";

/**
 * 工作台 Dashboard 工作流测试
 * 覆盖：页面访问、基本元素检查
 */
test.describe("工作台 · 页面访问", () => {
  test("工作台首页可访问", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "欢迎使用优效营");
  });

  test("经营概览卡片显示", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    // 验证经营概览区域
    await expect(page.getByText("今日销售额")).toBeVisible();
    await expect(page.getByText("待处理订单")).toBeVisible();
    await expect(page.getByText("库存预警")).toBeVisible();
  });
});

/**
 * 通知中心工作流测试
 */
test.describe("工作台 · 通知中心", () => {
  test("通知中心页面可访问", async ({ page }) => {
    await page.goto("/dashboard/notifications", { waitUntil: "networkidle" });
    // 使用 heading 选择器精确定位顶栏标题
    await expect(page.locator("header").getByRole("heading", { level: 1 })).toHaveText("通知中心");
  });
});

/**
 * 用户资料工作流测试
 */
test.describe("用户 · 资料管理", () => {
  test("用户资料页面可访问", async ({ page }) => {
    await page.goto("/dashboard/profile", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "用户资料");
  });
});
