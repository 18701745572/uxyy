import { expect, test } from "./fixture";
import { expectPrimaryHeading } from "../helpers/assertions";

/**
 * 工作台 Dashboard 工作流测试
 * 覆盖：经营概览、快捷操作、待办事项
 */
test.describe("工作台 · 经营概览", () => {
  test("工作台首页可访问", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "欢迎使用优效营");
  });

  test("经营概览卡片显示", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    // 验证经营概览区域
    await expect(page.getByText("经营概览")).toBeVisible();

    // 验证关键指标存在
    await expect(page.getByText(/今日销售额|待处理订单|库存预警/)).toBeVisible();
  });

  test("快捷操作按钮存在", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    // 验证快捷操作区域
    await expect(page.getByText("快捷操作")).toBeVisible();

    // 验证快捷按钮（根据权限可能显示不同）
    const quickActions = [
      page.getByRole("button", { name: /新建客户/ }),
      page.getByRole("button", { name: /新建订单/ }),
      page.getByRole("button", { name: /录入发票/ }),
    ];

    // 至少有一个快捷操作按钮可见
    let hasVisibleAction = false;
    for (const action of quickActions) {
      if (await action.isVisible().catch(() => false)) {
        hasVisibleAction = true;
        break;
      }
    }
    expect(hasVisibleAction).toBeTruthy();
  });

  test("待办事项区域显示", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    // 验证待办事项区域
    await expect(page.getByText("待办事项")).toBeVisible();
  });
});

/**
 * 通知中心工作流测试
 */
test.describe("工作台 · 通知中心", () => {
  test("通知中心页面可访问", async ({ page }) => {
    await page.goto("/dashboard/notifications", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "通知中心");

    // 验证筛选控件
    await expect(page.getByText("全部")).toBeVisible();
    await expect(page.getByText("未读")).toBeVisible();
    await expect(page.getByText("已读")).toBeVisible();
  });

  test("通知筛选功能", async ({ page }) => {
    await page.goto("/dashboard/notifications", { waitUntil: "networkidle" });

    // 点击未读筛选
    await page.getByRole("tab", { name: /未读/ }).click();
    await page.waitForTimeout(500);

    // 点击已读筛选
    await page.getByRole("tab", { name: /已读/ }).click();
    await page.waitForTimeout(500);
  });

  test("标记全部已读按钮存在", async ({ page }) => {
    await page.goto("/dashboard/notifications", { waitUntil: "networkidle" });

    // 验证标记全部已读按钮
    await expect(page.getByRole("button", { name: /全部标为已读/ })).toBeVisible();
  });
});

/**
 * 用户资料工作流测试
 */
test.describe("用户 · 资料管理", () => {
  test("用户资料页面可访问", async ({ page }) => {
    await page.goto("/dashboard/profile", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "用户资料");

    // 验证基本信息区域
    await expect(page.getByText("基本信息")).toBeVisible();
  });

  test("企业切换功能", async ({ page }) => {
    await page.goto("/dashboard/profile", { waitUntil: "networkidle" });

    // 验证企业信息区域
    await expect(page.getByText(/当前企业|企业信息/)).toBeVisible();
  });
});
