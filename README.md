# uxyy

优效营（[uxyy.cn](https://uxyy.cn)）小微企业一体化经营系统。

## 工程默认值（并行开发最全栈）

- **Monorepo**：[`pnpm`](https://pnpm.io/) workspaces + [**Turborepo**](https://turbo.build/)（根目录编排 `lint` / `typecheck` / `test` / `build`）。
- **前端**：Next.js 14（App Router）+ TypeScript + Tailwind CSS。
- **后端**：**NestJS** + TypeScript，REST `/api/v1/*`，[**@nestjs/swagger**](https://docs.nestjs.com/openapi/introduction) 输出 OpenAPI。
- **契约与校验**：workspace 包 **`uxyy-shared`（建议包名 `@uxyy/shared`）**：Zod Schema、共享常量与类型声明；必要时与 Swagger 并排维护。
- **数据库**：PostgreSQL（生产默认 [**Neon**](https://neon.tech/) Serverless Postgres）+ **Drizzle ORM** + **drizzle-kit**。
- **认证授权**：**Passport JWT**（`@nestjs/passport` + `passport-jwt`），Access / Refresh Token 策略；JWT 载荷与过期策略按 PRD；登出黑名单等能力与 **Redis** 协同。
- **缓存与异步**：Redis（缓存 / 限流 / Session 辅助）；[**BullMQ**](https://docs.bullmq.io/)（基于 Redis）处理异步任务（导入导出、报表、AI 异步等）。
- **协作**：同一代码仓内多 Agent 并行，约定见 **[多智能体并行开发指南.md](./多智能体并行开发指南.md)**；**各智能体负责范围与任务一览**见 **[docs/各智能体职责与任务说明.md](./docs/各智能体职责与任务说明.md)**；产品设计见 **[产品需求文档（PRD）](./优效营（uxyy.cn）小微企业一体化经营系统（MVP版）产品需求文档.md)**。
