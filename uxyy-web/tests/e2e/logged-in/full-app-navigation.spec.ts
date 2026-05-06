import type { Page } from "@playwright/test";
import { expectPrimaryHeading } from "../helpers/assertions";
import { expect, test } from "./fixture";

async function gotoWorkstation(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded", timeout: 60_000 });
}

test.describe("登录后 · 侧边栏导航", () => {
  test("主导航与各模块工作台", async ({ page }) => {
    await gotoWorkstation(page, "/dashboard");
    await expectPrimaryHeading(page, "欢迎使用优效营");

    await page.getByRole("navigation").getByRole("link", { name: /客户管理/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/crm$/);
    await expectPrimaryHeading(page, "客户管理");

    await page.getByRole("navigation").getByRole("link", { name: /进销存/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/inventory$/);
    await expectPrimaryHeading(page, "进销存");

    await page.getByRole("navigation").getByRole("link", { name: /财务/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/finance$/);
    await expectPrimaryHeading(page, "财务");

    await page.getByRole("navigation").getByRole("link", { name: /AI/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/ai$/);
    await expectPrimaryHeading(page, "AI 助手");

    await page.getByRole("navigation").getByRole("link", { name: /首页/ }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expectPrimaryHeading(page, "欢迎使用优效营");

    await page.locator("aside").getByRole("link", { name: /^用户资料$/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/profile$/);
    await expectPrimaryHeading(page, "用户资料");
  });

  test("侧栏「用户资料」（底部区域）→ 资料页", async ({ page }) => {
    await gotoWorkstation(page, "/dashboard/inventory/products");
    await page.locator("aside").getByRole("link", { name: /^用户资料$/ }).click();
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
      page.getByRole("button", { name: "+ 新建客户" }),
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
  test("部分路由与 Header 标题一致", async ({ page }) => {
    await gotoWorkstation(page, "/dashboard");
    await expect(page.locator("header").getByRole("heading", { level: 2 })).toHaveText(
      "首页",
      { timeout: 30_000 },
    );

    await gotoWorkstation(page, "/dashboard/crm/customers");
    await expect(page.locator("header").getByRole("heading", { level: 2 })).toHaveText(
      "客户管理",
      { timeout: 30_000 },
    );
  });
});
