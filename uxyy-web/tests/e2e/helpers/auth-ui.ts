import type { Page } from "@playwright/test";

const DEFAULT_PHONE = "13800138000";
const DEFAULT_PASSWORD = "Dev12345!";

export async function loginViaUi(page: Page) {
  const phone = process.env.E2E_PHONE ?? DEFAULT_PHONE;
  const password = process.env.E2E_PASSWORD ?? DEFAULT_PASSWORD;

  await page.goto("/login", { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByLabel("手机号").fill(phone);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45_000 });
}
