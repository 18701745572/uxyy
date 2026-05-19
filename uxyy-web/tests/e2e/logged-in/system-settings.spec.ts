import { expect, test } from "./fixture";
import { expectPrimaryHeading } from "../helpers/assertions";

/**
 * 系统设置 E2E 测试
 */
test.describe("系统设置", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/auth/login");
  });

  test("企业信息设置页面可访问", async ({ page }) => {
    await page.goto("/dashboard/settings/enterprise");
    await expectPrimaryHeading(page, "企业信息");

    // 验证表单字段存在
    await expect(page.getByLabel("企业名称")).toBeVisible();
    await expect(page.getByLabel("统一社会信用代码")).toBeVisible();
    await expect(page.getByLabel("联系电话")).toBeVisible();
  });

  test("用户管理页面可访问", async ({ page }) => {
    await page.goto("/dashboard/settings/users");
    await expectPrimaryHeading(page, "用户管理");

    // 验证新建用户按钮
    await expect(page.getByRole("button", { name: /新建用户/ })).toBeVisible();
  });

  test("角色权限页面可访问", async ({ page }) => {
    await page.goto("/dashboard/settings/roles");
    await expectPrimaryHeading(page, "角色权限");

    // 验证角色列表
    await expect(page.getByText(/管理员|财务|销售/)).toBeVisible();
  });

  test("审批流程设置页面可访问", async ({ page }) => {
    await page.goto("/dashboard/settings/approval-flows");
    await expectPrimaryHeading(page, "审批流程");

    // 验证流程类型选项卡
    await expect(page.getByRole("tab", { name: /请假/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /报销/ })).toBeVisible();
  });

  test("系统日志页面可访问", async ({ page }) => {
    await page.goto("/dashboard/settings/logs");
    await expectPrimaryHeading(page, "系统日志");

    // 验证日志列表
    await expect(page.getByText(/操作时间|操作用户|操作内容/)).toBeVisible();
  });

  test("数据备份页面可访问", async ({ page }) => {
    await page.goto("/dashboard/settings/backup");
    await expectPrimaryHeading(page, "数据备份");

    // 验证备份按钮
    await expect(page.getByRole("button", { name: /立即备份/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /恢复数据/ })).toBeVisible();
  });
});

/**
 * 个人设置 E2E 测试
 */
test.describe("个人设置", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/auth/login");
  });

  test("个人资料页面可访问", async ({ page }) => {
    await page.goto("/dashboard/profile");
    await expectPrimaryHeading(page, "个人资料");

    // 验证表单字段
    await expect(page.getByLabel("姓名")).toBeVisible();
    await expect(page.getByLabel("手机号")).toBeVisible();
    await expect(page.getByLabel("邮箱")).toBeVisible();
  });

  test("修改密码功能", async ({ page }) => {
    await page.goto("/dashboard/profile/password");
    await expectPrimaryHeading(page, "修改密码");

    // 验证密码字段
    await expect(page.getByLabel("当前密码")).toBeVisible();
    await expect(page.getByLabel("新密码")).toBeVisible();
    await expect(page.getByLabel("确认新密码")).toBeVisible();

    // 验证提交按钮
    await expect(page.getByRole("button", { name: /保存/ })).toBeVisible();
  });

  test("通知设置页面可访问", async ({ page }) => {
    await page.goto("/dashboard/profile/notifications");
    await expectPrimaryHeading(page, "通知设置");

    // 验证通知选项
    await expect(page.getByText(/邮件通知|短信通知|站内消息/)).toBeVisible();
  });
});

/**
 * 主题设置 E2E 测试
 */
test.describe("主题设置", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/auth/login");
  });

  test("切换深色主题", async ({ page }) => {
    await page.goto("/dashboard");

    // 打开主题切换菜单
    const themeButton = page.getByRole("button", { name: /主题/i });
    await expect(themeButton).toBeVisible();
    await themeButton.click();

    // 选择深色主题
    await page.getByRole("menuitem", { name: /深色/i }).click();

    // 验证深色主题已应用
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("切换浅色主题", async ({ page }) => {
    await page.goto("/dashboard");

    // 打开主题切换菜单
    const themeButton = page.getByRole("button", { name: /主题/i });
    await themeButton.click();

    // 选择浅色主题
    await page.getByRole("menuitem", { name: /浅色/i }).click();

    // 验证浅色主题已应用
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });
});
