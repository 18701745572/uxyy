# Playwright E2E 测试指南

## 目录结构

```
tests/e2e/
├── api-integration/          # API 集成测试
│   ├── api-smoke.spec.ts     # API 冒烟测试
│   └── api-workflow.spec.ts  # API 业务流程测试
├── guest/                    # 访客（未登录）测试
│   ├── auth-forms.spec.ts    # 认证表单测试
│   └── auth-smoke.spec.ts    # 认证冒烟测试
├── helpers/                  # 测试辅助函数
│   ├── api.ts                # API 辅助
│   ├── assertions.ts         # 自定义断言
│   ├── auth-ui.ts            # UI 认证辅助
│   ├── install-api-mocks.ts  # API Mock 安装
│   ├── mock-access-jwt.ts    # Mock JWT 生成
│   └── visual-helpers.ts     # 视觉测试辅助
├── logged-in/                # 登录后测试
│   ├── crm-customer-workflow.spec.ts      # CRM 客户工作流
│   ├── crm-role-permissions.spec.ts       # CRM 权限测试
│   ├── dashboard-workflow.spec.ts         # 工作台工作流
│   ├── finance-invoice-workflow.spec.ts   # 财务发票工作流
│   ├── full-app-navigation.spec.ts        # 完整导航测试
│   ├── inventory-product-workflow.spec.ts # 库存商品工作流
│   ├── oa-attendance-workflow.spec.ts     # OA 考勤工作流
│   ├── visual-regression.spec.ts          # 视觉回归测试
│   ├── widgets-and-reports.spec.ts        # 组件和报表测试
│   └── fixture.ts            # 测试夹具
└── README.md                 # 本文件
```

## 快速开始

### 1. 安装依赖

```bash
# 安装 Playwright 和浏览器
cd uxyy-web
pnpm install
pnpm exec playwright install chromium
```

### 2. 运行测试

```bash
# 运行所有测试
pnpm test:e2e

# 运行特定测试文件
pnpm exec playwright test logged-in/crm-customer-workflow.spec.ts

# 运行带 UI 的测试（调试模式）
pnpm test:e2e:ui

# 运行带浏览器的测试（headed 模式）
pnpm test:e2e:headed

# 生成测试报告
pnpm exec playwright show-report
```

### 3. 使用 Codegen 自动生成测试

```bash
# 启动 codegen 工具
pnpm exec playwright codegen http://localhost:3101

# 或者使用自定义配置启动
pnpm exec playwright codegen --viewport-size=1280,720 http://localhost:3101
```

## 测试分类

### 1. 业务流程测试

测试完整的用户业务流程：

- `crm-customer-workflow.spec.ts` - 客户创建、编辑、删除、搜索
- `inventory-product-workflow.spec.ts` - 商品管理、采购订单、销售订单
- `finance-invoice-workflow.spec.ts` - 发票录入、凭证管理
- `oa-attendance-workflow.spec.ts` - 考勤打卡、补卡申请
- `dashboard-workflow.spec.ts` - 工作台、通知中心

### 2. 视觉回归测试

对比页面截图，确保 UI 没有意外变化：

```bash
# 首次运行生成基准截图
pnpm exec playwright test visual-regression.spec.ts --update-snapshots

# 后续运行对比截图
pnpm exec playwright test visual-regression.spec.ts
```

截图保存在 `tests/e2e/__snapshots__/` 目录。

### 3. API 集成测试

直接测试后端 API：

```bash
# 运行 API 冒烟测试
pnpm exec playwright test api-integration/api-smoke.spec.ts

# 运行 API 业务流程测试
pnpm exec playwright test api-integration/api-workflow.spec.ts
```

## 使用 Codegen 生成测试脚本

### 方法一：交互式录制

1. 启动开发服务器：
```bash
cd uxyy-web
pnpm dev:e2e
```

2. 启动 codegen：
```bash
pnpm exec playwright codegen http://localhost:3101
```

3. 在打开的浏览器中：
   - 执行你要测试的操作
   - Playwright 会自动生成对应的测试代码
   - 代码会显示在右侧的 Inspector 窗口中

4. 复制生成的代码到测试文件中

### 方法二：使用脚本自动生成

```bash
# 运行 codegen 脚本（已配置好环境）
cd uxyy-web
pnpm exec playwright codegen --load-storage=auth.json http://localhost:3101
```

### 常用 Codegen 选项

```bash
# 指定视口大小
pnpm exec playwright codegen --viewport-size=1920,1080 http://localhost:3101

# 指定设备
pnpm exec playwright codegen --device="iPhone 13" http://localhost:3101

# 深色模式
pnpm exec playwright codegen --color-scheme=dark http://localhost:3101

# 保存认证状态
pnpm exec playwright codegen --save-storage=auth.json http://localhost:3101

# 加载认证状态（跳过登录）
pnpm exec playwright codegen --load-storage=auth.json http://localhost:3101
```

## 编写测试的最佳实践

### 1. 使用 Page Object 模式

```typescript
// pages/CustomerPage.ts
export class CustomerPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/dashboard/crm/customers");
  }

  async createCustomer(name: string, phone: string) {
    await this.page.getByRole("button", { name: /新建客户/ }).click();
    await this.page.getByLabel("客户名称").fill(name);
    await this.page.getByLabel("联系电话").fill(phone);
    await this.page.getByRole("button", { name: "保存" }).click();
  }
}

// 在测试中使用
const customerPage = new CustomerPage(page);
await customerPage.goto();
await customerPage.createCustomer("测试客户", "13800138000");
```

### 2. 使用 Fixtures

```typescript
// 使用预定义的 fixture
import { test } from "./logged-in/fixture";

test("测试", async ({ page }) => {
  // page 已经登录
  await page.goto("/dashboard");
});
```

### 3. 处理动态内容

```typescript
// 等待网络空闲
await page.waitForLoadState("networkidle");

// 等待特定元素
await page.waitForSelector("[data-testid='customer-list']");

// 等待 API 响应
await page.waitForResponse((response) =>
  response.url().includes("/api/v1/crm/customers")
);
```

### 4. 视觉测试技巧

```typescript
// 等待页面稳定
import { waitForPageStable } from "./helpers/visual-helpers";
await waitForPageStable(page);

// 隐藏动态内容
import { hideDynamicContent } from "./helpers/visual-helpers";
await hideDynamicContent(page);

// 截图对比
await expect(page).toHaveScreenshot("page.png", {
  fullPage: true,
  threshold: 0.2,
});
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `E2E_API_URL` | 后端 API 地址 | `http://localhost:3000` |
| `E2E_PHONE` | 测试账号手机号 | `13800138000` |
| `E2E_PASSWORD` | 测试账号密码 | `Dev12345!` |
| `E2E_LIVE_API` | 使用真实 API（1=是） | `0` |
| `PLAYWRIGHT_BASE_URL` | 前端地址 | `http://localhost:3101` |

## 调试技巧

### 1. 使用 UI 模式

```bash
pnpm test:e2e:ui
```

### 2. 慢动作执行

```typescript
test.use({
  launchOptions: {
    slowMo: 1000, // 每个操作延迟 1 秒
  },
});
```

### 3. 保留测试痕迹

```typescript
test.use({
  trace: "retain-on-failure", // 失败时保留 trace
  screenshot: "only-on-failure", // 失败时截图
  video: "retain-on-failure", // 失败时保留视频
});
```

### 4. 查看 Trace

```bash
pnpm exec playwright show-trace test-results/trace.zip
```

## CI/CD 集成

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm install -g pnpm
      - run: pnpm install
      - run: pnpm exec playwright install chromium
      - run: pnpm test:e2e
```

## 常见问题

### Q: 测试运行很慢怎么办？

A: 
1. 使用 `fullyParallel: true` 并行运行
2. 使用 `workers: 4` 增加工作进程
3. 只运行需要的测试文件

### Q: 如何跳过某些测试？

A: 
```typescript
test.skip("暂时跳过的测试", async () => {
  // ...
});
```

### Q: 如何只运行特定测试？

A:
```bash
# 按文件名
pnpm exec playwright test crm

# 按测试名
pnpm exec playwright test -g "创建客户"

# 按标签
test("测试 @smoke", async () => {})
pnpm exec playwright test --grep "@smoke"
```
