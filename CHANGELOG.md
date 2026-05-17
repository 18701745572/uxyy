# Changelog

所有项目的显著变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.2.1] - 2026-05-16

### 新增

#### 工作台 Dashboard
- 新增工作台首页功能 (`/dashboard`)
  - **经营概览**: 显示今日销售额、待处理订单数、库存预警数量
  - **快捷操作**: 新建客户、新建订单、录入发票的快速入口（根据权限显示）
  - **待办事项**: 待审批、待跟进客户、库存预警列表（根据权限显示）
- 新增工作台数据 API (`/dashboard/overview`, `/dashboard/todos`)

### 技术改进
- 新增 `Skeleton` 骨架屏组件
- 新增 `formatCurrency` 货币格式化工具函数

## [1.2.0] - 2026-05-16

### 新增

#### 导入功能
- **库存管理**
  - 产品管理导入功能 (`/dashboard/inventory/products`)
  - 供应商管理导入功能 (`/dashboard/inventory/suppliers`)
  - 销售订单导入功能 (`/dashboard/inventory/sales-orders`)
  - 采购订单导入功能 (`/dashboard/inventory/purchase-orders`)
  - 库存盘点导入功能 (`/dashboard/inventory/stocktaking`)

- **财务管理**
  - 发票管理导入功能 (`/dashboard/finance/invoices`)
  - 财务凭证导入功能 (`/dashboard/finance/vouchers`)

- **CRM**
  - 会员等级导入功能 (`/dashboard/crm/member-levels`)
  - 客户分类导入功能 (`/dashboard/crm/categories`)

- **OA**
  - 员工档案导入功能 (`/dashboard/oa/employee-profiles`)

#### 导出功能
- **库存管理**
  - 产品管理导出功能
  - 供应商管理导出功能
  - 销售订单导出功能
  - 采购订单导出功能
  - 库存盘点导出功能

- **财务管理**
  - 发票管理导出功能
  - 财务凭证导出功能

- **CRM**
  - 会员等级导出功能
  - 客户分类导出功能

- **OA**
  - 员工档案导出功能

#### 统一组件
- 新增 `ImportDialog` 通用导入对话框组件
- 新增 `ExportMenu` 通用导出菜单组件
- 新增 `ImportTemplateDownload` 导入模板下载组件

#### 新页面
- 银行流水管理页面 (`/dashboard/finance/bank-statements`)
  - 支持 CSV 格式银行流水导入
  - 自动匹配生成凭证
  - 批量匹配功能

### 修复

#### API 修复
- 修复销售出库页面 API 路径问题 (`sales-outbound.ts`)
- 修复客户回款页面 API 路径问题 (`payment-records.ts`)
- 修复供应商付款页面 API 路径问题 (`supplier-payments.ts`)

#### UI 修复
- 修复日期选择器在深色主题下的样式问题
  - 月份选择器 (`input[type="month"]`)
  - 日期选择器 (`input[type="date"]`)
  - 日期时间选择器 (`input[type="datetime-local"]`)

### 文档

- 更新深色主题设计系统文档
  - 新增日期/时间输入框规范
  - 补充数字输入框规范

### 技术改进

- 统一所有 API 调用使用 `apiFetch`
- 优化错误处理和认证流程
- 完善类型定义

## [1.1.1] - 2026-05-13

### 修复
- 修复已知问题

## [1.1.0] - 2026-05-10

### 新增
- 初始版本发布
