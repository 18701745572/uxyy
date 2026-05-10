# 五角色破坏性种子：`db:seed:purge-five-roles`

本文档记录在 `uxyy-api` 中执行 **`pnpm db:seed:purge-five-roles`**（或等价触发方式）时，生成的**登录账号、密码**以及脚本**顺带写入的业务演示数据**。实现代码见：**`uxyy-api/src/db/seed.ts`**（函数 `purgeAndSeedFiveRoleMatrix`、`truncatePublicApplicationTables`）。

## 如何执行

在 **`uxyy-api`** 目录、已配置好 **`DATABASE_URL`** 的前提下：

```bash
pnpm run db:migrate
pnpm run db:seed:purge-five-roles
```

等价方式：`SEED_PURGE_DATABASE=1`（或 `true` / `yes`）后执行普通种子：

```bash
# Windows PowerShell 示例
$env:SEED_PURGE_DATABASE='1'; pnpm run db:seed
```

CLI 标记来自进程参数：**`tsx src/db/seed.ts --purge-five-roles`**。

## 破坏性说明（必读）

脚本会 **`TRUNCATE` `public` 模式下所有应用业务表**，并 **`RESTART IDENTITY`**（自增主键归零）。  

**不会清空**名称以 **`__`** 开头的表（通常包含 Drizzle 迁移元数据）。  

清空完成后会**立刻**写入新的五用户 + 一家企业 + CRM/库存/员工档案等演示数据。**勿在生产或共享数据库上执行**。

## 默认登录账号（未改环境变量时）

五名用户同属**一家企业**（`owner_id` 指向「老板」用户；`user_enterprises.role` 为五种规范码之一）。  

**五个人共用同一个明文密码**：由 **`SEED_DEV_PASSWORD`** 决定，未设置时默认为 **`Dev12345!`**。

| 角色（规范码） | 手机号（默认） | 昵称 |
|----------------|----------------|------|
| `boss`（老板） | `13800138000`（同 `SEED_DEV_PHONE` 默认） | 种子用户·老板 |
| `finance`（财务） | `13900138901` | 种子用户·财务 |
| `sales`（销售） | `13900138902` | 种子用户·销售 |
| `warehouse`（仓管） | `13900138903` | 种子用户·仓管 |
| `oa`（行政） | `13900138904` | 种子用户·行政 |

执行成功后，控制台会打印 **`enterpriseId`、每个 `userId` 以及统一密码**，便于与本表对照。**主键数值以你库中实际打印为准**（首次执行一般为 `enterpriseId=1`、`userId` 自 1..5）。

多账号联调时，建议用 **五位种子用户分别登录**，对照主 PRD **§15.2.1「预设角色 → 权限码」**（与 `GET /api/v1/auth/permissions`）验证：**侧栏与按钮显隐**、**CRM/OA 等写接口是否 403**，以及 OA 首页 **「本人的申请进度」** 与 **「待您审批」**（仅 `oa:approve`）是否区分清晰。

登录后若在产品内验证「租户成员与角色」（不仅依赖种子）：**用户资料 → 企业成员管理**（路由 `/dashboard/profile/enterprise-members`，需 boss/oa）；规格见主 PRD **§9.26 企业与成员生命周期**。

**不含能力（当前工程未实现）**：**企业主转让**——见 PRD §9.26 小节「MVP 已实现与暂未实现」。**成员邀请链接**（`/join`、`/invitations/preview`、`POST /auth/register-invite`）已随本仓库迭代提供；企业主转让仍为未实现。

## 环境变量（覆盖默认值）

逻辑与默认值以 **`seed.ts`** 为准，常用项如下：

| 变量名 | 作用 |
|--------|------|
| `DATABASE_URL` | 必需，PostgreSQL 连接串 |
| `SEED_DEV_PASSWORD` | 五人共用的登录密码哈希源（明文） |
| `SEED_DEV_PHONE` | 老板账号手机号（亦为员工档案 seeds 中所写电话） |
| `SEED_DEMO_FINANCE_PHONE` | 财务手机号；未设时可由 `SEED_PURGE_SECONDARY_FINANCE` 兜底 |
| `SEED_DEMO_SALES_PHONE` | 同上，销售 |
| `SEED_DEMO_WAREHOUSE_PHONE` | 同上，仓管 |
| `SEED_DEMO_OA_PHONE` | 同上，行政 |
| `SEED_ENTERPRISE_NAME` | 企业名称 |
| `SEED_PURGE_ENTERPRISE_NAME` | 破坏性种子优先使用的企业名称（高于 `SEED_ENTERPRISE_NAME`） |

企业 **`max_users`** 在破坏性种子路径下固定设为 **99**（见 `seed.ts`）。

## 顺带写入的业务演示数据（与老板账号绑定）

以下内容均在**新建的那家企业** `enterpriseId` 下创建；**指派人 / 建档人等业务维度**多与**老板用户**（`assignedTo`、`createdBy` 等）一致，便于端到端冒烟。

- **通讯录 / 人事**：老板的 **`employee_profiles`** 一条（部门「运营部」、岗位「店长」、员工号 `EMP-001`，电话取自 `SEED_DEV_PHONE` 默认）。
- **CRM**：3 条示例客户（湖滨便利店、城南五金批发、XX 塑料制品厂）；其中第一家客户附带 **2 条跟进记录**。
- **库存 / 仓储**：
  - 默认仓库 **「主仓库」**，编码 **`WH-MAIN`**；
  - 商品分类「五金工具」「电子元器件」；
  - 示例商品 **P001–P005**、**M001** 等待（与脚本一致）；
  - 示例供应商 **2** 条；
  - **`inventory`** 五笔、`inventory_logs` **五笔期初入账**；
  - 及其它与 `seedSampleInventory` 一致的关联数据。

更细的字段级别说明可直接阅读 **`seed.ts`** 中的 `seedSampleCustomers`、`seedSampleInventory`、`ensureEnterpriseDefaultWarehouse`。

## 与 `pnpm db:seed`（普通种子）的差异

| 项目 | `db:seed` | `db:seed:purge-five-roles` |
|------|-----------|----------------------------|
| 是否清空全库应用数据 | 否 | 是（`public` 非 `__` 前缀表） |
| 用户数 | 仅当手机号不存在时创建 1 人 | 固定创建 5 人（五色角色矩阵） |
| 典型用途 | 首次开发、沿用教程默认单账号 | **角色权限 / 多端联调**、需要干净租户 + 多账号 |

前端 E2E 若继续使用默认 **`13800138000`** 登录，在 purge 后与老板账号仍一致（密码仍由 `SEED_DEV_PASSWORD` 控制）。
