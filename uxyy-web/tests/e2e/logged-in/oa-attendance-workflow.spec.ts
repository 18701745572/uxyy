import { expect, test } from "./fixture";
import { expectPrimaryHeading } from "../helpers/assertions";

/**
 * OA - 考勤管理工作流测试
 * 覆盖：打卡功能、考勤统计、补卡申请
 */
test.describe("OA · 考勤管理工作流", () => {
  test("考勤管理页面可访问", async ({ page }) => {
    await page.goto("/dashboard/oa/attendance", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "考勤管理");

    // 验证 Tab 存在
    await expect(page.getByRole("tab", { name: /我的考勤/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /企业概览/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /补卡申请/ })).toBeVisible();
  });

  test("打卡按钮存在并可点击", async ({ page }) => {
    await page.goto("/dashboard/oa/attendance", { waitUntil: "networkidle" });

    // 查找上班或下班打卡按钮
    const checkInButton = page.getByRole("button", { name: /上班打卡|下班打卡/ });

    // 如果存在打卡按钮，验证它是可见的
    if (await checkInButton.isVisible().catch(() => false)) {
      await expect(checkInButton).toBeEnabled();
    } else {
      // 如果已经打过卡，验证显示已完成状态
      await expect(page.getByText(/今日已完成打卡|等待下班打卡/)).toBeVisible();
    }
  });

  test("本月统计显示正常", async ({ page }) => {
    await page.goto("/dashboard/oa/attendance", { waitUntil: "networkidle" });

    // 验证统计卡片存在
    await expect(page.getByText("本月统计")).toBeVisible();
    await expect(page.getByText("正常")).toBeVisible();
    await expect(page.getByText("迟到")).toBeVisible();
    await expect(page.getByText("早退")).toBeVisible();
    await expect(page.getByText("缺勤")).toBeVisible();
    await expect(page.getByText("请假")).toBeVisible();
  });

  test("考勤记录列表显示", async ({ page }) => {
    await page.goto("/dashboard/oa/attendance", { waitUntil: "networkidle" });

    // 验证考勤记录区域存在
    await expect(page.getByText("考勤记录")).toBeVisible();
  });

  test("补卡申请 Tab 可切换", async ({ page }) => {
    await page.goto("/dashboard/oa/attendance", { waitUntil: "networkidle" });

    // 点击补卡申请 Tab
    await page.getByRole("tab", { name: /补卡申请/ }).click();

    // 验证补卡申请表单元素
    await expect(page.getByText("申请补卡")).toBeVisible();
    await expect(page.getByText("补卡日期")).toBeVisible();
    await expect(page.getByText("补卡类型")).toBeVisible();
    await expect(page.getByRole("button", { name: /提交补卡申请/ })).toBeVisible();
  });

  test("企业概览 Tab 可切换（管理员）", async ({ page }) => {
    await page.goto("/dashboard/oa/attendance", { waitUntil: "networkidle" });

    // 点击企业概览 Tab
    await page.getByRole("tab", { name: /企业概览/ }).click();

    // 验证企业概览统计存在
    await expect(page.getByText("员工总数")).toBeVisible();
    await expect(page.getByText("已打卡")).toBeVisible();
    await expect(page.getByText("迟到")).toBeVisible();
    await expect(page.getByText("缺勤")).toBeVisible();
  });
});

/**
 * OA - 员工档案工作流测试
 */
test.describe("OA · 员工档案工作流", () => {
  test("员工档案页面可访问", async ({ page }) => {
    await page.goto("/dashboard/oa/employee-profiles", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "员工档案");

    // 验证新建按钮
    await expect(page.getByRole("button", { name: /新建员工/ })).toBeVisible();
  });
});
