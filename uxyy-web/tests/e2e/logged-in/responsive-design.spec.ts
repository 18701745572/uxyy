import { expect, test } from "./fixture";

/**
 * 响应式设计 E2E 测试
 */
test.describe("响应式设计", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/auth/login");
  });

  test("桌面端布局", async ({ page }) => {
    // 设置桌面端视口
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/dashboard");

    // 验证侧边栏可见
    await expect(page.locator("aside").or(page.locator("[data-testid='sidebar']"))).toBeVisible();

    // 验证顶部导航栏可见
    await expect(page.locator("header").or(page.locator("nav"))).toBeVisible();
  });

  test("平板端布局", async ({ page }) => {
    // 设置平板端视口
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/dashboard");

    // 验证侧边栏可能折叠或隐藏
    const sidebar = page.locator("aside").or(page.locator("[data-testid='sidebar']"));
    // 侧边栏可能折叠，但应该存在
    await expect(sidebar).toBeAttached();
  });

  test("移动端布局", async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    // 验证汉堡菜单按钮存在
    const menuButton = page.getByRole("button", { name: /菜单/i }).or(
      page.locator("[data-testid='mobile-menu-button']")
    );
    await expect(menuButton).toBeVisible();

    // 点击菜单按钮展开侧边栏
    await menuButton.click();

    // 验证侧边栏展开
    await expect(page.locator("aside").or(page.locator("[data-testid='sidebar']"))).toBeVisible();
  });

  test("表格响应式", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard/crm/customers");

    // 验证表格存在
    const table = page.locator("table").or(page.locator("[data-testid='data-table']"));
    await expect(table).toBeVisible();

    // 或者验证卡片视图存在（移动端可能使用卡片替代表格）
    const cardView = page.locator("[data-testid='card-view']");
    if (await cardView.isVisible().catch(() => false)) {
      await expect(cardView).toBeVisible();
    }
  });

  test("表单响应式", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard/crm/customers/new");

    // 验证表单元素在移动端可见且可点击
    const inputs = page.locator("input, select, textarea");
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThan(0);

    // 验证提交按钮可见
    await expect(page.getByRole("button", { name: /保存|提交/ })).toBeVisible();
  });

  test("模态框响应式", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard/crm/customers");

    // 点击新建按钮打开模态框
    await page.getByRole("button", { name: /新建/ }).click();

    // 验证模态框在移动端正确显示
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // 验证模态框宽度适应屏幕
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox?.width).toBeLessThanOrEqual(375);
  });

  test("导航菜单响应式", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    // 打开移动端菜单
    const menuButton = page.getByRole("button", { name: /菜单/i }).or(
      page.locator("[data-testid='mobile-menu-button']")
    );
    await menuButton.click();

    // 验证菜单项可点击
    const menuItems = page.locator("nav a, [role='menuitem']");
    const itemCount = await menuItems.count();
    expect(itemCount).toBeGreaterThan(0);

    // 点击第一个菜单项
    if (itemCount > 0) {
      await menuItems.first().click();
      // 验证菜单关闭
      await expect(page.locator("aside").or(page.locator("[data-testid='sidebar']"))).not.toBeVisible();
    }
  });

  test("字体大小响应式", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    // 获取标题字体大小
    const heading = page.locator("h1").first();
    const fontSize = await heading.evaluate((el) =>
      window.getComputedStyle(el).fontSize
    );

    // 验证字体大小合理（移动端通常较小）
    const sizeInPx = parseInt(fontSize);
    expect(sizeInPx).toBeGreaterThanOrEqual(16);
    expect(sizeInPx).toBeLessThanOrEqual(32);
  });
});

/**
 * 断点测试
 */
test.describe("断点测试", () => {
  const breakpoints = [
    { name: "Mobile S", width: 320, height: 568 },
    { name: "Mobile M", width: 375, height: 667 },
    { name: "Mobile L", width: 425, height: 812 },
    { name: "Tablet", width: 768, height: 1024 },
    { name: "Laptop", width: 1024, height: 768 },
    { name: "Laptop L", width: 1440, height: 900 },
    { name: "Desktop", width: 1920, height: 1080 },
  ];

  for (const breakpoint of breakpoints) {
    test(`页面在 ${breakpoint.name} (${breakpoint.width}x${breakpoint.height}) 正常显示`, async ({ page }) => {
      await page.setViewportSize({
        width: breakpoint.width,
        height: breakpoint.height,
      });
      await page.goto("/dashboard");

      // 验证页面没有水平滚动条
      const hasHorizontalScrollbar = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScrollbar).toBe(false);

      // 验证主要内容可见
      const mainContent = page.locator("main").or(page.locator("[data-testid='main-content']"));
      await expect(mainContent).toBeVisible();
    });
  }
});
