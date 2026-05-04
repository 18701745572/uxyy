# 优效营 API 文档

**版本**: v1.0  
**基础URL**: `http://localhost:3001/api/v1`  
**最后更新**: 2026-05-04

---

## 目录

1. [认证授权 (Auth)](#1-认证授权-auth)
2. [进销存 (Inventory)](#2-进销存-inventory)
3. [财务 (Finance)](#3-财务-finance)
4. [客户关系 (CRM)](#4-客户关系-crm)
5. [智能服务 (AI)](#5-智能服务-ai)

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

### 1.3 刷新 Token

```http
POST /auth/refresh
```

**请求体**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 1.4 修改密码

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

### 3.2 凭证管理

#### 获取凭证列表

```http
GET /finance/vouchers?page=1&pageSize=20
```

#### 创建凭证

```http
POST /finance/vouchers
```

**请求体**:
```json
{
  "voucherDate": "2026-05-04",
  "entries": [
    {
      "subjectId": 1,
      "debit": 10000.00,
      "credit": 0,
      "summary": "收到服务费"
    },
    {
      "subjectId": 2,
      "debit": 0,
      "credit": 10000.00,
      "summary": "主营业务收入"
    }
  ],
  "remark": "5月收入"
}
```

### 3.3 财务报表

#### 资产负债表

```http
GET /finance/reports/balance-sheet?date=2026-05-31
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "date": "2026-05-31",
    "assets": [
      { "subject": "现金", "amount": 100000.00 },
      { "subject": "应收账款", "amount": 50000.00 }
    ],
    "liabilities": [
      { "subject": "应付账款", "amount": 30000.00 }
    ],
    "equity": [
      { "subject": "实收资本", "amount": 100000.00 },
      { "subject": "未分配利润", "amount": 20000.00 }
    ],
    "totalAssets": 150000.00,
    "totalLiabilities": 30000.00,
    "totalEquity": 120000.00
  }
}
```

#### 利润表

```http
GET /finance/reports/income-statement?startDate=2026-05-01&endDate=2026-05-31
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "startDate": "2026-05-01",
    "endDate": "2026-05-31",
    "revenue": 100000.00,
    "cost": 60000.00,
    "grossProfit": 40000.00,
    "expenses": 20000.00,
    "netProfit": 20000.00
  }
}
```

#### 现金流量表

```http
GET /finance/reports/cash-flow?startDate=2026-05-01&endDate=2026-05-31
```

### 3.4 会计科目

#### 获取科目列表

```http
GET /finance/subjects
```

**响应**:
```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "code": "1001",
      "name": "现金",
      "type": "asset",
      "parentId": null
    },
    {
      "id": 2,
      "code": "6001",
      "name": "主营业务收入",
      "type": "revenue",
      "parentId": null
    }
  ]
}
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

### 5.1 OCR 发票识别

#### 提交 OCR 任务

```http
POST /ai/ocr
```

**请求体**:
```json
{
  "imageUrl": "https://example.com/invoice.jpg",
  "enterpriseId": 1
}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "jobId": "job_123456",
    "status": "pending"
  }
}
```

#### 查询 OCR 结果

```http
GET /ai/ocr/:jobId
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "status": "completed",
    "result": {
      "success": true,
      "invoiceType": "增值税专用发票",
      "invoiceCode": "3100123456",
      "invoiceNumber": "12345678",
      "invoiceDate": "2026-05-01",
      "amount": 10000.00,
      "sellerName": "某某科技有限公司",
      "buyerName": "某某企业",
      "items": [
        {
          "name": "服务费",
          "quantity": 1,
          "price": 9433.96,
          "amount": 9433.96
        }
      ]
    }
  }
}
```

### 5.2 智能建议

```http
POST /ai/suggestions
```

**请求体**:
```json
{
  "type": "inventory",
  "enterpriseId": 1
}
```

**类型说明**:
- `inventory` - 库存优化建议
- `finance` - 财务优化建议
- `customer` - 客户管理建议

**响应**:
```json
{
  "code": 200,
  "data": {
    "suggestions": [
      "库存商品A库存量较低，建议及时补货",
      "商品B近30天销量下降20%，建议调整营销策略",
      "发现3个商品存在滞销风险，建议促销处理"
    ]
  }
}
```

### 5.3 智能记账

```http
POST /ai/auto-bookkeeping
```

**请求体**:
```json
{
  "invoiceData": {
    "invoiceType": "增值税专用发票",
    "amount": 10000.00,
    "sellerName": "某某科技有限公司",
    "buyerName": "某某企业"
  }
}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "success": true,
    "voucherData": {
      "entries": [
        {
          "subjectId": 1,
          "debit": 10000.00,
          "credit": 0,
          "summary": "收到发票"
        },
        {
          "subjectId": 2,
          "debit": 0,
          "credit": 10000.00,
          "summary": "应付账款"
        }
      ]
    }
  }
}
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

金额使用数字类型，保留 2 位小数：

```json
{
  "amount": 10000.00
}
```

---

**文档维护**: 优效营开发团队  
**更新频率**: 随版本更新
