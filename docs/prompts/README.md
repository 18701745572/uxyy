# 各智能体工作提示词（uxyy）

## 用途

本目录存放 **按职责划分的智能体工作提示词**（`*.prompt.md`），与 **[各智能体职责与任务说明.md](../各智能体职责与任务说明.md)** 一致。智能体开始编码前应先阅读：

1. 根目录 **[多智能体并行开发指南.md](../../多智能体并行开发指南.md)**
2. **[优效营（uxyy.cn）小微企业一体化经营系统（MVP版）产品需求文档.md](../../优效营（uxyy.cn）小微企业一体化经营系统（MVP版）产品需求文档.md)**（PRD）
3. 本目录下 **对应角色的 `*.prompt.md`**

## 与 Git 分支的对应关系

| Git 分支 | 说明 |
|----------|------|
| `develop` | 集成开发主分支；含完整 Monorepo 与本目录全部提示词。 |
| `prompt/agent-auth` | 根目录 **`CURRENT_AGENT_PROMPT.md`** 指向 **认证 / 权限 / 部分 OA** 角色。 |
| `prompt/agent-crm` | **`CURRENT_AGENT_PROMPT.md`** → **CRM**。 |
| `prompt/agent-inventory` | **`CURRENT_AGENT_PROMPT.md`** → **进销存**。 |
| `prompt/agent-finance` | **`CURRENT_AGENT_PROMPT.md`** → **财务**。 |
| `prompt/agent-ai` | **`CURRENT_AGENT_PROMPT.md`** → **AI 智能层**。 |
| `prompt/agent-frontend` | **`CURRENT_AGENT_PROMPT.md`** → **前端**。 |

在 `prompt/agent-*` 分支上工作时，以根目录 **`CURRENT_AGENT_PROMPT.md`** 为入口；详细条款仍以本目录同名 `*.prompt.md` 与指南、PRD 为准。

## 文件列表

| 文件 | 角色 |
|------|------|
| [agent-auth.prompt.md](./agent-auth.prompt.md) | Agent-Auth |
| [agent-crm.prompt.md](./agent-crm.prompt.md) | Agent-CRM |
| [agent-inventory.prompt.md](./agent-inventory.prompt.md) | Agent-Inventory |
| [agent-finance.prompt.md](./agent-finance.prompt.md) | Agent-Finance |
| [agent-ai.prompt.md](./agent-ai.prompt.md) | Agent-AI |
| [agent-frontend.prompt.md](./agent-frontend.prompt.md) | Agent-Frontend |
