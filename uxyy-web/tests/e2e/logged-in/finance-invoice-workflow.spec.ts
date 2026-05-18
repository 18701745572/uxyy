import { expect, test } from "./fixture";
import { expectPrimaryHeading } from "../helpers/assertions";

/**
 * 财务 - 发票管理工作流测试
 * 覆盖：发票列表、录入发票、导入导出
 */
test.describe("财务 · 发票管理工作流", () => {
  test("发票列表页面可访问", async ({ page }) => {
    await page.goto("/dashboard/finance/invoices", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "发票管理");

    // 验证新建按钮
    await expect(page.getByRole("button", { name: /录入发票/ })).toBeVisible();

    // 验证导入导出按钮
    await expect(page.getByRole("button", { name: /导入/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /导出/ })).toBeVisible();
  });

  test("录入发票弹窗可打开", async ({ page }) => {
    await page.goto("/dashboard/finance/invoices", { waitUntil: "networkidle" });

    // 点击录入发票按钮
    await page.getByRole("button", { name: /录入发票/ }).click();

    // 验证弹窗出现
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("录入发票")).toBeVisible();
  });

  test("发票筛选功能", async ({ page }) => {
    await page.goto("/dashboard/finance/invoices", { waitUntil: "networkidle" });

    // 验证筛选控件存在
    await expect(page.getByText("发票类型")).toBeVisible();
    await expect(page.getByText("日期范围")).toBeVisible();
  });
});

/**
 * 财务凭证工作流测试
 */
test.describe("财务 · 凭证管理工作流", () => {
  test("凭证录入页面可访问", async ({ page }) => {
    await page.goto("/dashboard/finance/vouchers", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "凭证录入");

    // 验证新建凭证按钮
    await expect(page.getByRole("button", { name: /新建凭证/ })).toBeVisible();
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
