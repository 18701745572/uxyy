# 优效营 API 文档

**版本**: v1.1  
**基础URL**: `http://localhost:3000/api/v1`  
**Swagger UI**: `http://localhost:3000/docs`  
**最后更新**: 2026-05-07

---

## 目录

1. [认证授权 (Auth)](#1-认证授权-auth)
2. [进销存 (Inventory)](#2-进销存-inventory)
3. [财务 (Finance)](#3-财务-finance)
4. [客户关系 (CRM)](#4-客户关系-crm)
5. [智能服务 (AI)](#5-智能服务-ai)
6. [附录](#附录)

---

## 通用规范

### 请求格式

```http
Content-Type: application/json
Authorization: Bearer <access_token>
X-Enterprise-ID: <enterprise_id>
```

### 响应格式

```json
{
  "code": 200,
  "data": {},
  "message": "success"
}
```

### 错误码

| 状态码 | 含义 | 说明 |
|-------|------|------|
| 200 | 成功 | 请求处理成功 |
| 400 | 请求参数错误 | 检查请求参数 |
| 401 | 未授权 | Token 无效或过期 |
| 403 | 禁止访问 | 权限不足 |
| 404 | 资源不存在 | 检查资源 ID |
| 500 | 服务器错误 | 联系管理员 |

---

## 1. 认证授权 (Auth)

### 1.1 用户注册

```http
POST /auth/register
```

**请求体**:
```json
{
  "phone": "13800138000",
  "password": "password123",
  "nickname": "张三",
  "enterpriseName": "某某科技有限公司"
}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "user": {
      "id": 1,
      "phone": "13800138000",
      "nickname": "张三"
    },
    "enterprise": {
      "id": 1
    }
  }
}
```

### 1.2 用户登录

```http
POST /auth/login
```

**请求体**:
```json
{
  "phone": "13800138000",
  "password": "password123"
}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "user": {
      "id": 1,
      "phone": "13800138000",
      "nickname": "张三"
    },
    "enterprise": {
      "id": 1
    }
  }
}
```

### 1.3 获取当前用户信息

```http
GET /auth/profile
```

**响应**:
```json
{
  "id": 1,
  "phone": "13800138000",
  "nickname": "张三",
  "avatar": null,
  "status": "active",
  "createdAt": "2026-05-01T00:00:00Z",
  "enterprises": [
    {
      "id": 1,
      "name": "某某商贸有限公司",
      "role": "boss",
      "isDefault": true
    }
  ]
}
```

### 1.4 获取企业列表

```http
GET /auth/enterprises
```

**响应**:
```json
[
  {
    "id": 1,
    "name": "某某商贸有限公司",
    "industry": "retail",
    "role": "boss",
    "isDefault": true
  },
  {
    "id": 2,
    "name": "某某科技有限公司",
    "industry": "tech",
    "role": "sales",
    "isDefault": false
  }
]
```

### 1.5 切换默认企业

```http
PUT /auth/switch-enterprise/:id
```

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 要切换到的企业 ID |

**响应**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer"
}
```

**说明**: 切换成功后，需使用新的 `access_token` 发起后续请求。

### 1.6 刷新 Token

```http
POST /auth/refresh
```

**请求体**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**响应**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer"
}
```

**说明**: 前端在收到 401 响应时应自动调用此接口刷新 token，无需用户感知。

### 1.7 修改密码

```http
POST /auth/reset-password
```

**请求体**:
```json
{
  "phone": "13800138000",
  "oldPassword": "password123",
  "newPassword": "newpassword456"
}
```

---

## 2. 进销存 (Inventory)

### 2.1 商品管理

#### 获取商品列表

```http
GET /inventory/products?page=1&pageSize=20&category=电子产品&keyword=手机
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "name": "iPhone 15",
        "code": "IP15-001",
        "category": "电子产品",
        "unit": "台",
        "price": 5999.00,
        "cost": 4999.00,
        "stock": 100,
        "minStock": 10,
        "status": "active",
        "createdAt": "2026-05-01T00:00:00Z",
        "updatedAt": "2026-05-04T12:00:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20
  }
}
```

#### 创建商品

```http
POST /inventory/products
```

**请求体**:
```json
{
  "name": "iPhone 15",
  "code": "IP15-001",
  "category": "电子产品",
  "unit": "台",
  "price": 5999.00,
  "cost": 4999.00,
  "stock": 100,
  "minStock": 10,
  "remark": "新款手机"
}
```

#### 更新商品

```http
PUT /inventory/products/:id
```

#### 删除商品

```http
DELETE /inventory/products/:id
```

### 2.2 采购订单

#### 获取采购订单列表

```http
GET /inventory/purchase-orders?page=1&pageSize=20&status=pending
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "orderNo": "PO202605040001",
        "supplierId": 1,
        "totalAmount": 50000.00,
        "status": "pending",
        "remark": "紧急采购",
        "createdAt": "2026-05-04T10:00:00Z"
      }
    ],
    "total": 20,
    "page": 1,
    "pageSize": 20
  }
}
```

#### 创建采购订单

```http
POST /inventory/purchase-orders
```

**请求体**:
```json
{
  "supplierId": 1,
  "items": [
    {
      "productId": 1,
      "quantity": 10,
      "price": 4999.00
    }
  ],
  "remark": "紧急采购"
}
```

### 2.3 销售订单

#### 获取销售订单列表

```http
GET /inventory/sales-orders?page=1&pageSize=20
```

#### 创建销售订单

```http
POST /inventory/sales-orders
```

**请求体**:
```json
{
  "customerId": 1,
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "price": 5999.00
    }
  ],
  "remark": "大客户订单"
}
```

### 2.4 库存预警

```http
GET /inventory/alerts
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "lowStock": [
      {
        "productId": 1,
        "productName": "iPhone 15",
        "currentStock": 5,
        "minStock": 10
      }
    ],
    "outOfStock": []
  }
}
```

---

## 3. 财务 (Finance)

> **说明**：部分小节仍沿用本文「通用规范」中的 `{ code, data }` 示例；而 **凭证、报表、`/finance/account-subjects` 等接口为服务端直返 DTO**。以部署环境 Swagger `/docs` 为准。报表口径见产品需求 **第 2.5.5 节**。

### 3.1 发票管理

#### 获取发票列表

```http
GET /finance/invoices?page=1&pageSize=20&type=in&startDate=2026-05-01&endDate=2026-05-31
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "type": "in",
        "amount": 10000.00,
        "title": "服务费",
        "taxNo": "91310000XXXXXXXX",
        "createdAt": "2026-05-04T10:00:00Z"
      }
    ],
    "total": 30,
    "page": 1,
    "pageSize": 20
  }
}
```

#### 创建发票

```http
POST /finance/invoices
```

**请求体**:
```json
{
  "type": "in",
  "amount": 10000.00,
  "title": "服务费",
  "taxNo": "91310000XXXXXXXX",
  "address": "上海市",
  "phone": "021-12345678",
  "bankName": "工商银行",
  "bankAccount": "622202XXXXXXXX",
  "remark": "项目服务费"
}
```

#### 发票影像 OCR（占位 / 对齐 Swagger）

识别 **不单独落库**，仅返回结构化草稿供前端填入「新建发票」表单；创建发票仍为 **`POST /finance/invoices`**。

```http
POST /finance/invoices/ocr
Content-Type: multipart/form-data
```

表单字段：**`file`**（jpg/png 等，`finance.controller` 与 AI 助手一致的限制以 Swagger 为准）。

**响应**（直返 `OcrInvoiceResponseDto`，摘录）：

```json
{
  "invoiceNo": "4400123111",
  "invoiceCode": "044001900211",
  "type": "normal",
  "amount": "10000.00",
  "taxRate": "13.00",
  "taxAmount": "1300.00",
  "totalAmount": "11300.00",
  "buyerName": "某某商贸有限公司",
  "buyerTaxNo": "91440100MA5xxxxxx",
  "sellerName": "某某供应商有限公司",
  "sellerTaxNo": "91440100MA5yyyyyy",
  "issueDate": "2024-01-10",
  "ocrConfidence": 0.98
}
```

前端将 **`issueDate`** 映射为创建接口的 **`invoiceDate`**（`YYYY-MM-DD`）。列表、创建请求的真实字段以 Swagger 与 `@uxyy/shared` 中 `CreateInvoiceDto` 为准（与上表早期示例可能不一致时以契约为准）。

### 3.2 凭证管理

当前为 **单行分录**：借方科目名称、贷方科目名称、`amount` 为 **字符串金额**（如 `"1994.90"`）；**不提供** `status` 等草稿/已过账筛选（MVP 列表仅日期范围 + `sourceType`）。

#### 分页列表

```http
GET /finance/vouchers?page=1&pageSize=20&startDate=2026-05-01&endDate=2026-05-31&sourceType=ai_task
```

**查询**：`page`、`pageSize`（最大 100）、`startDate` / `endDate`（`YYYY-MM-DD`）、可选 `sourceType`：`sales_order` | `purchase_order` | `manual` | `ai_task`。

**响应**（直返分页 DTO）:
```json
{
  "items": [
    {
      "id": 1,
      "enterpriseId": 1,
      "voucherNo": "V202605060001",
      "sourceType": "manual",
      "sourceId": null,
      "entryDate": "2026-05-06T00:00:00.000Z",
      "debitAccount": "银行存款",
      "creditAccount": "主营业务收入",
      "amount": "10000.00",
      "summary": "服务费",
      "createdBy": 1,
      "createdAt": "2026-05-06T10:00:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

#### 凭证详情

```http
GET /finance/vouchers/:id
```

返回单条结构与 `items[]` 中元素相同。

#### 手动创建凭证

```http
POST /finance/vouchers
```

借、贷科目 **名称** 不可相同。**请求体**:
```json
{
  "voucherNo": "V202605060002",
  "sourceType": "manual",
  "entryDate": "2026-05-06T00:00:00.000Z",
  "debitAccount": "银行存款",
  "creditAccount": "主营业务收入",
  "amount": "10000.00",
  "summary": "5月收入"
}
```

可选：`sourceId`（关联业务单据 ID）。

### 3.3 财务报表

#### 经营概览（仪表盘）

```http
GET /finance/reports/dashboard?period=month&date=2026-05
```

`period`: `month` | `quarter` | `year`；`date` 形如 `YYYY-MM`。

#### 资产负债表（截止日）

```http
GET /finance/reports/balance-sheet?asOfDate=2026-05-31
```

**响应**（摘录）:
```json
{
  "period": "2026-05-31",
  "assets": [{ "code": "1002", "name": "银行存款", "amount": "50000.00" }],
  "totalAssets": "120000.00",
  "liabilities": [{ "code": "2202", "name": "应付账款", "amount": "30000.00" }],
  "totalLiabilities": "30000.00",
  "equity": [{ "code": "4001", "name": "实收资本", "amount": "90000.00" }],
  "totalEquity": "90000.00"
}
```

#### 利润表（自然月）

```http
GET /finance/reports/income-statement?period=2026-05
```

`period` 为 `YYYY-MM`。响应含 `revenue` / `costs` / `expenses` 分项及 `netProfit`（均为字符串金额）。

#### 现金流量表（简版，自然月）

```http
GET /finance/reports/cash-flow?period=2026-05
```

响应含 `operatingActivities`、`investingActivities`、`financingActivities` 分项及 `netOperatingCashFlow`、`netCashFlow`、`beginningCash`、`endingCash` 等。

#### 应收应付汇总

```http
GET /finance/reports/ar-ap
```

返回 `receivables`、`payables` 列表及 `totalReceivables`、`totalPayables`。

### 3.4 会计科目（account-subjects）

#### 列表

```http
GET /finance/account-subjects
```

**响应**（数组，直返）:
```json
[
  {
    "id": 1,
    "enterpriseId": 1,
    "code": "1001",
    "name": "库存现金",
    "category": "asset",
    "parentId": null,
    "balanceDirection": "debit",
    "isActive": true,
    "createdAt": "2026-05-01T00:00:00.000Z"
  }
]
```

`category`: `asset` | `liability` | `equity` | `income` | `expense`。

#### 新增 / 详情 / 修改

```http
POST /finance/account-subjects
GET /finance/account-subjects/:id
PATCH /finance/account-subjects/:id
```

---

## 4. 客户关系 (CRM)

### 4.1 客户管理

#### 获取客户列表

```http
GET /crm/customers?page=1&pageSize=20&keyword=张三&tag=VIP
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "name": "张三",
        "phone": "13800138000",
        "email": "zhangsan@example.com",
        "address": "上海市浦东新区",
        "tags": ["VIP", "大客户"],
        "remark": "重要客户",
        "createdAt": "2026-05-01T00:00:00Z",
        "updatedAt": "2026-05-04T12:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

#### 创建客户

```http
POST /crm/customers
```

**请求体**:
```json
{
  "name": "张三",
  "phone": "13800138000",
  "email": "zhangsan@example.com",
  "address": "上海市浦东新区",
  "tags": ["VIP"],
  "remark": "重要客户"
}
```

### 4.2 商机管理

#### 获取商机列表

```http
GET /crm/opportunities?page=1&pageSize=20&stage=proposal
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "name": "企业软件项目",
        "customerId": 1,
        "customerName": "张三",
        "amount": 500000.00,
        "stage": "proposal",
        "probability": 70,
        "expectedCloseDate": "2026-06-30",
        "remark": "需要跟进",
        "createdAt": "2026-05-01T00:00:00Z"
      }
    ],
    "total": 20,
    "page": 1,
    "pageSize": 20
  }
}
```

#### 创建商机

```http
POST /crm/opportunities
```

**请求体**:
```json
{
  "customerId": 1,
  "name": "企业软件项目",
  "amount": 500000.00,
  "stage": "proposal",
  "probability": 70,
  "expectedCloseDate": "2026-06-30",
  "remark": "需要跟进"
}
```

**阶段说明**:
- `prospect` - 潜在客户
- `qualified` - 已确认需求
- `proposal` - 方案已提交
- `negotiation` - 谈判中
- `closed_won` - 已成交
- `closed_lost` - 已流失

### 4.3 销售漏斗

```http
GET /crm/opportunities/funnel
```

**响应**:
```json
{
  "code": 200,
  "data": [
    { "stage": "prospect", "count": 50, "totalAmount": 2000000.00 },
    { "stage": "qualified", "count": 30, "totalAmount": 1500000.00 },
    { "stage": "proposal", "count": 15, "totalAmount": 800000.00 },
    { "stage": "negotiation", "count": 8, "totalAmount": 500000.00 },
    { "stage": "closed_won", "count": 5, "totalAmount": 300000.00 },
    { "stage": "closed_lost", "count": 3, "totalAmount": 100000.00 }
  ]
}
```

---

## 5. 智能服务 (AI)

> **说明**：本模块控制器直返 JSON（无统一 `{ code, data }` 包装）；需登录且 JWT 中包含企业上下文。**OCR（发票影像）**：优先使用 **本文第 3.1 节** 的 `POST /finance/invoices/ocr`（multipart）；亦可通过本节 **异步任务** `taskType: ocr_invoice` 投递。

### 5.1 健康检查与队列统计

```http
GET /ai/ping
```

无需鉴权，用于探活。

```http
GET /ai/queue/stats
```

返回主队列与死信队列的 BullMQ Job 计数（`waiting`、`active`、`completed`、`failed` 等）。

### 5.2 异步任务（提交 / 列表 / 详情）

```http
POST /ai/tasks
```

**请求体**:
```json
{
  "taskType": "accounting_suggestion",
  "clientKey": "optional-idempotency-key",
  "payload": { "imageUrl": "https://example.com/invoice.png" }
}
```

**`taskType`**：`ocr_invoice` | `accounting_suggestion` | `classification`。同一企业下 **`taskType + clientKey` 相同则幂等**，不会重复建任务。

```http
GET /ai/tasks?taskType=ocr_invoice&status=completed&page=1&pageSize=20
GET /ai/tasks/:id
```

列表返回形如 `{ "list": [ AiTask ], "pagination": { "page", "pageSize", "total" } }`。单任务对象含 `status`、`inputPayload`、`outputPayload`、`errorMessage`、`attempts` 等（见 Swagger `AiTaskResponse`）。

### 5.3 将已完成任务写入财务凭证

```http
POST /ai/tasks/:id/voucher
```

对 **已完成** 的任务，按其 `outputPayload` 写入 **本文第 3.2 节** 所述单行凭证；请求体可为空，或由调用方选择性覆盖字段：

```json
{
  "debitAccount": "银行存款",
  "creditAccount": "应收账款",
  "amount": "50000.00",
  "summary": "收客户货款",
  "entryDate": "2026-05-06T00:00:00.000Z"
}
```

**响应**（节选）:
```json
{
  "created": true,
  "voucher": { "id": 1, "voucherNo": "...", "sourceType": "ai_task", "amount": "50000.00" }
}
```

`created === false` 表示该任务此前已入账，本次返回已有凭证（**幂等**）。

### 5.4 智能建议（同步便捷接口）

```http
GET /ai/suggestions?type=finance
```

**查询参数 `type`**：`inventory` | `finance` | `customer`。服务端会先创建一条异步任务记录，再 **同步调用 LLM** 返回 `{ "task": { … }, "suggestions": [ "字符串", … ] }`（条目数可能因模型输出而异）。

---

## 附录

### A. 分页参数

所有列表接口支持以下分页参数：

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20，最大 100 |

### B. 排序参数

支持通过 `sort` 参数指定排序：

```
GET /inventory/products?sort=createdAt:desc
```

### C. 筛选参数

支持通过字段名进行筛选：

```
GET /inventory/products?category=电子产品&status=active
```

### D. 日期格式

所有日期字段使用 ISO 8601 格式：

```
2026-05-04T12:00:00Z
```

### E. 金额格式

示例性约定为 **JSON 数字**，保留 2 位小数。**财务凭证手写创建、AI 入账** 等与 `CreateVoucherDto` / 报表 DTO 对齐的字段请使用 **字符串**，如 `"10000.00"`，见 **本文第 3.2 节**、Swagger。

```json
{
  "amount": 10000.00
}
```

---

**文档维护**: 优效营开发团队  
**更新频率**: 随版本更新
