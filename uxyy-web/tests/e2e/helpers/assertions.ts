import { expect, type Page } from "@playwright/test";

/** 工作台内主要内容区的一级标题（与各业务面板 `main` 内 `h1` 对齐）。 */
export async function expectPrimaryHeading(
  page: Page,
  name: string | RegExp,
  options?: { timeout?: number },
) {
  await expect(
    page.getByRole("main").getByRole("heading", { level: 1, name }),
  ).toBeVisible({ timeout: options?.timeout ?? 45_000 });
}
