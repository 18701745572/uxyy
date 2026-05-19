import { expect, test } from "./fixture";
import { expectPrimaryHeading } from "../helpers/assertions";

/**
 * 数据导入导出功能 E2E 测试
 */
test.describe("数据导入导出", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/auth/login");
  });

  test("商品导入功能测试", async ({ page }) => {
    await page.goto("/dashboard/inventory/products");

    // 验证导入按钮存在
    const importButton = page.getByRole("button", { name: /导入/ });
    await expect(importButton).toBeVisible();

    // 点击导入按钮
    await importButton.click();

    // 验证导入对话框打开
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("导入商品")).toBeVisible();

    // 验证下载模板按钮存在
    await expect(page.getByRole("button", { name: /下载模板/ })).toBeVisible();
  });

  test("商品导出功能测试", async ({ page }) => {
    await page.goto("/dashboard/inventory/products");

    // 验证导出按钮存在
    const exportButton = page.getByRole("button", { name: /导出/ });
    await expect(exportButton).toBeVisible();

    // 点击导出按钮
    await exportButton.click();

    // 验证导出选项菜单出现
    await expect(page.getByRole("menuitem", { name: /Excel/ })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /CSV/ })).toBeVisible();
  });

  test("客户导入功能测试", async ({ page }) => {
    await page.goto("/dashboard/crm/customers");

    // 验证导入按钮存在
    const importButton = page.getByRole("button", { name: /导入/ });
    await expect(importButton).toBeVisible();

    // 点击导入按钮
    await importButton.click();

    // 验证导入对话框
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("销售订单导出功能测试", async ({ page }) => {
    await page.goto("/dashboard/inventory/sales-orders");

    // 验证导出功能
    const exportButton = page.getByRole("button", { name: /导出/ });
    await expect(exportButton).toBeVisible();

    await exportButton.click();
    await expect(page.getByRole("menuitem", { name: /PDF/ })).toBeVisible();
  });

  test("采购订单导出功能测试", async ({ page }) => {
    await page.goto("/dashboard/inventory/purchase-orders");

    // 验证导出功能
    const exportButton = page.getByRole("button", { name: /导出/ });
    await expect(exportButton).toBeVisible();
  });

  test("供应商导入功能测试", async ({ page }) => {
    await page.goto("/dashboard/inventory/suppliers");

    // 验证导入功能
    const importButton = page.getByRole("button", { name: /导入/ });
    await expect(importButton).toBeVisible();
  });

  test("财务凭证导出功能测试", async ({ page }) => {
    await page.goto("/dashboard/finance/vouchers");

    // 验证导出功能
    const exportButton = page.getByRole("button", { name: /导出/ });
    await expect(exportButton).toBeVisible();
  });
});

/**
 * 数据导入验证测试
 */
test.describe("数据导入验证", () => {
  test("导入文件格式验证", async ({ page }) => {
    await page.goto("/dashboard/inventory/products");

    // 打开导入对话框
    await page.getByRole("button", { name: /导入/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // 验证支持的文件格式提示
    await expect(page.getByText(/支持 xlsx, csv 格式/)).toBeVisible();
  });

  test("导入文件大小验证", async ({ page }) => {
    await page.goto("/dashboard/inventory/products");

    // 打开导入对话框
    await page.getByRole("button", { name: /导入/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // 验证文件大小限制提示
    await expect(page.getByText(/文件大小不超过/)).toBeVisible();
  });
});
