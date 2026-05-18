import type { Page } from "@playwright/test";

/**
 * 视觉测试辅助函数
 */

/**
 * 等待页面完全加载并稳定
 * 用于视觉回归测试前确保所有动画和异步内容已完成
 */
export async function waitForPageStable(page: Page, timeout = 2000): Promise<void> {
  // 等待网络空闲
  await page.waitForLoadState("networkidle");
  
  // 等待所有图片加载完成
  await page.waitForFunction(() => {
    const images = document.querySelectorAll("img");
    return Array.from(images).every((img) => img.complete);
  });
  
  // 额外等待时间确保动画完成
  await page.waitForTimeout(timeout);
}

/**
 * 隐藏动态内容（如时间、随机数据）
 * 用于提高视觉回归测试的稳定性
 */
export async function hideDynamicContent(page: Page): Promise<void> {
  // 隐藏时间相关元素
  await page.addStyleTag({
    content: `
      [data-testid="dynamic-content"],
      .dynamic-content,
      time,
      [data-time]
      {
        visibility: hidden !important;
      }
    `,
  });
}

/**
 * 设置主题（深色/浅色）
 */
export async function setTheme(page: Page, theme: "dark" | "light"): Promise<void> {
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(t);
  }, theme);
  
  // 等待主题切换动画
  await page.waitForTimeout(500);
}

/**
 * 截取特定元素的截图
 */
export async function screenshotElement(
  page: Page,
  selector: string,
  name: string
): Promise<void> {
  const element = page.locator(selector);
  await element.screenshot({ path: `./test-results/screenshots/${name}.png` });
}
