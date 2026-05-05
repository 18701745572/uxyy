# Inventory 域对外契约

> 维护方：Agent-Inventory | 更新日期：2026-05-05

## 1. 与 CRM 的客户引用

| 引用点 | Inventory 表.列 | CRM 表.列 | 语义 |
|--------|----------------|----------|------|
| 销售订单关联客户 | `sales_orders.customer_id` | `customers.id` | 只读外键，Inventory 不修改 CRM 表 |
| 销售订单列表筛选 | `GET /sales-orders?customerId=N` | — | 按客户筛选订单 |

**约束**：
- `sales_orders.customer_id` 有 FK 约束 `REFERENCES customers(id)`
- Inventory 模块不 import CRM 模块源码，仅通过 Drizzle schema 引用 `customers` 表定义
- 删除客户前 CRM 需校验 `sales_orders` 中无关联记录（或由 FK 阻止）

## 2. 与 Finance 的单据映射

### 2.1 销售订单 → 财务凭证

| Finance 需要 | Inventory 来源 | 触发时机 |
|-------------|---------------|---------|
| 单据类型 = `sales_order` | `sales_orders` 表 | 销售出库完成后 (`status='completed'`) |
| 单据金额 | `sales_orders.payable_amount` | — |
| 折扣金额 | `sales_orders.discount_amount` | — |
| 客户 ID | `sales_orders.customer_id` | — |
| 单据日期 | `sales_orders.created_at` / `completed_at` | — |
| 商品明细 | `sales_order_items` (productId, quantity, unitPrice, amount) | — |

### 2.2 采购订单 → 财务凭证

| Finance 需要 | Inventory 来源 | 触发时机 |
|-------------|---------------|---------|
| 单据类型 = `purchase_order` | `purchase_orders` 表 | 采购入库完成后 (`status='completed'`) |
| 单据金额 | `purchase_orders.total_amount` | — |
| 供应商 ID | `purchase_orders.supplier_id` | — |
| 单据日期 | `purchase_orders.created_at` / `completed_at` | — |
| 商品明细 | `purchase_order_items` (productId, quantity, unitPrice, amount) | — |

### 2.3 库存盘点 → 财务凭证

| Finance 需要 | Inventory 来源 | 触发时机 |
|-------------|---------------|---------|
| 单据类型 = `stocktaking` | `stocktaking_orders` 表 | 盘点确认后 (`status='confirmed'`) |
| 盘盈/盘亏金额 | `stocktaking_items.diff_qty × products.cost_price` | — |
| 盘点日期 | `stocktaking_orders.confirmed_at` | — |

## 3. 共享约定

### 3.1 租户隔离
所有 Inventory 表均包含 `enterprise_id`，所有查询必须带租户条件。

### 3.2 金额精度
所有金额字段使用 `DECIMAL(12, 2)`，与 Finance 对齐。

### 3.3 订单状态枚举
```text
draft → pending → approved → completed
  ↓        ↓          ↓
  └────────┴──────────┴──→ cancelled
```
Finance 仅在 `completed` 状态订单上触发入账。

### 3.4 库存变更类型 (`inventory_logs.type`)
| 值 | 含义 | source_type |
|----|------|------------|
| `in` | 入库 | `purchase_order` / `adjust` |
| `out` | 出库 | `sales_order` / `adjust` |
| `adjust` | 手动调整 | `adjust` |
| `check` | 盘点差异 | `stocktaking` |

## 4. 表所有权

| 表 | Owner | 其他域权限 |
|----|-------|----------|
| `products` | Inventory | Finance 可读（成本价、单价） |
| `sales_orders` + `sales_order_items` | Inventory | Finance 只读 |
| `purchase_orders` + `purchase_order_items` | Inventory | Finance 只读 |
| `inventory` + `inventory_logs` | Inventory | Finance 只读 |
| `stocktaking_orders` + `stocktaking_items` | Inventory | Finance 只读 |
| `suppliers` | Inventory | — |
| `product_categories` | Inventory | — |
| `customers` | CRM | Inventory 只读引用 |
