<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## 数据库（Drizzle · Phase 0）

1. **Docker Compose**：在 **Monorepo 根目录** 执行 **`docker compose up -d`**（**Postgres + Redis**；BullMQ 依赖 Redis）。
2. 复制 `uxyy-api/.env.example` 为 `uxyy-api/.env`（可选填入 **`JWT_ACCESS_SECRET`**——未设置时在非 production 环境会使用与示例相同的占位密钥；**生产务必使用强随机值**）；可选 **`AUTH_DEV_BYPASS`**，仅本地，见下文 Phase 0 表。未设置 **`REDIS_URL`** 时默认连接本机 `redis://127.0.0.1:6379`（请先 **`docker compose up -d`** 起 Redis）。
3. 将 migration 应用到数据库：
   ```bash
   cd uxyy-api && pnpm run db:migrate
   ```
4. Schema 变更后生成新 migration：
   ```bash
   cd uxyy-api && pnpm run db:generate
   ```

Schema 源码目录：`src/db/schema/`（与 PRD **8.2、11.5.2** Auth 共享表对齐；首期 migration：`drizzle/0000_init_auth_core.sql`）。

5. （推荐）写入开发账号：在 `uxyy-api` 执行 **`pnpm run db:seed`**（默认手机号 `13800138000`，密码 **`Dev12345!`**）。

## API 文档

### 在线文档（Swagger UI）
启动服务后访问：**`http://localhost:3000/docs`**

- 无需带 `/api/v1` 前缀
- 支持 Bearer Token 认证（点击右上角 "Authorize" 输入 `Bearer <token>`）
- 所有 DTO 字段、请求/响应示例自动生成

### 离线文档
详见项目根目录 **`docs/api-documentation.md`**，包含：
- 完整接口列表与示例
- 错误码说明
- 分页、排序、筛选规范

### 核心端点速查

| 路径 | 说明 |
|------|------|
| 全局前缀 | **`/api/v1`**（控制器不再重复写前缀） |
| **认证** |
| `POST /auth/login` | 登录（返回 access_token + refresh_token） |
| `POST /auth/register` | 注册 |
| `POST /auth/refresh` | 刷新 Token（access_token 过期时使用） |
| `GET /auth/profile` | 当前用户信息（含企业列表） |
| `GET /auth/enterprises` | 企业列表（含默认标记） |
| `PUT /auth/switch-enterprise/:id` | 切换默认企业（返回新 token） |
| `POST /auth/reset-password` | 修改密码 |
| **业务** |
| `GET /crm/customers` | 客户列表（JWT `enterpriseId` 租户隔离） |
| `GET /inventory/products` | 商品列表 |
| `GET /finance/invoices` | 发票列表 |
| `GET /ai/queue/stats` | AI 队列统计 |
| **健康** |
| `GET /health` | 服务健康检查（无需鉴权） |

**鉴权规则（并行开发约定）：**

- 默认 **全局 JWT**（`JwtAuthGuard`）。公开路由请打 **`@Public()`** 装饰器（见 `GET /health` 等）。
- **仅本地**：若 `.env` 设置 **`AUTH_DEV_BYPASS=true`**，将**跳过 Bearer 校验**并注入固定上下文 `userId=1`、`enterpriseId=1`。**切勿**部署到任意共享/生产环境。

## Compile and run the project

**Monorepo 推荐（与 Next 同时开发）**：在 **仓库根** 先 **`docker compose up -d`**，再 **`pnpm dev`**。此时 API 已监听默认 **3000**，**勿**再在 **`uxyy-api`** 里执行 **`pnpm run start:dev`**，否则 **`EADDRINUSE`**；说明见根 **[README.md](../README.md)** 与 **[多智能体并行开发指南.md](../多智能体并行开发指南.md) §2.5**。

**仅本包（`uxyy-api` 目录）**：

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

默认端口见 **`main.ts`**（`process.env.PORT ?? 3000`），可在 **`.env`** 中设置 **`PORT`**。

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
