# uxyy

优效营（[uxyy.cn](https://uxyy.cn)）**小微企业经营智能体平台**。

## 项目状态

[![版本](https://img.shields.io/badge/version-v1.2.1-blue.svg)](./CHANGELOG.md)
[![完成率](https://img.shields.io/badge/completion-98--100%25-brightgreen.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

**当前版本**: v1.2.1 (2026-05-16)

**项目完成率**: 98-100%

### v1.2.1 新增功能

- ✅ **工作台 Dashboard**: 经营概览、快捷操作、待办事项（支持权限控制）

### v1.2.0 新增功能

- ✅ **导入导出功能**: 产品、供应商、销售订单、采购订单、库存盘点、发票、凭证、会员等级、客户分类、员工档案
- ✅ **银行流水管理**: CSV导入、自动匹配凭证
- ✅ **深色主题**: 完整的深色主题设计系统

### v1.0.1 新增功能

- ✅ **CRM模块**: 会员等级管理、会员积分、AI智能话术推荐、商机成单预测、客户流失预警
- ✅ **进销存模块**: 多仓库管理、商品会员价设置、智能采购建议
- ✅ **财务模块**: AI智能纠错、凭证错误检测与自动修复、财务健康度报告
- ✅ **OA模块**: 考勤管理、打卡、补卡申请、部门考勤统计
- ✅ **AI智能层**: 商机成单预测、客户流失预警、AI智能话术
- ✅ **数据导出**: PDF导出（销售单、报价单、对账单）

[查看完整更新日志](./优效营（uxyy.cn）小微企业一体化经营系统（MVP版）产品需求文档.md#版本更新记录)

## 工程默认值（并行开发最全栈）

- **Monorepo**：[`pnpm`](https://pnpm.io/) workspaces + [**Turborepo**](https://turbo.build/)（根目录编排 `lint` / `typecheck` / `test` / `build`）。
- **前端**：Next.js 14（App Router）+ TypeScript + Tailwind CSS + [**TanStack Query**](https://tanstack.com/query)（`uxyy-web/src/lib/query/`，可选 `NEXT_PUBLIC_API_URL`，见 **`uxyy-web/.env.example`**）。
- **后端**：**NestJS** + TypeScript，REST `/api/v1/*`，[**@nestjs/swagger**](https://docs.nestjs.com/openapi/introduction) 输出 OpenAPI。
- **契约与校验**：workspace 包 **`uxyy-shared`（建议包名 `@uxyy/shared`）**：Zod Schema、共享常量与类型声明；必要时与 Swagger 并排维护。
- **数据库**：PostgreSQL（生产默认 [**Neon**](https://neon.tech/) Serverless Postgres）+ **Drizzle ORM** + **drizzle-kit**。**本地开箱**：仓库根 **`docker compose up -d`**（Postgres + Redis），连接串见 [`uxyy-api/.env.example`](./uxyy-api/.env.example)；迁移在 **`uxyy-api`** 目录执行 **`pnpm run db:migrate`**，可选开发种子 **`pnpm --filter @uxyy/api run db:seed`**。
- **认证授权**：**Passport JWT**（`@nestjs/passport` + `passport-jwt`），Access / Refresh Token 策略；JWT 载荷与过期策略按 PRD；登出黑名单等能力与 **Redis** 协同。
- **缓存与异步**：Redis（缓存 / 限流 / Session 辅助）；[**BullMQ**](https://docs.bullmq.io/)（基于 Redis）处理异步任务（导入导出、报表、AI 异步等）。
- **协作**：**本地同时起前后端**：仓库根先 **`docker compose up -d`**，再 **`pnpm dev`**（Turborepo：`@uxyy/api` **3000**，`@uxyy/web` **3001**；`NEXT_PUBLIC_API_URL` 见 `uxyy-web/.env.example`）。**请勿**在同一台机上再于 `uxyy-api` 里执行 **`pnpm run start:dev`** 占同一个 **3000**，否则会 **`EADDRINUSE`**（须停掉其中之一或修改 `uxyy-api/.env` 的 **`PORT`**）。详情见 **[多智能体并行开发指南.md](./多智能体并行开发指南.md) §2.5**。**CI**：`.github/workflows/ci.yml`。**多 Agent** 并行约定见 **[多智能体并行开发指南.md](./多智能体并行开发指南.md)**；**各智能体负责范围与任务一览**见 **[docs/各智能体职责与任务说明.md](./docs/各智能体职责与任务说明.md)**；**按角色的工作提示词**见 **`docs/prompts/`**（索引 [docs/prompts/README.md](./docs/prompts/README.md)；集成开发主分支 **`develop`**，各角色提示词入口分支 **`prompt/agent-*`**）；产品设计见 **[产品需求文档（PRD）](./优效营（uxyy.cn）小微企业一体化经营系统（MVP版）产品需求文档.md)**。
