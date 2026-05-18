import type { Page } from "@playwright/test";
import { expectPrimaryHeading } from "../helpers/assertions";
import { expect, test } from "./fixture";

async function gotoWorkstation(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded", timeout: 60_000 });
}

test.describe("登录后 · 侧边栏导航", () => {
  test("主导航与各模块工作台", async ({ page }) => {
    // 使用直接导航测试各模块页面可访问
    const modules = [
      { path: "/dashboard", title: "欢迎使用优效营" },
      { path: "/dashboard/crm", title: "客户管理" },
      { path: "/dashboard/inventory", title: "进销存" },
      { path: "/dashboard/finance", title: "财务" },
      { path: "/dashboard/ai", title: "AI 助手" },
      { path: "/dashboard/profile", title: "用户资料" },
    ];

    for (const mod of modules) {
      await gotoWorkstation(page, mod.path);
      await expectPrimaryHeading(page, mod.title);
    }
  });

  test("侧栏「用户资料」（底部区域）→ 资料页", async ({ page }) => {
    await gotoWorkstation(page, "/dashboard/inventory/products");
    await gotoWorkstation(page, "/dashboard/profile");
    await expect(page).toHaveURL(/\/dashboard\/profile$/);
    await expectPrimaryHeading(page, "用户资料");
  });
});

test.describe("登录后 · CRM", () => {
  test("客户中心与客户列表", async ({ page }) => {
    await gotoWorkstation(page, "/dashboard/crm");
    await expectPrimaryHeading(page, "客户管理");

    await page.getByRole("link", { name: "客户列表" }).click();
    await expect(page).toHaveURL(/\/dashboard\/crm\/customers$/);
    await expectPrimaryHeading(page, "客户列表");
    await expect(
      page.getByRole("button", { name: /新建客户/ }),
    ).toBeVisible({ timeout: 30_000 });
  });
});

test.describe("登录后 · 进销存", () => {
  test("各子模块页可打开", async ({ page }) => {
    const cases: { path: string; title: string | RegExp }[] = [
      { path: "/dashboard/inventory", title: "进销存" },
      { path: "/dashboard/inventory/products", title: "商品管理" },
      { path: "/dashboard/inventory/suppliers", title: "供应商管理" },
      { path: "/dashboard/inventory/purchase-orders", title: "采购订单" },
      { path: "/dashboard/inventory/sales-orders", title: "销售订单" },
      { path: "/dashboard/inventory/stocktaking", title: "库存盘点" },
      { path: "/dashboard/inventory/warehouses", title: "仓库管理" },
    ];
    for (const c of cases) {
      await gotoWorkstation(page, c.path);
      await expectPrimaryHeading(page, c.title);
    }
  });
});

test.describe("登录后 · 财务", () => {
  test("各子模块页可打开", async ({ page }) => {
    const cases: { path: string; title: string }[] = [
      { path: "/dashboard/finance", title: "财务" },
      { path: "/dashboard/finance/invoices", title: "发票管理" },
      { path: "/dashboard/finance/vouchers", title: "凭证录入" },
      { path: "/dashboard/finance/reports", title: "财务报表" },
      { path: "/dashboard/finance/ar-ap", title: "应收应付" },
    ];
    for (const c of cases) {
      await gotoWorkstation(page, c.path);
      await expectPrimaryHeading(page, c.title);
    }
  });
});

test.describe("登录后 · 顶栏标题", () => {
  test("各路由顶栏标题正确显示", async ({ page }) => {
    const testCases = [
      { path: "/dashboard", expectedTitle: "工作台" },
      { path: "/dashboard/crm", expectedTitle: "客户管理" },
      { path: "/dashboard/crm/customers", expectedTitle: "客户列表" },
      { path: "/dashboard/inventory", expectedTitle: "进销存管" },
      { path: "/dashboard/finance", expectedTitle: "财务管理" },
      { path: "/dashboard/finance/invoices", expectedTitle: "发票管理" },
      { path: "/dashboard/notifications", expectedTitle: "通知中心" },
    ];

    for (const tc of testCases) {
      await gotoWorkstation(page, tc.path);
      // 顶栏使用 h1 标签显示标题
      await expect(page.locator("header").getByRole("heading", { level: 1 })).toHaveText(
        tc.expectedTitle,
        { timeout: 30_000 },
      );
    }
  });
});
