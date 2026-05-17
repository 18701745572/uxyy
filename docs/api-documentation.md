# 优效营 API 文档

**版本**: v1.0.4
**基础URL**: `http://localhost:3000/api/v1`
**Swagger UI**: `http://localhost:3000/docs`
**最后更新**: 2026-05-17

## 更新说明

### v1.0.4

- **通知中心 - 第二阶段：自动化通知**
  - 新增价格监控定时任务 API，自动检测采购均价波动
  - 新增经营分析定时任务 API，每周自动生成经营洞察
  - 新增 WebSocket 实时推送服务 `/notifications`
  - 新增示例数据生成接口 `POST /oa/notifications/seed-demo`
- **依赖更新**：新增 `@nestjs/schedule`、`@nestjs/websockets`、`@nestjs/platform-socket.io`、`socket.io`

### v1.0.3

- **文档**：与主 PRD **v1.0.3** 对齐——补充 **`GET /auth/permissions`**、细粒度权限码、CRM **`PermissionsGuard`** 与 OA 工作台语义（本人申请 vs 审批待办）。
- CRM、OA 等模块的 **403** 含义：当前企业上下文中 **缺少路由声明的任一所需权限码**（服务端裁决）。

### v1.0.2 新增功能

- **进销存模块**: 回款记录、批次管理、库存盘点、采购建议
- **CRM模块**: AI智能跟进建议、客户洞察
- **AI智能层**: 增强的商机成单预测与客户流失预警

### v1.0.1 新增功能

- **CRM模块**: 会员等级管理、会员积分、AI智能话术推荐
- **进销存模块**: 多仓库管理、商品会员价设置
- **财务模块**: AI智能纠错、凭证错误检测与自动修复、税务申报数据准备
- **OA模块**: 考勤管理、打卡、补卡申请
- **AI智能层**: 商机成单预测、客户流失预警
- **数据导出**: PDF导出（销售单、报价单、对账单）

### v1.0.2（规划中）

- **财务模块**: 一键报税（需对接税务服务商）

---

## 目录

1. [认证授权 (Auth)](#1-认证授权-auth)
2. [进销存 (Inventory)](#2-进销存-inventory)
3. [财务 (Finance)](#3-财务-finance)
4. [客户关系 (CRM)](#4-客户关系-crm)
5. [办公自动化 (OA)](#5-办公自动化-oa)
6. [智能服务 (AI)](#6-智能服务-ai)
7. [数据导出 (Export)](#7-数据导出-export)
8. [附录](#附录)

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

**企业成员管理**（需 **`system:member`**，一般为老板/行政）：`GET` / `POST` / `PATCH` / `DELETE` **`/enterprise/members`**（`PATCH`/`DELETE` 带路径参数 `userId`）；另 **`POST /enterprise/members/invitations`** 生成 **`joinRelativePath`**（例如 `/join?t=…`，前端拼站点根 URL）。`POST`、`PATCH`、`invitations` 的 `role` 仅允许 **`finance`、`sales`、`warehouse`、`oa`**。`POST /enterprise/members` 的 **`phone`** 须为**已在平台注册**。不可通过本组接口变更或移除 **`enterprises.owner_id` 所指企业主**。  
**企业与邀请（链路统一对象 `enterprise_invitations`）**：**`GET /invitations/preview?t=`**（`@Public`）返回脱敏受邀手机、企业名、预设角色（无效邀请统一 `valid:false`）；**已注册用户** **`POST /invitations/accept`**（JWT，Body `invitationToken`）入会并刷新与本企业绑定的会话；**未注册用户** **`POST /auth/register-invite`**（`@Public`，`invitationToken` + `password` + 可选 `nickname`）：手机号仅以邀请为准，不入新建企业链路。令牌仅存 **SHA-256(hash)** ，默认有效期见环境变量 **`ENTERPRISE_INVITE_EXPIRES_DAYS`**（默认 7 天）。  
**未实现**：**企业主转让**（见主 PRD §9.26）。

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

### 1.7 当前企业权限矩阵

```http
GET /auth/permissions
```

需 **Bearer**，租户取自 Access Token 内嵌的 **当前企业**。**响应**（节选）包含：

- **`permissions`**：`string[]`，与后端 `ROLE_PERMISSIONS` 及 JWT 角色推导对齐的 **细粒度权限码**（如 `crm:read`、`oa:approve`、`finance:write` 等）。
- **`canonicalRole`** / **`roleRaw`**：五种规范企业角色之一或其兼容别名。

**用途**：前端工作台侧栏、路由守卫、表单按钮显隐；**不得**作为唯一安全边界——写类接口仍以各 Controller 上 **`PermissionsGuard`** 为准。

**相关错误**：缺权限时接口返回 **403**，body 常含 `缺少权限，需要其一: ...` 类说明。

### 1.8 修改密码

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

### 2.5 多仓库管理

#### 获取仓库列表

```http
GET /inventory/warehouses
```

**响应**:
```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "name": "主仓库",
      "code": "WH001",
      "address": "上海市浦东新区",
      "manager": "张三",
      "isDefault": true,
      "status": "active"
    },
    {
      "id": 2,
      "name": "分仓库",
      "code": "WH002",
      "address": "杭州市西湖区",
      "manager": "李四",
      "isDefault": false,
      "status": "active"
    }
  ]
}
```

#### 创建仓库

```http
POST /inventory/warehouses
```

**请求体**:
```json
{
  "name": "新仓库",
  "code": "WH003",
  "address": "南京市鼓楼区",
  "manager": "王五",
  "phone": "13800138000",
  "isDefault": false
}
```

#### 获取仓库库存汇总

```http
GET /inventory/warehouses/:id/inventory
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "warehouseId": 1,
    "warehouseName": "主仓库",
    "totalProducts": 150,
    "totalValue": 500000.00,
    "lowStockCount": 5,
    "inventoryList": [
      {
        "productId": 1,
        "productName": "iPhone 15",
        "quantity": 50,
        "value": 299950.00
      }
    ]
  }
}
```

#### 设置默认仓库

```http
PUT /inventory/warehouses/:id/default
```

### 2.6 会员价管理

#### 获取商品会员价列表

```http
GET /inventory/member-prices?productId=1
```

**响应**:
```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "productId": 1,
      "productName": "iPhone 15",
      "levelId": 1,
      "levelName": "普通会员",
      "memberPrice": 5699.00,
      "discount": 95
    },
    {
      "id": 2,
      "productId": 1,
      "levelName": "银卡会员",
      "memberPrice": 5399.00,
      "discount": 90
    }
  ]
}
```

#### 设置商品会员价

```http
POST /inventory/member-prices
```

**请求体**:
```json
{
  "productId": 1,
  "levelId": 2,
  "memberPrice": 5399.00,
  "discount": 90
}
```

#### 批量设置会员价

```http
POST /inventory/member-prices/batch
```

**请求体**:
```json
{
  "productIds": [1, 2, 3],
  "levelId": 2,
  "discount": 90
}
```

#### 获取客户专属价格

```http
GET /inventory/member-prices/customer/:customerId
```

### 2.7 回款记录

#### 获取回款记录列表

```http
GET /inventory/payment-records?page=1&pageSize=20&customerId=1&startDate=2026-05-01&endDate=2026-05-31
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "customerId": 1,
        "customerName": "张三",
        "orderId": 1,
        "orderNo": "SO202605010001",
        "amount": "5000.00",
        "paymentMethod": "bank",
        "paymentDate": "2026-05-01T10:00:00Z",
        "referenceNo": " bank's流水号",
        "remark": "货款"
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 20
  }
}
```

#### 创建回款记录

```http
POST /inventory/payment-records
```

**请求体**:
```json
{
  "customerId": 1,
  "orderId": 1,
  "amount": "5000.00",
  "paymentMethod": "bank",
  "referenceNo": " bank's流水号",
  "remark": "货款"
}
```

**`paymentMethod`** 可选值：`cash`（现金）、`bank`（银行转账）、`alipay`（支付宝）、`wechat`（微信）

#### 获取客户回款统计

```http
GET /inventory/payment-records/stats/customer/:customerId
```

#### 获取订单回款统计

```http
GET /inventory/payment-records/stats/order/:orderId
```

### 2.8 批次管理

#### 获取批次列表

```http
GET /inventory/batches?productId=1&status=active&expiryWarning=true&page=1&pageSize=20
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "productId": 1,
        "productName": "iPhone 15",
        "batchNo": "BATCH202605001",
        "productionDate": "2026-05-01T00:00:00Z",
        "expiryDate": "2026-08-01T00:00:00Z",
        "quantity": "100",
        "initialQuantity": "100",
        "costPrice": "4500.00",
        "supplierId": 1,
        "supplierName": "某某供应商",
        "warehouseId": 1,
        "warehouseName": "主仓库",
        "status": "active"
      }
    ],
    "total": 5,
    "page": 1,
    "pageSize": 20
  }
}
```

#### 创建批次

```http
POST /inventory/batches
```

**请求体**:
```json
{
  "productId": 1,
  "batchNo": "BATCH202605001",
  "productionDate": "2026-05-01",
  "expiryDate": "2026-08-01",
  "quantity": "100",
  "costPrice": "4500.00",
  "supplierId": 1,
  "warehouseId": 1
}
```

#### 更新批次

```http
PUT /inventory/batches/:id
```

#### 批次出库

```http
POST /inventory/batches/:id/outbound
```

**请求体**:
```json
{
  "quantity": "10",
  "sourceType": "sales_order",
  "sourceId": 1
}
```

#### 获取临期批次列表

```http
GET /inventory/batches/expiring/list?days=30
```

#### 获取商品批次库存

```http
GET /inventory/batches/product/:productId/stock
```

### 2.9 库存盘点

#### 获取盘点单列表

```http
GET /inventory/stocktaking?page=1&pageSize=20&status=draft
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "warehouseId": 1,
        "warehouseName": "主仓库",
        "status": "draft",
        "remark": "月度盘点",
        "createdBy": 1,
        "createdByName": "张三",
        "confirmedBy": null,
        "confirmedAt": null,
        "createdAt": "2026-05-01T10:00:00Z"
      }
    ],
    "total": 5,
    "page": 1,
    "pageSize": 20
  }
}
```

#### 获取盘点单详情

```http
GET /inventory/stocktaking/:id
```

#### 创建盘点单

```http
POST /inventory/stocktaking
```

**请求体**:
```json
{
  "warehouseId": 1,
  "remark": "月度盘点",
  "items": [
    {
      "productId": 1,
      "bookQty": "100"
    },
    {
      "productId": 2,
      "bookQty": "50"
    }
  ]
}
```

#### 更新盘点明细（实盘数量）

```http
PATCH /inventory/stocktaking/:orderId/items/:itemId
```

**请求体**:
```json
{
  "actualQty": "98",
  "remark": "破损2件"
}
```

#### 确认盘点（差异自动调库）

```http
PUT /inventory/stocktaking/:id/confirm
```

### 2.10 采购建议

#### 获取智能采购建议

```http
GET /inventory/purchase-suggestions
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "suggestions": [
      {
        "productId": 1,
        "productName": "iPhone 15",
        "currentStock": 5,
        "minStock": 10,
        "suggestedQty": 20,
        "reason": "库存低于最小库存预警线"
      }
    ],
    "generatedAt": "2026-05-08T10:00:00Z"
  }
}
```

#### 获取库存预警

```http
GET /inventory/purchase-suggestions/stock-alerts
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
        "minStock": 10,
        "warehouseName": "主仓库"
      }
    ],
    "outOfStock": [],
    "expiringSoon": [
      {
        "productId": 2,
        "productName": "食品A",
        "currentStock": 20,
        "expiryDate": "2026-05-15",
        "warehouseName": "主仓库"
      }
    ]
  }
}
```

#### 生成采购订单建议

```http
GET /inventory/purchase-suggestions/order-suggestion?supplierId=1
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

### 3.4 AI智能纠错

#### 检测单个凭证错误

```http
GET /finance/ai-error-correction/check/:voucherId
```

**响应**:
```json
{
  "voucherId": 1,
  "hasErrors": true,
  "errors": [
    {
      "type": "amount_mismatch",
      "severity": "error",
      "message": "借贷金额不平衡",
      "details": "借方金额 10000.00 ≠ 贷方金额 9000.00"
    }
  ],
  "suggestions": [
    {
      "type": "auto_fix",
      "description": "自动调整贷方金额为 10000.00",
      "action": "修改贷方金额"
    }
  ]
}
```

#### 批量检测凭证

```http
GET /finance/ai-error-correction/batch-check?startDate=2026-05-01&endDate=2026-05-31
```

#### 获取纠错建议

```http
GET /finance/ai-error-correction/suggestions/:voucherId
```

#### 自动修复借贷不平衡

```http
POST /finance/ai-error-correction/auto-fix/:voucherId
```

**响应**:
```json
{
  "success": true,
  "message": "已自动修复借贷不平衡",
  "voucher": {
    "id": 1,
    "voucherNo": "V202605060001",
    "amount": "10000.00"
  }
}
```

#### 获取财务健康度报告

```http
GET /finance/ai-error-correction/health-report?month=2026-05
```

**响应**:
```json
{
  "month": "2026-05",
  "totalVouchers": 100,
  "errorVouchers": 5,
  "errorRate": 5,
  "healthScore": 95,
  "commonErrors": [
    {
      "type": "amount_mismatch",
      "count": 3,
      "percentage": 60
    }
  ],
  "trend": "improving",
  "suggestions": [
    "建议加强凭证审核流程",
    "定期检查借贷平衡"
  ]
}
```

### 3.5 税务申报（V1.5阶段）

#### 获取税务申报汇总

```http
GET /finance/tax-report/summary?period=2026-05
```

**响应**:
```json
{
  "enterpriseId": 1,
  "period": "2026-05",
  "taxTypes": [
    {
      "type": "增值税",
      "code": "10100",
      "amount": 8500.00
    },
    {
      "type": "企业所得税",
      "code": "10200",
      "amount": 3500.00
    }
  ],
  "totalTaxableIncome": 100000.00,
  "totalTaxPayable": 12000.00,
  "generatedAt": "2026-05-08T10:00:00Z"
}
```

#### 获取增值税申报数据

```http
GET /finance/tax-report/vat?period=2026-05
```

**响应**:
```json
{
  "period": "2026-05",
  "salesAmount": 50000.00,
  "salesTax": 6500.00,
  "purchaseAmount": 30000.00,
  "purchaseTax": 3900.00,
  "inputTax": 3900.00,
  "outputTax": 6500.00,
  "netVAT": 2600.00,
  "smallScaleRate": 0.03,
  "details": {
    "taxableSales": 50000.00,
    "taxExemptSales": 0,
    "zeroRateSales": 0
  }
}
```

#### 获取企业所得税申报数据

```http
GET /finance/tax-report/income-tax?period=2026-05
```

**响应**:
```json
{
  "period": "2026-05",
  "revenue": 80000.00,
  "costs": 45000.00,
  "expenses": 15000.00,
  "profitBeforeTax": 20000.00,
  "deductibleExpenses": 3000.00,
  "taxableIncome": 17000.00,
  "incomeTaxRate": 0.05,
  "incomeTaxPayable": 850.00
}
```

#### 获取税务申报操作指南

```http
GET /finance/tax-report/guides
```

**响应**:
```json
[
  {
    "taxType": "增值税",
    "taxTypeCode": "10100",
    "filingPeriod": "月报/季报",
    "deadline": "每月15日（节假日顺延）",
    "applicableEnterprises": "所有增值税纳税人",
    "requiredDocuments": [
      "增值税纳税申报表",
      "发票汇总表",
      "进项税额抵扣清单"
    ],
    "steps": [
      "登录电子税务局",
      "选择「增值税及附加税费申报」",
      "核对销项税额数据",
      "核对进项税额数据",
      "确认应纳税额",
      "提交申报"
    ],
    "notes": [
      "小规模纳税人季度销售额≤30万免征增值税",
      "一般纳税人进项发票需在勾选平台认证",
      "注意检查发票品目与税率是否匹配"
    ]
  }
]
```

#### 获取可申报税款所属期

```http
GET /finance/tax-report/periods
```

**响应**:
```json
{
  "periods": ["2026-05", "2026-04", "2026-03"],
  "current": "2026-05",
  "quarterly": ["2026Q1", "2026Q2", "2026Q3", "2026Q4"]
}
```

#### 导出税务申报Excel

```http
GET /finance/tax-report/export/excel?period=2026-05&taxType=增值税
```

**响应**: 下载Excel文件

#### 导出税务申报PDF（含操作指南）

```http
GET /finance/tax-report/export/pdf?period=2026-05
```

**响应**: 下载HTML/PDF文件（包含完整申报数据和操作指南）

---

### 3.6 会计科目（account-subjects）

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

**权限（服务端）**：`/crm/**` 及报价、会员、AI 话术/跟进等子路径已按 **`crm:read` / `crm:write` / `crm:delete`** 做方法级校验（含 **GET/POST/PATCH/DELETE**）；缺权返回 **403**。详见主 PRD **§9.7.1**、**§15.2.1**。

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

### 4.4 会员管理

#### 获取会员等级列表

```http
GET /crm/members/levels
```

**响应**:
```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "name": "普通会员",
      "level": 1,
      "discount": 95,
      "minPoints": 0,
      "maxPoints": 999
    },
    {
      "id": 2,
      "name": "银卡会员",
      "level": 2,
      "discount": 90,
      "minPoints": 1000,
      "maxPoints": 4999
    }
  ]
}
```

#### 创建会员等级

```http
POST /crm/members/levels
```

**请求体**:
```json
{
  "name": "金卡会员",
  "level": 3,
  "discount": 85,
  "minPoints": 5000,
  "maxPoints": 19999,
  "benefits": ["专属客服", "生日礼品"]
}
```

#### 获取会员列表

```http
GET /crm/members?levelId=1&keyword=张三
```

**响应**:
```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "customerId": 1,
      "customerName": "张三",
      "levelId": 2,
      "levelName": "银卡会员",
      "points": 1500,
      "totalPoints": 3000,
      "joinDate": "2026-01-01"
    }
  ]
}
```

#### 为客户开通会员

```http
POST /crm/members
```

**请求体**:
```json
{
  "customerId": 1,
  "levelId": 2,
  "initialPoints": 100
}
```

#### 积分操作

```http
POST /crm/members/customer/:customerId/points
```

**请求体**:
```json
{
  "operation": "add",
  "points": 100,
  "reason": "消费奖励"
}
```

**说明**: `operation` 可选 `add`（增加）、`deduct`（扣减）。

### 4.5 AI智能话术

#### 根据场景生成话术

```http
GET /crm/ai-scripts/generate/:customerId?scene=first_contact
```

**场景类型**:
- `first_contact` - 首次接触
- `follow_up` - 跟进回访
- `quotation` - 报价沟通
- `negotiation` - 谈判协商
- `closing` - 促成成交
- `after_sales` - 售后服务
- `holiday_greeting` - 节日问候
- `birthday_greeting` - 生日祝福

**响应**:
```json
{
  "code": 200,
  "data": {
    "customerId": 1,
    "customerName": "张三",
    "scene": "first_contact",
    "script": "张总您好，我是优效营的小李...",
    "keyPoints": ["自我介绍", "了解需求", "预约拜访"],
    "followUpTips": ["记录客户反馈", "24小时内发送资料"]
  }
}
```

#### 智能推荐话术

```http
GET /crm/ai-scripts/recommend/:customerId
```

根据客户状态自动推荐最合适的话术场景。

#### 获取话术模板库

```http
GET /crm/ai-scripts/templates?category=sales
```

### 4.6 AI智能跟进

#### 获取客户跟进建议

```http
GET /crm/ai-followup/suggestions/:customerId
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "customerId": 1,
    "customerName": "张三",
    "suggestions": [
      {
        "type": "电话回访",
        "priority": "high",
        "reason": "超过30天未跟进",
        "suggestedContent": "张总您好，想了解一下之前项目的进展..."
      }
    ],
    "nextFollowUpDate": "2026-05-10",
    "generatedAt": "2026-05-08T10:00:00Z"
  }
}
```

#### 获取客户洞察报告

```http
GET /crm/ai-followup/insight/:customerId
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "customerId": 1,
    "customerName": "张三",
    "overview": {
      "totalOrders": 15,
      "totalAmount": "150000.00",
      "avgOrderAmount": "10000.00",
      "lastOrderDate": "2026-04-01",
      "favoriteProducts": ["iPhone 15", "MacBook Pro"]
    },
    "behaviorAnalysis": {
      "purchaseFrequency": "monthly",
      "preferredPaymentMethod": "bank",
      "priceSensitivity": "medium"
    },
    "riskIndicators": {
      "churnRisk": "medium",
      "daysSinceLastContact": 35
    },
    "recommendations": [
      "建议发送新品推荐",
      "可考虑专属折扣激活"
    ]
  }
}
```

#### 获取需要跟进的客户列表

```http
GET /crm/ai-followup/need-followup?days=30&limit=20
```

**响应**:
```json
{
  "code": 200,
  "data": [
    {
      "customerId": 1,
      "customerName": "张三",
      "lastFollowUpDate": "2026-04-01",
      "daysSinceLastFollowUp": 35,
      "suggestedAction": "电话回访",
      "priority": "high"
    },
    {
      "customerId": 2,
      "customerName": "李四",
      "lastFollowUpDate": "2026-03-15",
      "daysSinceLastFollowUp": 52,
      "suggestedAction": "上门拜访",
      "priority": "urgent"
    }
  ]
}
```

#### 生成跟进话术

```http
GET /crm/ai-followup/script/:customerId?context=电话回访
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "customerId": 1,
    "customerName": "张三",
    "script": "张总您好，我是优效营的小李。距离上次联系已经有一段时间了，想了解一下您之前关注的产品是否有新的需求...",
    "keyPoints": [
      "礼貌问候",
      "提及之前沟通内容",
      "了解当前需求",
      "预约下次联系"
    ],
    "opening": "张总您好，我是优效营的小李。",
    "closing": "好的，那先这样，有需要随时联系我，再见！"
  }
}
```

---

## 5. 办公自动化 (OA)

**权限**：流程配置、通讯录维护等需 **`oa:manage`**；请假/报销列表与提交在具备 **`oa:read`** 等企业成员能力下可用；**审批实例操作、补卡审批** 等需 **`oa:approve`**。具体以各 Controller 与 OpenAPI 为准。

### 5.1 考勤管理

#### 打卡

```http
POST /oa/attendance/check-in
```

**请求体**:
```json
{
  "type": "in",
  "location": "上海市浦东新区"
}
```

**说明**: `type` 为 `in` 表示上班打卡，`out` 表示下班打卡。

#### 获取个人考勤记录

```http
GET /oa/attendance/personal?startDate=2026-05-01&endDate=2026-05-31
```

**响应**:
```json
{
  "records": [
    {
      "id": 1,
      "date": "2026-05-01",
      "checkInTime": "09:00:00",
      "checkOutTime": "18:00:00",
      "status": "normal",
      "location": "上海市浦东新区"
    }
  ],
  "statistics": {
    "totalDays": 22,
    "normalDays": 20,
    "lateDays": 1,
    "earlyLeaveDays": 1,
    "absentDays": 0
  }
}
```

#### 获取部门考勤统计

```http
GET /oa/attendance/department/:departmentId?month=2026-05
```

#### 获取企业考勤概览

```http
GET /oa/attendance/overview?date=2026-05-01
```

#### 补卡申请

```http
POST /oa/attendance/make-up
```

**请求体**:
```json
{
  "date": "2026-05-01",
  "type": "in",
  "reason": "忘记打卡"
}
```

#### 审批补卡申请

```http
PUT /oa/attendance/make-up/:requestId/approve
```

**请求体**:
```json
{
  "approved": true,
  "remark": "同意补卡"
}
```

### 5.2 审批流程

#### 获取待审批列表

```http
GET /oa/approval-flows/pending
```

#### 提交审批

```http
POST /oa/approval-flows/:id/submit
```

**请求体**:
```json
{
  "data": {
    "startDate": "2026-05-01",
    "endDate": "2026-05-03",
    "reason": "事假"
  }
}
```

### 5.3 通知中心

**权限**：查看通知需登录；管理通知设置需 **`oa:manage`**。

#### 获取通知列表

```http
GET /oa/notifications?page=1&pageSize=20&type=price_alert&isRead=false
```

**查询参数**:
- `page`: 页码，默认 1
- `pageSize`: 每页数量，默认 20
- `type`: 通知类型（可选）`approval` | `system` | `reminder` | `price_alert` | `insight`
- `isRead`: 是否已读（可选）`true` | `false`

**响应**:
```json
{
  "list": [
    {
      "id": 1,
      "type": "price_alert",
      "title": "上涨预警：示例商品 SKU-001",
      "content": "监测到「示例商品 SKU-001」本期采购均价较上期上升约 18.5%，超过企业设定提醒线 15%...",
      "priority": "high",
      "isRead": false,
      "sourceType": "product",
      "sourceId": 1,
      "actionUrl": "/dashboard/inventory",
      "createdAt": "2026-05-17T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

#### 获取未读通知数量

```http
GET /oa/notifications/unread-count
```

**响应**:
```json
{
  "count": 5
}
```

#### 标记通知为已读

```http
PUT /oa/notifications/:id/read
```

#### 标记所有通知为已读

```http
PUT /oa/notifications/read-all
```

#### 删除通知

```http
DELETE /oa/notifications/:id
```

#### 生成示例通知数据

```http
POST /oa/notifications/seed-demo
```

**说明**: 仅在开发环境可用，用于生成价格预警、系统欢迎、经营洞察等示例通知。

**响应**:
```json
{
  "ok": true,
  "message": "示例通知已生成"
}
```

#### WebSocket 实时推送

**连接地址**: `ws://localhost:3000/notifications`

**事件**:
- `join`: 用户加入通知房间
  ```json
  { "userId": 1, "token": "<jwt_token>" }
  ```
- `new_notification`: 收到新通知
- `unread_count`: 未读数量更新
- `system_notification`: 系统广播通知

---

## 6. 智能服务 (AI)

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

### 6.4 智能建议（同步便捷接口）

```http
GET /ai/suggestions?type=finance
```

**查询参数 `type`**：`inventory` | `finance` | `customer`。服务端会先创建一条异步任务记录，再 **同步调用 LLM** 返回 `{ "task": { … }, "suggestions": [ "字符串", … ] }`（条目数可能因模型输出而异）。

### 6.5 AI预测服务

#### 商机成单预测

```http
GET /ai/predictions/opportunity/:opportunityId
```

**响应**:
```json
{
  "opportunityId": 1,
  "customerName": "张三",
  "opportunityName": "企业软件项目",
  "currentStage": "proposal",
  "estimatedAmount": "500000.00",
  "winProbability": 75,
  "expectedCloseDate": "2026-06-30",
  "predictionFactors": [
    {
      "name": "跟进频率",
      "impact": "positive",
      "weight": 0.3,
      "description": "近7天有3次跟进记录"
    }
  ],
  "recommendedActions": [
    "建议本周内发送正式报价单",
    "邀请客户参观案例客户"
  ],
  "riskLevel": "medium"
}
```

#### 批量预测商机

```http
GET /ai/predictions/opportunities?stage=proposal
```

#### 获取销售漏斗预测

```http
GET /ai/predictions/sales-funnel
```

#### 客户流失预警

```http
GET /ai/predictions/churn/:customerId
```

**响应**:
```json
{
  "customerId": 1,
  "customerName": "张三",
  "churnRisk": "high",
  "churnProbability": 85,
  "riskFactors": [
    {
      "factor": "长时间未下单",
      "impact": "high",
      "description": "超过90天未产生新订单"
    }
  ],
  "recommendedActions": [
    "立即电话回访了解客户需求",
    "提供专属优惠活动"
  ],
  "lastOrderDate": "2026-02-01",
  "totalOrders": 10,
  "totalAmount": "50000.00"
}
```

#### 批量预测客户流失

```http
GET /ai/predictions/churn?riskLevel=high
```

#### 获取流失风险统计

```http
GET /ai/predictions/churn-stats
```

---

## 7. 数据导出 (Export)

### 7.1 PDF导出

#### 导出销售订单PDF

```http
GET /export/pdf/sales-order/:orderId
```

**响应**: 返回HTML文件（可直接打印或转换为PDF）

#### 导出报价单PDF

```http
GET /export/pdf/quotation/:quotationId
```

#### 导出对账单PDF

```http
GET /export/pdf/statement/:customerId?startDate=2026-05-01&endDate=2026-05-31
```

### 7.2 Excel/CSV导出

```http
GET /export/excel/customers
GET /export/excel/products
GET /export/excel/orders
GET /export/csv/inventory
```

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
