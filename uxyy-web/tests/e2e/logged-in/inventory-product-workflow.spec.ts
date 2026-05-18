import { expect, test } from "./fixture";
import { expectPrimaryHeading } from "../helpers/assertions";

/**
 * 进销存 - 商品管理工作流测试
 * 覆盖：商品列表、搜索、导入导出功能
 */
test.describe("进销存 · 商品管理工作流", () => {
  test("商品列表页面可访问并显示数据", async ({ page }) => {
    await page.goto("/dashboard/inventory/products", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "商品管理");

    // 验证新建按钮存在
    await expect(page.getByRole("button", { name: /新建商品/ })).toBeVisible();

    // 验证搜索框存在 - 使用实际 placeholder
    await expect(page.getByPlaceholder("搜索商品编码/名称...")).toBeVisible();
  });

  test("商品搜索功能", async ({ page }) => {
    await page.goto("/dashboard/inventory/products", { waitUntil: "networkidle" });

    // 输入搜索关键词 - 使用实际 placeholder
    const searchInput = page.getByPlaceholder("搜索商品编码/名称...");
    await searchInput.fill("测试");
    
    // 点击搜索按钮或按回车
    await page.keyboard.press("Enter");

    // 等待搜索完成
    await page.waitForTimeout(1000);

    // 验证页面正常加载
    await expect(page.getByText("商品管理")).toBeVisible();
  });

  test("导入导出按钮存在", async ({ page }) => {
    await page.goto("/dashboard/inventory/products", { waitUntil: "networkidle" });

    // 验证导入按钮
    await expect(page.getByRole("button", { name: /导入/ })).toBeVisible();

    // 验证导出按钮
    await expect(page.getByRole("button", { name: /导出/ })).toBeVisible();
  });

  test("新建商品表单可打开", async ({ page }) => {
    await page.goto("/dashboard/inventory/products", { waitUntil: "networkidle" });

    // 点击新建按钮
    await page.getByRole("button", { name: /新建商品/ }).click();

    // 验证表单页面出现（不是弹窗，是页面切换）
    await expect(page.getByText("新建商品")).toBeVisible();

    // 验证表单字段 - 使用更通用的选择器
    await expect(page.locator("form")).toBeVisible();
  });
});

/**
 * 采购订单工作流测试
 */
test.describe("进销存 · 采购订单工作流", () => {
  test("采购订单列表页面可访问", async ({ page }) => {
    await page.goto("/dashboard/inventory/purchase-orders", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "采购订单");

    // 验证新建按钮
    await expect(page.getByRole("button", { name: /新建/ })).toBeVisible();
  });

  test("供应商管理页面可访问", async ({ page }) => {
    await page.goto("/dashboard/inventory/suppliers", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "供应商管理");
  });
});

/**
 * 销售订单工作流测试
 */
test.describe("进销存 · 销售订单工作流", () => {
  test("销售订单列表页面可访问", async ({ page }) => {
    await page.goto("/dashboard/inventory/sales-orders", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "销售订单");

    // 验证新建按钮
    await expect(page.getByRole("button", { name: /新建/ })).toBeVisible();
  });
});

/**
 * 库存盘点工作流测试
 */
test.describe("进销存 · 库存盘点工作流", () => {
  test("库存盘点页面可访问", async ({ page }) => {
    await page.goto("/dashboard/inventory/stocktaking", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "库存盘点");
  });

  test("仓库管理页面可访问", async ({ page }) => {
    await page.goto("/dashboard/inventory/warehouses", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "仓库管理");
  });
});
