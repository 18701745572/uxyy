# DeepSeek 在本项目中的位置与本地操作案例

本文说明：**代码里哪些地方会调用 DeepSeek（实为 OpenAI 兼容接口）**、**如何配置**、以及 **3 个可从零跟做的操作案例**（页面、HTTP、Swagger）。

---

## 1. 哪些地方「用到了」DeepSeek？

DeepSeek **不是**散落在业务各处的硬编码，而是统一经 **`AiLlmService`** 走 HTTPS 调用 `POST {baseUrl}/chat/completions`。是否用真模型由环境变量 **`AI_LLM_PROVIDER=deepseek`** 决定。

| 层次 | 文件 | 作用 |
|------|------|------|
| 统一客户端 | `uxyy-api/src/modules/ai/ai.llm.ts` | 读取 `AI_LLM_PROVIDER` / `AI_DEEPSEEK_API_KEY` / `AI_LLM_MODEL` / `AI_LLM_BASE_URL`，对 DeepSeek 发请求 |
| 异步任务 Worker | `uxyy-api/src/modules/ai/ai.processor.ts` | BullMQ 消费队列，对 **`ocr_invoice` / `accounting_suggestion` / `classification`** 等任务调用 `this.llm.chat()`，解析 JSON 结果写库 |
| 同步「经营建议」 | `uxyy-api/src/modules/ai/ai.service.ts` → `getSmartSuggestions()` | 直接 `this.llm.chat()` 生成列表文案（**不依赖**队列 Worker 完成才会出字，但会顺带 `submitTask` 落一条任务记录） |
| 异步任务入口 | `uxyy-api/src/modules/ai/ai.service.ts` → `submitTask()` | 只入队；**真正的 LLM 调用在 Processor** |
| HTTP 对外 | `uxyy-api/src/modules/ai/ai.controller.ts` | `POST /ai/tasks`、`GET /ai/suggestions?type=...` 等 |

前端 **Dashboard → 智能助手** 页（`uxyy-web/src/app/(dashboard)/dashboard/ai/ai-panel.tsx`）通过 `submitAiTask` / `fetchAiTask` 走的是 **异步任务链路**（最终会进 Processor → DeepSeek）。

当前 Web 工程里 **没有** 封装 `GET /ai/suggestions` 的页面；要试「同步建议」请用 **Swagger** 或 **curl**（见下文案例 B）。

---

## 2. 环境变量（启用 DeepSeek）

在 **`uxyy-api/.env`** 中（勿提交 Git）：

```env
AI_LLM_PROVIDER=deepseek
AI_DEEPSEEK_API_KEY=你的密钥
# 可选；未设置时以 `ai.llm.ts` 中 `deepseek` 分支默认模型为准
AI_LLM_MODEL=deepseek-chat
# 可选；默认即为官方 OpenAI 兼容地址
AI_LLM_BASE_URL=https://api.deepseek.com/v1
```

- **`mock` 或未设置 `AI_LLM_PROVIDER`**：`AiLlmService` 使用内置 Mock，**不会**请求外网（开发机离线也可用）。
- **`qwen`**：走通义千问兼容接口，需 `AI_QWEN_API_KEY`，不是 DeepSeek。

完整占位说明见：`uxyy-api/.env.example`。

---

## 3. 前置条件（本地日常）

1. **Postgres、Redis** 已启动（Redis 供 BullMQ；异步任务必须要有 Worker 消费队列）。
2. **端口约定**：Nest 默认 **`PORT=3000`**；Next 开发页 **`http://localhost:3001`**；`uxyy-web/.env.local` 里 **`NEXT_PUBLIC_API_URL` 指向 API**（一般为 `http://127.0.0.1:3000`）。
3. 在 `uxyy-api` 目录执行过迁移与种子用户（便于登录拿 Token）：`pnpm run db:migrate`、`pnpm run db:seed`（默认账号见种子脚本说明，一般为 `13800138000` / `Dev12345!`）。

---

## 4. 案例 A：浏览器里跑「异步任务」（最直观）

1. 终端一：`uxyy-api` 执行 `pnpm run start:dev`（或 `nest start --watch`）。
2. 终端二：`uxyy-web` 执行 `pnpm dev`，浏览器打开 **`http://localhost:3001`**。
3. 使用种子账号 **登录**（需带企业上下文，JWT 里要有 `enterpriseId`，否则 AI 接口会提示未绑定企业）。
4. 进入 **`/dashboard/ai`**（侧栏「智能助手」类入口，以实际菜单为准）。
5. 选择任务类型（如 **记账建议**）、填写 **clientKey**（可选，幂等用）、**payload**（JSON），提交。
6. 观察任务状态轮询；完成后 **`outputPayload`** 里应为 JSON 结构（Processor 会调 DeepSeek 并 `JSON.parse`）。

若 `AI_LLM_PROVIDER=mock`，结果来自假数据，**不会**消耗 DeepSeek 额度。

---

## 5. 案例 B：`GET /ai/suggestions`（同步调 DeepSeek，适合验证「是否真通网」）

该接口会**同步**调用 `llm.chat`，最适合验证 Key 与网络。

1. 先登录拿 Token（PowerShell 示例，端口按你的 API 为准）：

```powershell
$base = "http://127.0.0.1:3000"
$login = Invoke-RestMethod -Uri "$base/api/v1/auth/login" `
  -Method Post -ContentType "application/json" `
  -Body '{"phone":"13800138000","password":"Dev12345!"}'
$token = $login.access_token
```

2. 请求建议（`type`：`inventory` | `finance` | `customer`）：

```powershell
$h = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "$base/api/v1/ai/suggestions?type=finance" -Headers $h
```

返回里应有 **`suggestions`** 字符串数组；若 DeepSeek 异常，会回落为「AI 服务暂时不可用」类提示。

---

## 6. 案例 C：异步任务 `POST /ai/tasks` + 轮询 `GET /ai/tasks/:id`

**任务类型**（与 `uxyy-shared` 中枚举一致）：`ocr_invoice`、`accounting_suggestion`、`classification`。

```powershell
$base = "http://127.0.0.1:3000"
$login = Invoke-RestMethod -Uri "$base/api/v1/auth/login" `
  -Method Post -ContentType "application/json" `
  -Body '{"phone":"13800138000","password":"Dev12345!"}'
$token = $login.access_token
$h = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

$body = @{
  taskType = "accounting_suggestion"
  clientKey = "demo-$(Get-Date -Format 'yyyyMMddHHmmss')"
  payload = @{ note = "办公采购一批纸张" }
} | ConvertTo-Json -Depth 5

$res = Invoke-RestMethod -Uri "$base/api/v1/ai/tasks" -Method Post -Headers $h -Body $body
$id = $res.id

# 轮询直至 status 为 completed / failed / dead
do {
  Start-Sleep -Seconds 2
  $task = Invoke-RestMethod -Uri "$base/api/v1/ai/tasks/$id" -Headers @{ Authorization = "Bearer $token" }
  $task.status
} while ($task.status -in @("pending","processing"))

$task | ConvertTo-Json -Depth 6
```

**说明**：异步链路依赖 **Redis + Worker 进程** 正常消费队列；若任务长期 `pending`，检查 Redis、`pnpm run start:dev` 是否跑着、以及 `GET /api/v1/ai/queue/stats` 是否堆积。

---

## 7. 使用 Swagger 调试（可选）

在开发环境启动 API 后，通常可访问 **`http://127.0.0.1:3000/docs`**（具体以 `app.bootstrap.ts` 为准），找到 **ai** 分组，先通过 **`Authorize`** 填入 Bearer Token，再调用 **`GET /ai/suggestions`** 或 **`POST /ai/tasks`**。

---

## 8. 怎样确认「真的在打 DeepSeek」而不是 Mock？

| 现象 | 含义 |
|------|------|
| `uxyy-api` 启动日志里出现 Mock 相关 warn（见 `ai.llm.ts`） | `AI_LLM_PROVIDER` 未设为 `deepseek` |
| 案例 B 返回正常多条 `- ` 风格建议文案 | 大概率已走真实 `chat`（仍可在 DeepSeek 控制台看用量） |
| 案例 A/C 的 `outputPayload` 为规则化 JSON | Processor 已成功解析模型输出 |
| 请求外网失败、TLS 错误等 | 检查 Key、`AI_LLM_BASE_URL`、公司代理 |

---

## 9. 相关代码速查

- DeepSeek 请求体：`uxyy-api/src/modules/ai/ai.llm.ts` → `openAiCompatChat`
- 队列里如何用模型：`uxyy-api/src/modules/ai/ai.processor.ts` → `buildPrompt` / `extractJson`
- 同步建议：`uxyy-api/src/modules/ai/ai.service.ts` → `getSmartSuggestions`

---

## 10. 安全提醒

- **不要把 `AI_DEEPSEEK_API_KEY` 写入仓库、截图或公开文档。**
- Key 泄漏后请尽快在 DeepSeek 控制台 **轮换密钥**。

若你希望把 **`GET /suggestions`** 也接到 Dashboard 某张卡片上，可在 `uxyy-web/src/lib/api/ai.ts` 增加封装并在对应页面调用，与本文案例 B 一致。
