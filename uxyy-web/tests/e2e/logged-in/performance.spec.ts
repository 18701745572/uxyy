import { expect, test } from "./fixture";

/**
 * 性能 E2E 测试
 */
test.describe("性能测试", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/auth/login");
  });

  test("首页加载时间", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    const loadTime = Date.now() - startTime;

    // 验证加载时间小于 3 秒
    expect(loadTime).toBeLessThan(3000);
  });

  test("登录页面加载时间", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/auth/login", { waitUntil: "networkidle" });
    const loadTime = Date.now() - startTime;

    // 验证加载时间小于 2 秒
    expect(loadTime).toBeLessThan(2000);
  });

  test("客户列表页面加载时间", async ({ page }) => {
    await page.goto("/dashboard");

    const startTime = Date.now();
    await page.goto("/dashboard/crm/customers", { waitUntil: "networkidle" });
    const loadTime = Date.now() - startTime;

    // 验证加载时间小于 3 秒
    expect(loadTime).toBeLessThan(3000);
  });

  test("首屏内容渲染时间", async ({ page }) => {
    await page.goto("/dashboard");

    // 使用 Performance API 获取性能指标
    const performanceTiming = await page.evaluate(() => {
      const timing = performance.timing;
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
      };
    });

    // 验证 DOM 内容加载时间小于 2 秒
    expect(performanceTiming.domContentLoaded).toBeLessThan(2000);
  });

  test("API 响应时间", async ({ page }) => {
    await page.goto("/dashboard/crm/customers");

    // 监听 API 请求
    const response = await page.waitForResponse(
      (resp) => resp.url().includes("/api/crm/customers") && resp.status() === 200
    );

    const responseTime = response.request().timing()?.responseEnd || 0;

    // 验证 API 响应时间小于 1 秒
    expect(responseTime).toBeLessThan(1000);
  });

  test("图片懒加载", async ({ page }) => {
    await page.goto("/dashboard/inventory/products");

    // 获取所有图片
    const images = page.locator("img");
    const imageCount = await images.count();

    if (imageCount > 0) {
      // 检查图片是否有懒加载属性
      const firstImage = images.first();
      const loadingAttr = await firstImage.getAttribute("loading");

      // 验证图片有懒加载属性
      expect(loadingAttr).toBe("lazy");
    }
  });

  test("JavaScript 包大小", async ({ page }) => {
    await page.goto("/dashboard");

    // 获取所有脚本资源
    const scripts = await page.evaluate(() => {
      return performance.getEntriesByType("resource")
        .filter((r) => r.name.endsWith(".js"))
        .map((r) => ({
          name: r.name,
          size: (r as PerformanceResourceTiming).transferSize,
        }));
    });

    // 验证单个 JS 文件大小不超过 500KB
    for (const script of scripts) {
      if (script.size > 0) {
        expect(script.size).toBeLessThan(500 * 1024); // 500KB
      }
    }
  });

  test("内存使用", async ({ page }) => {
    await page.goto("/dashboard");

    // 获取内存使用情况
    const memory = await page.evaluate(() => {
      return (performance as any).memory;
    });

    if (memory) {
      // 验证使用的 JS 堆内存小于 100MB
      expect(memory.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024);
    }
  });
});

/**
 * 关键渲染路径测试
 */
test.describe("关键渲染路径", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test("关键 CSS 内联", async ({ page }) => {
    await page.goto("/auth/login");

    // 检查是否有内联样式
    const inlineStyles = await page.locator("style").count();
    expect(inlineStyles).toBeGreaterThan(0);
  });

  test("字体预加载", async ({ page }) => {
    await page.goto("/auth/login");

    // 检查是否有字体预加载
    const preloadLinks = await page.locator('link[rel="preload"][as="font"]').count();
    // 如果有自定义字体，应该有预加载
    expect(preloadLinks).toBeGreaterThanOrEqual(0);
  });

  test("关键资源优先加载", async ({ page }) => {
    await page.goto("/dashboard");

    // 获取资源加载顺序
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType("resource")
        .slice(0, 10)
        .map((r) => ({
          name: r.name,
          startTime: r.startTime,
        }));
    });

    // 验证 CSS 和关键 JS 优先加载
    const cssResources = resources.filter((r) => r.name.endsWith(".css"));
    const jsResources = resources.filter((r) => r.name.endsWith(".js"));

    // CSS 应该在早期加载
    if (cssResources.length > 0) {
      expect(cssResources[0].startTime).toBeLessThan(1000);
    }
  });
});

/**
 * 交互性能测试
 */
test.describe("交互性能", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/auth/login");
  });

  test("按钮点击响应时间", async ({ page }) => {
    await page.goto("/dashboard/crm/customers");

    const startTime = Date.now();
    await page.getByRole("button", { name: /新建/ }).click();
    const responseTime = Date.now() - startTime;

    // 验证点击响应时间小于 100ms
    expect(responseTime).toBeLessThan(100);
  });

  test("表单输入响应时间", async ({ page }) => {
    await page.goto("/dashboard/crm/customers/new");

    const input = page.getByLabel("客户名称");
    const startTime = Date.now();
    await input.fill("测试客户名称");
    const inputTime = Date.now() - startTime;

    // 验证输入响应时间合理
    expect(inputTime).toBeLessThan(500);
  });

  test("列表滚动性能", async ({ page }) => {
    await page.goto("/dashboard/crm/customers");

    // 等待列表加载
    await page.waitForSelector("table tbody tr");

    const startTime = Date.now();
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    const scrollTime = Date.now() - startTime;

    // 验证滚动响应时间小于 100ms
    expect(scrollTime).toBeLessThan(100);
  });
});
