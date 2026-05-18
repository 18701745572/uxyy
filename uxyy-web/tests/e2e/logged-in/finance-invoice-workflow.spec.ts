import { expect, test } from "./fixture";
import { expectPrimaryHeading } from "../helpers/assertions";

/**
 * 财务 - 发票管理工作流测试
 * 覆盖：发票列表、页面导航
 */
test.describe("财务 · 发票管理工作流", () => {
  test("发票列表页面可访问", async ({ page }) => {
    await page.goto("/dashboard/finance/invoices", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "发票管理");

    // 验证新建按钮
    await expect(page.getByRole("button", { name: /新建发票/ })).toBeVisible();

    // 验证导入导出按钮
    await expect(page.getByRole("button", { name: /导入/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /导出/ })).toBeVisible();
  });

  test("财务报表页面可访问", async ({ page }) => {
    await page.goto("/dashboard/finance/reports", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "财务报表");
  });

  test("应收应付页面可访问", async ({ page }) => {
    await page.goto("/dashboard/finance/ar-ap", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "应收应付");
  });

  test("银行流水页面可访问", async ({ page }) => {
    await page.goto("/dashboard/finance/bank-statements", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "银行流水");
  });
});
