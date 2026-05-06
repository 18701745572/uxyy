import { defineConfig, devices } from "@playwright/test";

/**
 * 默认与本机 `.env.local` 一致：`localhost`，避免 localhost / 127.0.0.1 混用。
 */
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3101";

/** 传给 Next：`NEXT_PUBLIC_API_URL`（Playwright webServer.env 优先级高于 `.env.local`） */
const apiOrigin = (
  process.env.E2E_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 90_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm run dev:e2e:fresh",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_API_URL: apiOrigin,
    },
  },
});
