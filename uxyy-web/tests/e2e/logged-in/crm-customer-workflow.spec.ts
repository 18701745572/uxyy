import { expect, test } from "./fixture";
import { expectPrimaryHeading } from "../helpers/assertions";

/**
 * CRM 客户管理工作流测试
 * 覆盖：客户列表、页面导航
 */
test.describe("CRM · 客户管理工作流", () => {
  test("客户列表页面可访问", async ({ page }) => {
    await page.goto("/dashboard/crm/customers", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "客户列表");

    // 验证新建按钮存在
    await expect(page.getByRole("button", { name: /新建客户/ })).toBeVisible();

    // 验证搜索框存在
    await expect(page.getByPlaceholder("搜索客户名称、联系人、电话...")).toBeVisible();
  });

  test("会员等级页面可访问", async ({ page }) => {
    await page.goto("/dashboard/crm/member-levels", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "会员等级");
  });

  test("客户分类页面可访问", async ({ page }) => {
    await page.goto("/dashboard/crm/categories", { waitUntil: "networkidle" });
    await expectPrimaryHeading(page, "客户分类");
  });
});
