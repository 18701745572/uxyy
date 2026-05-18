import { expect, test } from "./fixture";
import { expectPrimaryHeading } from "../helpers/assertions";

/**
 * OA - 考勤管理工作流测试
 * 覆盖：页面访问、基本元素检查
 */
test.describe("OA · 考勤管理工作流", () => {
  test("考勤管理页面可访问", async ({ page }) => {
    await page.goto("/dashboard/oa/attendance", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "考勤管理");
  });
});

/**
 * OA - 员工档案工作流测试
 */
test.describe("OA · 员工档案工作流", () => {
  test("员工档案页面可访问", async ({ page }) => {
    await page.goto("/dashboard/oa/employee-profiles", { waitUntil: "networkidle" });
    // 页面标题实际是"员工通讯录"
    await expectPrimaryHeading(page, "员工通讯录");
  });
});
