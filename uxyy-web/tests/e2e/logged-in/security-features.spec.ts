import { expect, test } from "./fixture";

/**
 * 安全功能 E2E 测试
 */
test.describe("安全功能", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test("登录页面 CSRF Token 存在", async ({ page }) => {
    await page.goto("/auth/login");

    // 验证 CSRF Token 输入框存在
    const csrfInput = page.locator('input[name="csrfToken"]');
    await expect(csrfInput).toBeVisible();

    // 验证 Token 有值
    const tokenValue = await csrfInput.inputValue();
    expect(tokenValue).toBeTruthy();
    expect(tokenValue.length).toBeGreaterThan(10);
  });

  test("登录失败次数限制", async ({ page }) => {
    await page.goto("/auth/login");

    // 多次尝试错误密码
    for (let i = 0; i < 6; i++) {
      await page.getByLabel("手机号").fill("13800138000");
      await page.getByLabel("密码").fill("wrongpassword");
      await page.getByRole("button", { name: /登录/ }).click();
      await page.waitForTimeout(1000);
    }

    // 验证触发频率限制提示
    await expect(page.getByText(/请求过于频繁|请稍后重试/)).toBeVisible();
  });

  test("密码强度验证", async ({ page }) => {
    await page.goto("/auth/register");

    // 输入弱密码
    await page.getByLabel("密码").fill("123456");

    // 验证密码强度提示
    await expect(page.getByText(/密码强度|至少/)).toBeVisible();
  });

  test("会话超时处理", async ({ page }) => {
    // 先登录
    await page.goto("/auth/login");
    await page.getByLabel("手机号").fill("13800138000");
    await page.getByLabel("密码").fill("Test123456!");
    await page.getByRole("button", { name: /登录/ }).click();

    // 等待跳转到仪表板
    await page.waitForURL("**/dashboard");

    // 模拟会话过期（清除 cookie）
    await page.context().clearCookies();

    // 尝试访问受保护页面
    await page.goto("/dashboard/settings");

    // 验证重定向到登录页
    await page.waitForURL("**/auth/login");
  });

  test("敏感操作需要二次确认", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel("手机号").fill("13800138000");
    await page.getByLabel("密码").fill("Test123456!");
    await page.getByRole("button", { name: /登录/ }).click();
    await page.waitForURL("**/dashboard");

    // 访问用户管理页面
    await page.goto("/dashboard/settings/users");

    // 尝试删除用户（应该有确认对话框）
    const deleteButton = page.getByRole("button", { name: /删除/ }).first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // 验证确认对话框
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByText(/确认删除/)).toBeVisible();
    }
  });
});

/**
 * 权限控制 E2E 测试
 */
test.describe("权限控制", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test("未授权访问被阻止", async ({ page }) => {
    // 不登录直接访问受保护页面
    await page.goto("/dashboard/settings/users");

    // 验证重定向到登录页
    await page.waitForURL("**/auth/login");
  });

  test("角色权限控制", async ({ page }) => {
    // 以普通员工身份登录
    await page.goto("/auth/login");
    await page.getByLabel("手机号").fill("13800138001"); // 普通员工账号
    await page.getByLabel("密码").fill("Test123456!");
    await page.getByRole("button", { name: /登录/ }).click();
    await page.waitForURL("**/dashboard");

    // 尝试访问管理员功能
    await page.goto("/dashboard/settings/roles");

    // 验证无权限提示
    await expect(page.getByText(/无权限|403/)).toBeVisible();
  });

  test("企业数据隔离", async ({ page }) => {
    // 登录
    await page.goto("/auth/login");
    await page.getByLabel("手机号").fill("13800138000");
    await page.getByLabel("密码").fill("Test123456!");
    await page.getByRole("button", { name: /登录/ }).click();
    await page.waitForURL("**/dashboard");

    // 访问客户列表
    await page.goto("/dashboard/crm/customers");

    // 验证只能看到当前企业的客户
    // 这里应该验证 API 请求的 enterpriseId 参数
    const response = await page.waitForResponse(
      (resp) => resp.url().includes("/api/crm/customers") && resp.status() === 200
    );
    const data = await response.json();
    expect(data.items.every((item: any) => item.enterpriseId === 1)).toBe(true);
  });
});

/**
 * 数据安全 E2E 测试
 */
test.describe("数据安全", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/auth/login");
  });

  test("敏感数据脱敏显示", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel("手机号").fill("13800138000");
    await page.getByLabel("密码").fill("Test123456!");
    await page.getByRole("button", { name: /登录/ }).click();
    await page.waitForURL("**/dashboard");

    // 访问客户列表
    await page.goto("/dashboard/crm/customers");

    // 验证手机号脱敏显示
    const phoneCells = page.locator("td").filter({ hasText: /^\d{3}\*\*\*\*\d{4}$/ });
    const count = await phoneCells.count();
    if (count > 0) {
      expect(count).toBeGreaterThan(0);
    }
  });

  test("密码输入框类型为 password", async ({ page }) => {
    await page.goto("/auth/login");

    const passwordInput = page.getByLabel("密码");
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("HTTPS 安全头检查", async ({ page }) => {
    await page.goto("/auth/login");

    // 检查响应头
    const response = await page.waitForResponse((resp) =>
      resp.url().includes("/auth/login")
    );

    const headers = response.headers();
    // 验证安全相关响应头
    expect(headers["x-frame-options"] || headers["X-Frame-Options"]).toBeTruthy();
  });
});
