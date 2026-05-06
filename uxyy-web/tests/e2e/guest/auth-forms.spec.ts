import { expect, test } from "@playwright/test";

test.describe("登录与注册 · 表单校验（纯前端 Zod）", () => {
  test("登录 · 空表单显示手机号与密码错误文案", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle", timeout: 60_000 });
    await page.getByRole("button", { name: "登录" }).click();
    await expect(page.getByText("请输入手机号")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("密码至少 8 位")).toBeVisible();
  });

  test("登录 · 错误手机号格式", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle", timeout: 60_000 });
    await page.getByLabel("手机号").fill("123");
    await page.getByLabel("密码").fill("12345678");
    await page.getByRole("button", { name: "登录" }).click();
    await expect(page.getByText("手机号格式不正确")).toBeVisible({ timeout: 15_000 });
  });

  test("注册页 · 展示注册文案与主要字段", async ({ page }) => {
    await page.goto("/register", { waitUntil: "networkidle", timeout: 60_000 });
    await expect(page.getByRole("heading", { name: "注册优效营" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByLabel("手机号")).toBeVisible();
    await expect(page.getByLabel("密码")).toBeVisible();
    await expect(page.getByLabel(/验证码/)).toBeVisible();
    await expect(page.getByLabel(/企业名称/)).toBeVisible();
  });

  test("登录页 · 进入免费注册", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle", timeout: 60_000 });
    await page.getByRole("link", { name: "免费注册" }).click();
    await page.waitForURL("**/register", { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "注册优效营" })).toBeVisible();
  });
});
