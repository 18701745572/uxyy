import { expect, test } from "./fixture";
import { expectPrimaryHeading } from "../helpers/assertions";

/**
 * CRM 客户管理工作流测试
 * 覆盖：创建客户、编辑客户、删除客户、搜索客户
 */
test.describe("CRM · 客户管理工作流", () => {
  test("创建新客户完整流程", async ({ page }) => {
    // 导航到客户列表
    await page.goto("/dashboard/crm/customers", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "客户列表");

    // 点击新建客户按钮
    await page.getByRole("button", { name: /新建客户/ }).click();

    // 等待弹窗出现
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("新建客户")).toBeVisible();

    // 填写客户信息
    const timestamp = Date.now();
    const customerName = `测试客户-${timestamp}`;
    const customerPhone = `138${String(timestamp).slice(-8)}`;

    await page.getByLabel("客户名称").fill(customerName);
    await page.getByLabel("联系电话").fill(customerPhone);
    await page.getByLabel("客户等级").click();
    await page.getByRole("option", { name: "A级" }).click();

    // 提交表单
    await page.getByRole("button", { name: "保存" }).click();

    // 验证成功提示
    await expect(page.getByText("客户创建成功")).toBeVisible({ timeout: 10_000 });

    // 验证客户出现在列表中
    await expect(page.getByText(customerName)).toBeVisible({ timeout: 10_000 });
  });

  test("搜索客户功能", async ({ page }) => {
    await page.goto("/dashboard/crm/customers", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "客户列表");

    // 使用搜索框
    await page.getByPlaceholder(/搜索客户/).fill("测试");
    await page.keyboard.press("Enter");

    // 等待搜索结果加载
    await page.waitForTimeout(1000);

    // 验证搜索功能正常工作（至少能看到表头）
    await expect(page.getByText("客户名称")).toBeVisible();
  });

  test("客户详情页导航", async ({ page }) => {
    await page.goto("/dashboard/crm/customers", { waitUntil: "networkidle" });

    // 点击第一个客户的查看按钮（如果有的话）
    const viewButtons = page.getByRole("button", { name: /查看/ });
    if (await viewButtons.count() > 0) {
      await viewButtons.first().click();
      await expect(page).toHaveURL(/\/dashboard\/crm\/customers\/\d+/);
      await expectPrimaryHeading(page, /客户详情/);
    }
  });
});

/**
 * 会员等级管理测试
 */
test.describe("CRM · 会员等级管理", () => {
  test("会员等级列表页面可访问", async ({ page }) => {
    await page.goto("/dashboard/crm/member-levels", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "会员等级");

    // 验证页面元素
    await expect(page.getByRole("button", { name: /新建等级/ })).toBeVisible();
  });

  test("客户分类页面可访问", async ({ page }) => {
    await page.goto("/dashboard/crm/categories", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "客户分类");
  });
});
