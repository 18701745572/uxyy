import { expect, test } from "./fixture";
import { expectPrimaryHeading } from "../helpers/assertions";

/**
 * AI 功能 E2E 测试
 */
test.describe("AI 功能", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/auth/login");
  });

  test("AI 发票识别页面可访问", async ({ page }) => {
    await page.goto("/dashboard/ai/invoice");
    await expectPrimaryHeading(page, "发票识别");

    // 验证上传区域
    await expect(page.getByText(/上传发票图片/)).toBeVisible();
    await expect(page.getByRole("button", { name: /识别/ })).toBeVisible();
  });

  test("AI 智能记账页面可访问", async ({ page }) => {
    await page.goto("/dashboard/ai/voucher");
    await expectPrimaryHeading(page, "智能记账");

    // 验证输入区域
    await expect(page.getByPlaceholder(/输入业务描述/)).toBeVisible();
    await expect(page.getByRole("button", { name: /生成凭证/ })).toBeVisible();
  });

  test("AI 任务列表页面可访问", async ({ page }) => {
    await page.goto("/dashboard/ai/tasks");
    await expectPrimaryHeading(page, "AI 任务");

    // 验证任务列表
    await expect(page.getByText(/任务类型|状态|创建时间/)).toBeVisible();
  });

  test("发票上传功能", async ({ page }) => {
    await page.goto("/dashboard/ai/invoice");

    // 模拟文件上传
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test-invoice.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake-image-data"),
    });

    // 验证上传成功提示
    await expect(page.getByText(/上传成功/)).toBeVisible();
  });

  test("智能记账生成功能", async ({ page }) => {
    await page.goto("/dashboard/ai/voucher");

    // 输入业务描述
    await page.getByPlaceholder(/输入业务描述/).fill("采购办公用品 1000元");

    // 点击生成按钮
    await page.getByRole("button", { name: /生成凭证/ }).click();

    // 验证加载状态
    await expect(page.getByText(/正在生成/)).toBeVisible();
  });
});

/**
 * AI 功能集成测试
 */
test.describe("AI 功能集成", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/auth/login");
  });

  test("从发票直接生成凭证", async ({ page }) => {
    await page.goto("/dashboard/ai/invoice");

    // 上传发票
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test-invoice.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake-image-data"),
    });

    // 等待识别完成
    await page.waitForTimeout(2000);

    // 验证生成凭证按钮
    await expect(page.getByRole("button", { name: /生成凭证/ })).toBeVisible();
  });

  test("AI 任务状态追踪", async ({ page }) => {
    await page.goto("/dashboard/ai/tasks");

    // 验证任务状态筛选
    await expect(page.getByRole("tab", { name: /进行中/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /已完成/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /失败/ })).toBeVisible();
  });
});
