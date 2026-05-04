# 当前智能体工作上下文（本分支）

> **分支**：`prompt/agent-crm`  
> **角色**：**Agent-CRM** — 客户管理与 CRM 域

## 主提示词（必读）

请 **完整阅读并遵守**：**`docs/prompts/agent-crm.prompt.md`**，并辅以：

1. `多智能体并行开发指南.md`
2. **PRD**（`优效营（uxyy.cn）小微企业一体化经营系统（MVP版）产品需求文档.md`）
3. `docs/各智能体职责与任务说明.md` 中的本角色小节

索引详见 `docs/prompts/README.md`。

## Git 协作约定

- 实现功能时从 **develop** 拉出 `feature/crm-*`，通过 PR/MR 合回 **develop**。
- 本 `prompt/agent-*` 分支用于 **固化该角色的提示词入口**（根目录本文件）；与 `develop` 代码差异仅限本说明文件时，可随时将 `develop` 合并进来以保持最新脚手架。