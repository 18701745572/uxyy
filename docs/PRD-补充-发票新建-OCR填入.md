# PRD 补充：发票新建 — 上传影像 OCR 填入（与纯手工录入并存）

**文档性质**：对产品需求主干（发票管理 / 财务录入）的补充说明，不改变「发票须可手工创建、核验、入账」的总体目标。  
**关联实现**：前端 `uxyy-web/.../finance/invoices/invoices-panel.tsx` 中 **`InvoiceForm`；接口 `POST /finance/invoices`、`POST /finance/invoices/ocr`（multipart）。**

---

## 1. 背景与目标

- **现状**：「新建发票」表单与当前 `InvoiceFormData` 字段一致（号码、代码、类型、价税拆分、购销方、`invoiceDate`、`remark` 等）；用户需逐字段手填。**AI 助手**侧已具备发票 OCR 异步任务链路，但发票页未打通，易产生「两头填」的认知成本。
- **目标**：在 **新建发票** 场景增加 **可选** 路径：**上传清晰发票影像 → OCR → 预览与编辑 →（可选合并策略确认）→ 写入表单 → 用户仍手动点「创建」**，降低录入错误与时间。
- **原则**：**手工录入为第一公民**；无图、翻拍不清、**仅电子版 PDF（当前上传控件若仅 accepting 图片则不在本增补范围内）**、仅能填号段等场景 **继续完全依赖纯手工**，不得强制 OCR。

---

## 2. 范围与非目标

| 在本增补范围内 | 非目标（可另起需求） |
|----------------|---------------------|
| 发票 **新建** 页的 JPG/PNG 上传（沿用与 AI 一致的 **≤5MB**、格式限制） | 编辑已存在发票时用 OCR **覆盖** 已核验数据 |
| 识别完成后 **预览结构化结果** | 单次上传多文件批量建多张发票 |
| **合并 / 全覆盖** 前 **二次确认** | 全自动创建发票（无用户点「创建」） |
| 识别失败时可重试或改手填 | 对接税局验真接口 |
| OCR 置信度提示（后端返回字段） | PDF 矢量解析引擎 |

---

## 3. 用户旅程（必选流程文案级）

以下步骤均为 **可选分支**；用户可不点「上传识别」直接进入手填。

1. **上传**  
   - 用户在「新建发票」区域点击 **上传发票影像 / 上传并识别**。  
   - 校验 MIME、大小；非法则 toast，不触发请求。

2. **识别中**  
   - 展示 loading（禁用重复提交 OCR）。  
   - 调用：`POST /api/v1/finance/invoices/ocr`，`multipart/form-data`，字段名 **`file`**（与 Swagger 保持一致）。

3. **预览 / 可编辑**  
   - 后端返回结构与 **`OcrInvoiceResponseDto`** 对齐：`invoiceNo`、`invoiceCode`、`type`、`amount`、`taxRate`、`taxAmount`、`totalAmount`、购销方、`issueDate`（或等价）、`ocrConfidence`。  
   - UI 呈现 **结构化预览卡片**（与表单字段逐项对应），允许在预览面板内微调（或等价于填入表单后直接显示在现有 `Input` 中 —— 两套实现选一，优先 **填入现有表单** + 顶部「识别结果预览」摘要，以减少双份维护）。

4. **回填表单的合并策略 + 二次确认（防误覆盖）**  
   - 在写入 `InvoiceFormData` **之前**：  
     - 若表单中 **任一关键字段** 已有用户输入（建议判定：`invoiceNo`、`totalAmount`、`amount` 任一非空，或可配置阈值），弹出 **Confirm**：  
       - **全覆盖**：用 OCR 结果替换所有可映射字段（`remark` 默认可不覆盖或单独选项）；  
       - **仅填入空字段**：仅对表单中为空的字段赋值；已有值保持不动；  
       - **取消**：不修改表单，保留 OCR 预览供对照。  
   - 若表单为 **空白/默认占位**（如仅系统默认开票日期），可无弹窗默认 **全覆盖**；或仍可「仅填空白」以降低意外 —— **产品默认推荐：首次进入新建页且无用户改动时可直接全覆盖；一旦有键入则用弹窗**。  

5. **确认创建（发票仍未落库）**  
   - 用户核对表单后点击现有 **「创建」**，规则与校验 **不变**（重复发票号、`CreateInvoiceDto` 约束等）。

---

## 4. 字段映射（后端 OCR → `InvoiceForm` / `CreateInvoiceDto`）

| OCR / 网关输出（统一列名建议） | 表单 / DTO | 说明 |
|-------------------------------|-----------|------|
| `invoiceNo` | `invoiceNo` | 必填语义不变 |
| `invoiceCode`（可空） | `invoiceCode` | |
| `type`：`special \| normal \| electronic` | `type` | 若模型给出中文类型，服务端或共享层枚举映射后再返回 |
| `amount`（不含税） | `amount` | 字符串小数 |
| `taxRate` | `taxRate` | OCR 若不返回则留空，由用户补 |
| `taxAmount` | `taxAmount` | |
| `totalAmount` | `totalAmount` | |
| `buyerName` / `buyerTaxNo` | 同名字段 | |
| `sellerName` / `sellerTaxNo` | 同名字段 | |
| **`issueDate`（后端 DTO）** | **`invoiceDate`**（`type="date"`，YYYY-MM-DD） | **必须做格式归一**；若 AI 输出 `2025年03月26日`，在 **接入真实识别** 时于 API 层解析为 `YYYY-MM-DD` |
| `remark` | `remark` | 默认可不填；OCR 无则保持空 |
| `ocrConfidence` | 仅展示 | 可在预览区灰字展示「置信度 x%」 |

> **与 AI 异步任务 JSON 的对齐**：若后续由同一 LLM 输出 `invoiceNumber`、`invoiceDate` 等别名，**财务 OCR 适配层** 应归一成上表左列，避免前端分支爆炸。

---

## 5. 技术落地改动方案（供开发拆任务）

### 5.1 前端（`invoices-panel.tsx` / `lib/api/invoices.ts`）

- **`postInvoiceOcr(file: File)`**  
  - `FormData` + `append('file', file)`；`fetch`/`apiFetch` 需 **不显式设 `Content-Type`**（由浏览器带 boundary）。若当前 `apiFetch` 在无 body 时仍设 JSON，需为 multipart **单独封装** 或增加选项 `omitJsonContentType: true`。  
- **`InvoiceForm`（仅 `!isEdit`）**  
  - 区块顺序建议：标题下第一行 **「上传发票影像（可选）」** + 说明「清晰 JPG/PNG，≤5MB；PDF 请手填」。  
  - 状态：`ocrStatus: 'idle' \| 'loading' \| 'success' \| 'error'`，`lastOcrResult: OcrInvoiceShape | null`。  
  - `applyOcrToForm(mode: 'replace' | 'fillEmpty')`：实现合并逻辑，与 **确认弹窗** 绑定。  
  - **不要**在 OCR 成功后自动 `POST /finance/invoices`**；保持与现有一致，由用户点「创建」。  
- **类型**：可在 `@uxyy/shared` 增加 `ocrInvoiceResultSchema`（与 `OcrInvoiceResponseDto` 字段对齐）供 Zod 校验响应，或暂用内联 TypeScript 类型。

### 5.2 后端（当前占位 → 真实识别）

- **短期**：`FinanceService.ocrInvoice` 仍为占位时，前端可联调 **固定 JSON**；保证 **响应形状** 与文档一致。  
- **中期**：在 `ocrInvoice` 内调用 **与 AI 模块一致的识别能力**（同步 HTTP 调内部服务或复用 `AiLlmService`），将多模态输出 **映射** 为 `OcrInvoiceResponseDto`；**禁止**把原始 LLM JSON 直接暴露给前端而不归一。  
- **约束**：`multipart` 与全局 `bodyParser` 限制协调（大文件走 stream / 提高 limit 已在 API 层处理）。

### 5.3 文档与测试

- 更新 `docs/api-documentation.md` **发票** 小节：`POST /finance/invoices/ocr` 请求体、响应示例、与 `CreateInvoice` 字段关系。  
- E2E（可选）：Mock `invoices/ocr` 返回固定体 → 点击合并 → 断言表单字段。

---

## 6. 验收标准（UAT）

1. 无上传时，新建发票流程与现网 **完全一致**。  
2. 上传合法图片 → 识别成功 → 表单按所选策略更新；**有已填字段时必出确认**，且三种选项行为正确。  
3. 识别失败（网络/400/413）有明确提示，**不损坏**用户已手填内容。  
4. 用户修改 OCR 回填后的任意字段后，仍可正常「创建」；重复 `invoiceNo` 仍被后端拒绝。  
5. 不在本需求范围的场景（PDF-only、无图）无回归。

---

## 7. 版本记录

| 日期 | 说明 |
|------|------|
| 2026-05-06 | 初稿：与 `invoices-panel` 表单结构对齐，明确合并确认与手工并存 |
| 2026-05-06 | **实现**：前端「新建发票」已接 `multipart` OCR、预览、合并策略弹窗、`apiFetch` 支持 FormData；`docs/PRD` 本节为需求与设计依据 |
