import { expect, test } from "./fixture";

/**
 * 视觉回归测试
 * 对比关键页面的截图，确保 UI 没有意外变化
 * 
 * 运行方式:
 * 1. 首次运行生成基准截图: npx playwright test --update-snapshots
 * 2. 后续运行对比截图: npx playwright test
 */
test.describe("视觉回归测试 · 关键页面", () => {
  test("工作台首页视觉检查", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    
    // 等待页面完全加载
    await page.waitForTimeout(2000);
    
    // 截图对比
    await expect(page).toHaveScreenshot("dashboard-home.png", {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test("客户列表页面视觉检查", async ({ page }) => {
    await page.goto("/dashboard/crm/customers", { waitUntil: "networkidle" });
    
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot("crm-customers.png", {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test("商品管理页面视觉检查", async ({ page }) => {
    await page.goto("/dashboard/inventory/products", { waitUntil: "networkidle" });
    
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot("inventory-products.png", {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test("发票管理页面视觉检查", async ({ page }) => {
    await page.goto("/dashboard/finance/invoices", { waitUntil: "networkidle" });
    
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot("finance-invoices.png", {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test("考勤管理页面视觉检查", async ({ page }) => {
    await page.goto("/dashboard/oa/attendance", { waitUntil: "networkidle" });
    
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot("oa-attendance.png", {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test("通知中心页面视觉检查", async ({ page }) => {
    await page.goto("/dashboard/notifications", { waitUntil: "networkidle" });
    
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot("notifications.png", {
      fullPage: true,
      threshold: 0.2,
    });
  });
});

/**
 * 响应式布局视觉测试
 */
test.describe("视觉回归测试 · 响应式布局", () => {
  test("工作台首页 - 移动端", async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot("dashboard-home-mobile.png", {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test("工作台首页 - 平板端", async ({ page }) => {
    // 设置平板视口
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot("dashboard-home-tablet.png", {
      fullPage: true,
      threshold: 0.2,
    });
  });
});
