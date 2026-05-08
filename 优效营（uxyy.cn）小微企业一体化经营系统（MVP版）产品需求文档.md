# 优效营（[uxyy.cn](https://uxyy.cn)）小微企业一体化经营系统（MVP 版）产品需求文档

> 优效营 - uxyy.cn 小微企业一体化经营系统

## 版本更新记录

### v1.0.1（2026-05-07）

**新增功能**：
- ✅ **CRM模块**：会员等级管理、会员积分、AI智能话术推荐、商机成单预测、客户流失预警
- ✅ **进销存模块**：多仓库管理、商品会员价设置、智能采购建议
- ✅ **财务模块**：AI智能纠错、凭证错误检测与自动修复、财务健康度报告、**税务申报数据准备**
- ✅ **OA模块**：考勤管理、打卡、补卡申请、部门考勤统计
- ✅ **AI智能层**：商机成单预测、客户流失预警、AI智能话术
- ✅ **数据导出**：PDF导出（销售单、报价单、对账单）

**优化改进**：
- 优化了系统性能和用户体验
- 完善了数据安全机制
- 增强了AI功能的准确性和实用性

**项目完成率**：96-98%

### v1.0.2（规划中）

**计划功能**：
- 🚧 **财务模块**：一键报税（需对接税务服务商，如航天信息、百望云）
- 🚧 **支付接口**：微信支付、支付宝集成
- 🚧 **企业微信对接**：消息同步、审批推送

**技术方案**：
- 一键报税采用与持牌税务服务商合作模式，避免自建资质
- 报税数据通过API传输，服务商完成税局对接

---

## 一、产品概述

### 1.1 产品定位

**产品名称**：优效营（官网域名：[uxyy.cn](https://uxyy.cn)）

**一句话定位**：优效营是专为 100 人以下小微企业打造的「财务 + 进销存」一体化经营系统，以「极致易用、低价普惠」为核心，通过「通用底座 + 行业插件」的架构，为零售/批发、汽配、餐饮供应链企业提供开箱即用的数字化解决方案。

**核心价值**：解决巨头产品「重、贵、数据不通」的痛点，让小微企业用极低成本实现「优质体验 + 高效经营」的数字化转型。

**产品架构**：

```
优效营产品架构
├─ 通用底座层（所有行业共用）
│   ├─ 财务核心：发票管理、记账凭证、应收应付、报表统计
│   ├─ 进销存核心：商品管理、采购管理、销售管理、库存管理
│   ├─ 基础能力：用户认证、角色权限、数据备份、企业微信对接
│   └─ 数据打通：销售单→库存→财务自动同步，无数据孤岛
│
└─ 行业插件层（可插拔扩展）
    ├─ 零售/批发插件（MVP阶段优先）：会员等级、积分余额、条码管理
    ├─ 汽配行业插件（V1.5阶段）：配件编码、车型适配、VIN识别
    └─ 餐饮供应链插件（V2阶段）：保质期管理、批次追踪、效期预警
```

**技术底座**：Next.js 14（App Router）+ **NestJS（REST，`/api/v1`）** + **Passport JWT**（`@nestjs/passport` + `passport-jwt`，Access / Refresh Token）+ Neon Serverless Postgres + Drizzle ORM + Tailwind CSS + **pnpm workspaces + Turborepo** Monorepo + Redis + **BullMQ**（异步任务），支撑多智能体同仓并行、契约对齐与弹性扩展。

### 1.2 目标用户与画像

**MVP阶段优先服务行业**：零售/批发行业（小微企业数量最多、需求最标准化、行业插件开发成本最低）

**行业扩展路线图**：

| 阶段 | 目标行业 | 选择理由 | 行业专属功能 |
|------|---------|---------|-------------|
| **MVP（Phase 1）** | 零售/批发 | 小微企业占比最高、业务流程标准化、付费意愿明确 | 会员等级、积分余额、条码管理、会员价 |
| **V1.5（Phase 2）** | 汽配行业 | 配件管理复杂、现有SaaS覆盖不足、客单价较高 | 配件编码、车型适配、VIN识别、OE号管理 |
| **V2（Phase 3）** | 餐饮供应链 | 保质期管理刚需、损耗控制痛点强、复购率高 | 保质期追踪、批次管理、效期预警、配送时间窗 |

**用户角色画像**：

| 用户角色       | 核心特征                            | 核心诉求                   | 产品使用场景                       |
| ---------- | ------------------------------- | ---------------------- | ---------------------------- |
| 企业老板 / 创始人 | 关注营收、成本、现金流，非技术背景，追求 “一眼看清经营状况” | 数据实时同步、报表简单直观、操作零学习成本  | 移动端查看经营报表、审批关键流程、接收风险预警      |
| 财务人员       | 负责记账、报税、应收应付管理，需高效完成合规工作        | 自动记账、发票识别、一键报税、数据准确无差错 | PC 端录入发票、生成凭证、导出报表，移动端接收审批提醒 |
| 销售 / 业务人员  | 外出拜访客户、跟进商机、创建订单，需移动办公          | 客户快速建档、跟进记录便捷、订单一键创建   | 移动端管理客户、提交销售单、查看回款状态         |
| 仓管人员       | 负责入库、出库、库存盘点，需实时更新库存数据          | 扫码操作、库存预警、单据快速打印       | 移动端扫码入库 / 出库、查看库存余量、提交盘点单    |
| 行政 / 人事    | 负责日常审批、员工管理，需简化办公流程             | 审批流程灵活、员工信息易维护、通知触达及时  | PC 端配置审批流程，移动端处理请假 / 报销审批    |

### 1.3 核心差异化优势（优效营・五大核心）

1. **优效营・原生一体化**：财务、进销存底层数据打通，无数据孤岛，一次录入全系统共享（如销售单自动同步至库存、财务模块）；

2. **优效营・极致易用**：核心操作≤3 步，移动端优先设计，10 分钟上手，无需专业培训；

3. **优效营・AI 自动化**：MVP阶段聚焦成熟AI技术落地（OCR发票识别准确率≥95%、规则引擎自动记账），减少80%重复操作；

4. **优效营・分层服务**：免费版自助服务、Pro版在线客服+社群、Business版1v1客户成功，服务成本与客单价匹配，可持续经营；

5. **优效营・低价普惠**：基础版永久免费（[uxyy.cn](https://uxyy.cn)注册即可使用），标准版月付 99 元，无隐性成本。

### 1.4 版本与定价体系

**产品版本规划**：

| 维度 | 免费版（Starter） | 标准版（Pro）￥99/月 | 专业版（Business）￥299/月 |
|------|------------------|---------------------|--------------------------|
| **企业数** | 1家企业 | 1家企业 | 最多3家分店/子公司 |
| **用户数** | ≤3人 | ≤10人 | ≤30人 |
| **订单量** | 月累计≤500单 | 不限 | 不限 |
| **财务模块** | 基础记账、简单报表 | 自动凭证、应收应付、完整报表 | 多账套、一键报税（试点城市） |
| **进销存模块** | 商品管理、出入库 | 采购建议、库存预警、批次管理 | 多仓库、智能补货、供应商评级 |
| **CRM模块** | 客户建档、简单跟进 | 商机管理、报价单、回款跟踪 | 客户流失预警、智能话术 |
| **OA模块** | 不可用 | 基础审批、请假报销 | 自定义流程、考勤集成 |
| **AI功能** | OCR发票识别（月限50张） | OCR不限、智能记账、库存预警 | 全量AI功能、商机预测 |
| **数据导出** | 不可导出 | Excel/PDF导出 | API接口、批量导出 |
| **服务支持** | 社区文档与帮助中心 | 在线客服+视频教程+社群 | 1v1客户成功经理+专属支持 |

**付费转化路径设计**：

```
用户注册（免费版）
    ↓
完成新手任务（创建首单、录入发票）→ 赠送7天Pro版体验
    ↓
体验期内触发「效率场景」：
  · 当月订单超500单 → 提示「升级Pro解锁无限订单」
  · 尝试导出报表 → 提示「升级Pro解锁数据导出」
  · 第4个员工加入 → 提示「团队壮大，升级Pro支持10人协作」
    ↓
付费转化（Pro版￥99/月）
    ↓
使用6个月后，触发「增长场景」：
  · 开分店/多仓库 → 推荐Business版
  · 需要API对接电商平台 → 推荐Business版
```

**服务成本核算**：

| 客户层级 | 月ARPU | 服务方式 | 服务成本占比目标 |
|---------|--------|---------|----------------|
| 免费版 | ￥0 | 自助式（文档与社区） | 0% |
| Pro版 | ￥99 | 在线客服（工作日9:00-18:00）+社群 | ≤10% |
| Business版 | ￥299 | 专属客户成功经理+1v1 onboarding | ≤20% |

## 二、核心功能需求（按模块划分）

### 2.1 核心功能架构图



```
优效营（MVP）- uxyy.cn

├─ 前端层（uxyy.cn Web / 微信小程序 / APP）
│   ├─ 优效营·CRM模块（P0）：客户管理、商机跟进、报价管理、回款跟踪
│   ├─ 优效营·进销存模块（P0）：商品管理、采购管理、销售管理、库存管理
│   ├─ 优效营·财务模块（P0）：发票管理、记账凭证、应收应付、报表统计
│   ├─ 优效营·OA模块（P1）：审批流程、请假管理、报销管理、员工通讯录
│   └─ 优效营·AI智能层（P0核心）：OCR发票识别、智能记账、库存预警
│
├─ API网关层（CORS跨域支持 / 统一认证 / 限流）
│
└─ 后端服务层（RESTful API）
    ├─ 基础能力层（P0）：用户认证、角色权限、数据备份、企业微信对接
    ├─ 业务服务层：CRM服务、进销存服务、财务服务、OA服务
    ├─ AI服务层：OCR识别、规则引擎、数据预测
    └─ 数据层：Neon Postgres + Redis缓存
```

### 2.2 基础能力层（P0）

#### 2.2.1 用户认证与授权



* 支持手机号 + 验证码登录、企业微信快捷登录，关联 [uxyy.cn](https://uxyy.cn) 账号体系，一次注册多端通用；

* 预设 5 种角色（老板、财务、销售、仓管、行政），权限默认配置，支持自定义调整；

* 支持多门店 / 多部门数据隔离，员工仅能查看权限范围内的数据；

* 操作日志自动记录（如登录、修改权限、删除数据），日志保存≥6 个月，可通过 [uxyy.cn](https://uxyy.cn) 后台导出审计。

#### 2.2.2 数据安全与备份



* 数据传输采用 HTTPS 加密，敏感数据（如财务信息）存储加密，符合 [uxyy.cn](https://uxyy.cn) 安全合规标准；

* 自动云端备份（每日 1 次），支持手动备份与数据恢复，备份文件可关联企业 [uxyy.cn](https://uxyy.cn) 账号永久存储；

* 支持数据导出（Excel/PDF 格式），满足本地存档需求，导出时需二次验证身份。

#### 2.2.3 第三方对接



* 企业微信 / 微信无缝对接：消息同步、联系人双向打通、审批结果实时推送，支持通过微信小程序快速访问 [uxyy.cn](https://uxyy.cn) 核心功能；

* 支付接口对接：支持微信支付、支付宝，实现订单在线支付，支付记录自动同步至优效营财务模块；

* 税务系统对接：支持对接当地电子税务局，实现一键报税（限试点城市）；

* OCR 接口对接：阿里云 OCR，支持发票自动识别（准确率≥95%），识别结果直接同步至优效营发票管理模块。

### 2.3 优效营・CRM 模块（P0）

#### 2.3.1 客户管理



* 支持手动录入、Excel 导入、企业微信联系人导入客户信息，导入数据自动同步至 [uxyy.cn](https://uxyy.cn) 云端数据库；

* 核心字段：客户名称、联系人、电话、地址、客户类型（个人 / 企业）、行业标签、归属销售；

* 垂直行业扩展：零售行业支持 “会员等级、积分余额”，汽配行业支持 “车型适配”，餐饮供应链支持 “配送地址、收货时间窗”；

* 客户分类管理：支持按 “成交状态、行业、区域” 筛选，快速定位目标客户，筛选结果支持导出至本地。

#### 2.3.2 商机跟进



* 商机状态：潜在→意向→报价→成交→售后，支持自定义状态名称；

* 跟进记录：支持文本、图片、语音、文件上传，自动记录跟进时间与跟进人，跟进记录同步至 [uxyy.cn](https://uxyy.cn) 客户档案；

* AI 智能跟进：基于跟进记录自动生成 “跟进建议”（如 “客户 3 天未回复，建议发送产品案例”）；

* 跟进提醒：支持手动设置提醒时间，系统自动通过 APP + 企业微信 + [uxyy.cn](https://uxyy.cn) 消息中心推送。

#### 2.3.3 报价与回款



* 报价单：支持选择客户、商品，自动带出价格，一键生成 PDF 并发送给客户，报价单可通过 [uxyy.cn](https://uxyy.cn) 分享链接或邮件发送；

* 回款跟踪：关联销售单，记录回款金额、回款方式、回款时间，回款状态实时同步至优效营财务模块；

* 回款预警：逾期未回款自动提醒（老板 + 销售），支持设置预警阈值（如逾期 7 天），提醒信息同步至 [uxyy.cn](https://uxyy.cn) 首页预警栏。

### 2.4 优效营・进销存模块（P0）

#### 2.4.1 商品管理



* 商品建档：支持手动录入、Excel 导入，核心字段：名称、规格、型号、单价、成本价、库存上限 / 下限，建档数据自动同步至 [uxyy.cn](https://uxyy.cn) 库存数据库；

* 垂直行业扩展：零售行业支持 “条码、会员价、折扣率”，汽配行业支持 “配件编码、适配车型”，餐饮供应链支持 “保质期、批次号”；

* 商品分类：支持多级分类（如 “五金→工具→扳手”），便于快速查找；

* 扫码管理：支持商品条码生成与识别，扫码快速查询商品信息，扫码数据实时同步至 [uxyy.cn](https://uxyy.cn) 云端。

#### 2.4.2 采购管理



* 采购单创建：选择供应商、商品、数量、单价，一键生成采购单，支持附件上传（如采购合同），采购单可通过 [uxyy.cn](https://uxyy.cn) 打印或导出；

* 入库操作：支持 “整单入库、部分入库”，仓管扫码确认，自动更新库存，库存变动实时同步至 [uxyy.cn](https://uxyy.cn) 库存报表；

* 供应商管理：关联 CRM 客户模块（供应商为特殊客户类型），记录合作历史与付款状态；

* AI 智能采购：基于销售数据、当前库存，自动生成 “采购建议”（如 “商品 A 库存低于下限，建议采购 100 件”），建议同步至 [uxyy.cn](https://uxyy.cn) 采购模块首页。

#### 2.4.3 销售管理



* 销售单创建：选择客户、商品、数量，自动带出销售价，支持 “自提 / 配送” 方式选择，创建后自动同步至 [uxyy.cn](https://uxyy.cn) 销售报表；

* 出库操作：销售单审核后，仓管扫码出库，自动扣减库存，出库记录实时同步至财务模块；

* 单据管理：支持销售单打印（含条码、二维码）、导出，支持手动修改（需审批），修改记录同步至 [uxyy.cn](https://uxyy.cn) 操作日志；

* 批量操作：支持批量创建销售单、批量导出单据，批量操作结果实时反馈至 [uxyy.cn](https://uxyy.cn) 后台。

#### 2.4.4 库存管理



* 实时库存查询：支持按商品、仓库、分类筛选，显示当前库存、可用库存、占用库存，查询结果同步至 [uxyy.cn](https://uxyy.cn) 库存看板；

* 库存预警：低于下限 / 高于上限自动提醒（仓管 + 老板），支持设置预警阈值，预警信息同步至 [uxyy.cn](https://uxyy.cn) 首页预警栏；

* 库存盘点：支持创建盘点单，扫码盘点，自动生成盘盈 / 盘亏记录，盘点结果可通过 [uxyy.cn](https://uxyy.cn) 导出审计；

* 批次管理（餐饮供应链专属）：支持按批次、效期管理库存，自动提醒临期商品，临期信息同步至 [uxyy.cn](https://uxyy.cn) 库存预警模块。

### 2.5 优效营・财务模块（P0）

#### 2.5.1 发票管理



* 发票录入：支持 OCR 自动识别（增值税专票 / 普票）、手动录入、Excel 导入，录入数据自动同步至 [uxyy.cn](https://uxyy.cn) 财务数据库；

* 发票验证：自动校验发票真伪（对接税务系统），避免假票入账，验证结果同步至 [uxyy.cn](https://uxyy.cn) 发票档案；

* 发票关联：支持关联采购单 / 销售单，自动匹配往来单位；

* 发票归档：按 “已入账、未入账、已作废” 分类管理，支持搜索与导出，归档数据永久存储于 [uxyy.cn](https://uxyy.cn) 云端。

#### 2.5.2 记账与凭证



* 自动记账：销售单→收入凭证，采购单→支出凭证，无需手动录入，凭证自动同步至 [uxyy.cn](https://uxyy.cn) 凭证库；

* 手动记账：支持财务人员手动创建凭证，选择会计科目、金额、摘要，创建后需审批方可生效；

* 凭证管理：支持凭证查看、修改、删除、打印，关联发票与订单，凭证操作记录同步至 [uxyy.cn](https://uxyy.cn) 操作日志；

* AI 智能纠错：自动识别凭证错误（如科目选错、金额不匹配），推送修正建议，建议同步至 [uxyy.cn](https://uxyy.cn) 财务模块首页。

#### 2.5.3 应收应付



* 应收账款：自动汇总客户欠款金额、逾期时间，支持按客户、逾期天数筛选，筛选结果同步至 [uxyy.cn](https://uxyy.cn) 应收报表；

* 应付账款：自动汇总欠供应商金额、付款期限，支持按供应商筛选，筛选结果同步至 [uxyy.cn](https://uxyy.cn) 应付报表；

* 对账功能：支持与客户 / 供应商对账，生成对账明细，一键发送至客户 / 供应商邮箱或 [uxyy.cn](https://uxyy.cn) 分享链接。

#### 2.5.4 报表统计



* 核心报表：营收汇总、支出汇总、利润报表、库存价值报表（默认按日 / 周 / 月统计），报表数据实时同步至 [uxyy.cn](https://uxyy.cn) 报表中心；

* 老板视图：简化版报表，突出核心数据（如本月营收、未回款金额、库存积压 Top5），支持在 [uxyy.cn](https://uxyy.cn) 移动端快速查看；

* 导出功能：支持 Excel/PDF 格式导出，支持自定义统计时间范围，导出文件可关联 [uxyy.cn](https://uxyy.cn) 账号存储。

#### 2.5.5 税务申报（V1.5阶段）

* **税务申报数据准备**：
  - 自动汇总当期发票数据，生成符合税局格式的申报数据
  - 支持增值税、企业所得税、个人所得税、附加税费等多税种申报
  - 自动计算销项税额、进项税额、应纳税额
  - 生成报税数据Excel/PDF文件，用户自行上传至税局

* **增值税申报数据**：
  - 销项税额汇总（销售发票）
  - 进项税额汇总（采购发票）
  - 应纳税额计算（销项-进项）
  - 小规模纳税人/一般纳税人差异化处理

* **企业所得税申报数据**：
  - 营业收入、成本、费用汇总
  - 税前利润计算
  - 可扣除限额计算
  - 应纳税所得额与应纳税额计算

* **报税操作指南**：
  - 各税种申报周期与截止日提示
  - 申报操作步骤说明
  - 注意事项与优惠政策提醒
  - 所需申报材料清单

* **一键报税（V2阶段，需对接税务服务商）**：
  - 对接持牌税务服务商API（如航天信息、百望云）
  - 自动填写申报数据
  - 一键提交至电子税务局
  - 接收申报结果反馈

#### 2.5.6 MVP 财务报表口径说明（资产负债表 / 利润表 / 应收应付 / 现金流量简表）

本节约定 **Phase 1** 与现有数据模型对齐的边界，避免产品与实现脱节；金额为 **含税与否以发票不含税录入约定为准**，**按「已入账凭证 `voucher_entries`」滚动汇总资产负债表与利润表**；**不按「草稿 / 已过账」状态过滤**（系统当前无凭证过账状态时，凡已入库凭证即参与汇总）。

##### 数据源与期间

| 报表 | 数据源 | 期间 / 截止日期 |
|------|--------|-----------------|
| 资产负债表 | 企业「会计科目表」× 截止到 **报表日结束**（含当日）的凭证汇总 | **单独选择「截止日期」**，按科目余额列示 |
| 利润表 | 同期凭证中收入类 / 成本类 / 费用类科目的发生额汇总 | **自然月**：`YYYY-MM` |
| 应收应付明细 | 「已验证、未入账」发票（与销售/采购业务关联语义见下） | 当前账期快照 |
| 现金流量表（简版） | 同期凭证中与 **银行存款、库存现金** 相关的借贷发生额对比 | **自然月** `YYYY-MM`（投资/筹资活动 MVP 占位为 0） |

##### 科目与凭证名称匹配规则（关键）

凭证为 **单行借方科目 + 单行贷方科目 + 金额**（文本科目名）。系统在汇总时：

* **精确匹配**：凭证中的 `借方科目`/`贷方科目` 字符串与 `account_subjects.name` **完全一致**，则记入该科目。
* **子目扩展**：若凭证科目名为 **`{父科目名}-{子目}`**（如 `管理费用-快递费`），则记入 **前缀与 `name` 一致**的父级科目余额 / 发生额。

未匹配名称的凭证行不参与「按科目表」展开的报表但仍存在于凭证库。

##### 资产负债表（MVP）

* 科目范围：取自 **本校套 `account_subjects`**，按大类分为 **资产 / 负债 / 所有者权益**。
* 余额计算：对每个科目按其 **记账方向（借/贷）** 汇总截至截止日的借方累计与贷方累计，得到调整后余额；**不包含**应交税费动态计算等特殊调整（后续迭代）。
* **验收**：在固定种子凭证下，三张类合计与各科目明细之和一致；截止日期变更后早于该日凭证仍参与、晚于不参与。

##### 利润表（MVP）

* **营业收入**：报告期内，贷方记在 **损益类科目中 `category = income`** 的金额合计（可多行）。
* **营业成本**：借方记在 **科目编码为「6401」或科目名为「主营业务成本」**（含「主营业务成本-{子目}」）的发生额汇总。
* **期间费用**：借方记在 **科目 `category = expense` 且不属于前述营业成本口径**。
* **净利润**：营业收入 − 营业成本 − 期间费用合计（小数保留 2 位）。
* **不做**：分部报告、每股收益、上期比较列。

##### 应收应付（MVP）

* **应收账款列表**：发票状态为 **`verified`（已验证）、未入账**（与 `entered` / 核销逻辑后续对齐），且 **业务含义为销售/SaaS** 的发票：**排除**「采购类发票」来源（示例：`source_type = purchase_order` 视为采购）。
* **应付账款列表**：**已验证、未入账** 且 **`source_type = purchase_order`**。
* **账龄**：以 **开票日（无则录入日）→ 当日** 自然日差为「逾期天数」展示；**核销、对账导出、邮箱发送** **纳入 P2**（原版 2.5.3 对账链路保留为未来迭代）。

##### 现金流量表（MVP）

* **经营活动**：**现金流入** = 报告期内凭证 **借方为「银行存款」或「库存现金」** 的金额合计（简化视为收款）；**现金流出** = **贷方为「银行存款」或「库存现金」** 的金额合计；**净流出 = 流入 − 流出**。
* 投资活动、筹资活动 **无充分业务数据前展示空表 / 合计 0**，并在界面注明「简版占位」。
* **不做**：间接法还原、外币折算。

### 2.6 优效营・OA 模块（P1）

#### 2.6.1 审批流程



* 预设流程：采购审批、销售审批、报销审批、请假审批 4 类核心流程，支持通过 [uxyy.cn](https://uxyy.cn) 后台自定义审批人、审批顺序（如 “销售单＞1 万元需老板审批”）；

* 审批操作：支持同意、驳回、加签、转签，支持添加审批意见（文本 + 图片），审批结果实时同步至 [uxyy.cn](https://uxyy.cn) 消息中心；

* 消息提醒：审批单实时推送（APP + 企业微信 + [uxyy.cn](https://uxyy.cn) 站内信），逾期未审批自动催办。

#### 2.6.2 考勤管理

* **打卡功能**：支持上下班打卡，自动记录时间、地点（GPS定位），打卡记录实时同步至 [uxyy.cn](https://uxyy.cn) 考勤数据库；

* **考勤统计**：自动生成个人考勤日历，统计出勤、迟到、早退、缺勤天数，支持按日/周/月查看；

* **部门考勤**：部门负责人可查看部门整体考勤统计，包括出勤率、迟到人次等；

* **补卡申请**：支持忘记打卡后的补卡申请，需填写补卡原因，经上级审批后生效；

* **考勤规则**：支持设置上下班时间、迟到早退阈值、工作日设置等考勤规则。

#### 2.6.3 日常办公

* 请假管理：支持事假、病假、年假申请，自动计算请假天数，关联考勤，请假记录同步至 [uxyy.cn](https://uxyy.cn) 人事档案；

* 报销管理：支持上传报销凭证（OCR 识别金额），选择报销科目，自动关联审批流程，报销结果同步至财务模块；

* 员工通讯录：支持员工信息录入、部门分类，支持手机号一键拨打、企业微信快速联系，通讯录数据同步至 [uxyy.cn](https://uxyy.cn) 组织架构模块。

### 2.7 优效营・AI 智能层

**分阶段落地策略**：

| 阶段 | 功能 | 技术成熟度 | 用户价值 | 实现方式 |
|------|------|-----------|---------|---------|
| **MVP（Phase 1）** | OCR发票识别 | ⭐⭐⭐⭐⭐ 极高 | 减少80%手动录入 | 调用阿里云/腾讯云OCR API，准确率≥95% |
| | 智能自动化记账 | ⭐⭐⭐⭐☆ 高 | 减少重复操作 | 基于业务规则自动匹配科目（销售单→收入、采购单→支出） |
| | 价格异常检测 | ⭐⭐⭐⭐⭐ 极高 | 减少人为错误 | 规则引擎：销售价<成本价即报警 |
| | **AI智能纠错** | ⭐⭐⭐⭐☆ 高 | 自动检测凭证错误 | 规则引擎检测借贷不平衡、科目错误等 |
| | **商机成单预测** | ⭐⭐⭐⭐☆ 高 | 帮助销售聚焦重点 | 基于多因子（跟进频率、客户活跃度等）计算成单概率 |
| | **客户流失预警** | ⭐⭐⭐⭐☆ 高 | 提醒及时跟进 | 基于「未跟进天数+未成交天数+订单频次」的规则+模型 |
| | **AI智能话术推荐** | ⭐⭐⭐⭐☆ 高 | 提升销售转化率 | 基于客户状态匹配8大场景话术模板 |
| **V1.5（Phase 2）** | 库存智能预警 | ⭐⭐⭐⭐☆ 高 | 避免断货/积压 | 基于历史销量+当前库存的阈值预警 |
| | 临期商品提醒 | ⭐⭐⭐⭐☆ 高 | 减少损耗 | 规则引擎：保质期剩余≤30天自动提醒 |
| | **多仓库管理** | ⭐⭐⭐⭐⭐ 极高 | 支持多门店/仓库 | 仓库CRUD、库存分布、默认仓库设置 |
| | **会员价/折扣** | ⭐⭐⭐⭐⭐ 极高 | 精细化定价 | 按会员等级设置专属价格 |
| **V2（Phase 3）** | 智能采购预测 | ⭐⭐⭐☆☆ 中 | 优化库存资金占用 | 需多维度数据（季节、促销、供应链周期） |
| | 智能库存调拨 | ⭐⭐⭐☆☆ 中 | 优化多仓库存 | 基于销量预测自动建议调拨 |

> **注**：带**粗体**的功能已在v1.0.1版本中实现，从V1.5/V2阶段提前至MVP阶段完成。

#### 2.7.1 智能财务（MVP阶段）

* OCR 发票识别：自动提取发票号码、金额、税率、购销方信息，准确率≥95%，识别结果直接同步至优效营发票管理模块；

* 智能自动化记账：基于业务规则自动匹配会计科目（销售单→收入凭证、采购单→支出凭证），减少 80% 重复录入，财务人员只需审核确认，凭证同步至 [uxyy.cn](https://uxyy.cn) 凭证库；

* **AI智能纠错**：自动检测凭证错误，包括：
  - 借贷不平衡检测
  - 科目错误识别（如收入类科目误用）
  - 金额异常检测（如金额过大/过小）
  - 日期逻辑检测（如未来日期）
  - 提供一键修复功能，自动纠正借贷不平衡等问题
  - 生成财务健康度报告，评估整体账务质量

* 税务风险预警：自动识别税务异常（如进项抵扣异常、发票重复入账），推送预警提示至 [uxyy.cn](https://uxyy.cn) 首页预警栏。

#### 2.7.2 智能进销存（MVP阶段）

* 价格异常检测：识别销售价低于成本价、采购价高于历史均价的异常单据，推送提醒至 [uxyy.cn](https://uxyy.cn) 消息中心；

* 库存阈值预警：基于预设库存上下限，自动提醒补货或清仓，预警信息同步至 [uxyy.cn](https://uxyy.cn) 库存预警模块；

* **智能采购建议**：基于销售趋势、当前库存、安全库存，自动生成采购建议（建议采购量、建议供应商），减少人工计算；

* **多仓库库存分布**：实时展示各仓库库存分布，支持库存调拨建议。

#### 2.7.3 智能CRM（MVP阶段）

* **商机成单预测**：基于多因子算法预测成单概率，包括：
  - 跟进频率（近7天/30天跟进次数）
  - 客户活跃度（邮件打开率、网站访问）
  - 商机阶段停留时间
  - 历史成交数据对比
  - 预测结果：成单概率（0-100%）、风险等级（高/中/低）、行动建议

* **客户流失预警**：多维度评估客户流失风险，包括：
  - 未下单天数（超过90天为高风险）
  - 未跟进天数（超过30天为高风险）
  - 订单频次下降率
  - 客户投诉/退款记录
  - 预警结果：流失风险等级、风险因子、挽留策略建议

* **AI智能话术推荐**：基于客户状态和场景智能推荐沟通话术：
  - 8大场景覆盖：首次接触、跟进回访、报价沟通、谈判协商、促成成交、售后服务、节日问候、生日祝福
  - 根据客户标签（价格敏感、质量关注、服务要求等）匹配话术
  - 提供关键沟通要点和后续跟进建议

#### 2.7.4 智能进销存（V1.5阶段）

* 库存智能预警：基于销售趋势、库存水平，自动预测库存短缺风险，推送补货建议至 [uxyy.cn](https://uxyy.cn) 采购模块；

* 临期商品提醒（餐饮供应链）：自动识别临期商品（如保质期剩余 30 天），按批次优先级推荐出库，提醒同步至 [uxyy.cn](https://uxyy.cn) 库存预警模块；

* **会员价智能推荐**：基于客户等级、历史购买记录，自动应用最优价格策略。

## 三、交互与易用性需求

### 3.1 核心交互原则



1. **极简操作**：核心功能操作步骤≤3 步（如创建销售单：选客户→选商品→提交）；

2. **移动端优先**：80% 核心操作支持移动端完成，PC 端（[uxyy.cn](https://uxyy.cn)）聚焦复杂操作（如报表导出、流程配置）；

3. **减少输入**：支持扫码、语音、选择器等方式，减少手动打字输入；

4. **智能默认**：自动带出常用数据（如创建销售单时默认选择当前登录销售、常用客户）；

5. **错误提示**：输入错误时明确提示原因（如 “库存不足，无法出库”），提供解决方案。

### 3.2 关键交互流程示例

#### 3.2.1 销售单创建流程（移动端）



1. 入口：首页 “创建销售单” 快捷按钮；

2. 步骤 1：选择客户（支持搜索、最近客户快速选择）；

3. 步骤 2：添加商品（扫码 / 搜索选择，输入数量，自动带出单价）；

4. 步骤 3：确认订单信息（自动计算金额），提交；

5. 反馈：提交成功后显示 “销售单创建成功”，并推送审批提醒给对应审批人，同时同步至 [uxyy.cn](https://uxyy.cn) 销售报表。

#### 3.2.2 发票录入流程（PC 端 /[uxyy.cn](https://uxyy.cn)）



1. 入口：财务模块 “发票录入”（[uxyy.cn](https://uxyy.cn) 后台→财务→发票管理）；

2. 步骤 1：上传发票图片（OCR 自动识别信息）；

3. 步骤 2：确认 / 修改识别结果（如金额、税率）；

4. 步骤 3：关联销售单 / 采购单（可选），点击 “入账”；

5. 反馈：入账成功后自动生成凭证，提示 “发票入账成功，凭证号：XXX”，凭证同步至 [uxyy.cn](https://uxyy.cn) 凭证库。

### 3.3 易用性增强功能



* 新手引导：首次登录 [uxyy.cn](https://uxyy.cn) 或 APP，弹出 3 分钟快速上手视频，关键功能提供 “一步一提示”；

* 快捷操作：首页支持自定义快捷按钮（如 “创建销售单”“录入发票”），可通过 [uxyy.cn](https://uxyy.cn) 后台调整；

* 模板复用：支持保存常用订单、报价单模板，下次快速调用，模板同步至 [uxyy.cn](https://uxyy.cn) 云端；

* 离线操作：移动端支持离线创建订单、录入跟进记录，联网后自动同步至 [uxyy.cn](https://uxyy.cn) 云端数据库。

## 四、非功能需求

### 4.1 性能要求



* 页面加载速度：[uxyy.cn](https://uxyy.cn) 首页≤2 秒，列表页（数据≤1000 条）≤1.5 秒，详情页≤1 秒；

* 响应时间：核心操作（提交订单、审批流程）响应时间≤500ms；

* 并发支持：支持 1000 家企业同时通过 [uxyy.cn](https://uxyy.cn) 或 APP 访问，单企业支持 50 人同时操作；

* 数据处理：支持单企业 10 万条订单 / 商品数据，查询无卡顿。

### 4.2 安全要求



* 权限隔离：不同角色仅能访问权限范围内的数据，敏感操作（如删除凭证、修改价格）需二次验证；

* 数据加密：用户密码采用 BCrypt 加密存储，财务数据、客户信息传输与存储加密，符合 [uxyy.cn](https://uxyy.cn) 安全合规标准；

* 防泄漏措施：禁止批量导出客户手机号、财务凭证等敏感数据，操作日志可通过 [uxyy.cn](https://uxyy.cn) 追溯；

* 合规要求：符合《网络安全法》《数据安全法》，财务数据满足税务合规要求，[uxyy.cn](https://uxyy.cn) 服务器备案齐全。

### 4.3 兼容性要求



* 浏览器：支持 Chrome（≥90）、Edge（≥90）、微信浏览器，[uxyy.cn](https://uxyy.cn) 页面自适应不同浏览器；

* 移动端：支持 iOS（≥13）、Android（≥10），适配手机、平板，APP 与 [uxyy.cn](https://uxyy.cn) 数据实时同步；

* 分辨率：PC 端（[uxyy.cn](https://uxyy.cn)）支持≥1366×768，移动端自适应不同屏幕尺寸。

### 4.4 可扩展性要求



* 模块化设计：各功能模块解耦，支持后续独立迭代，迭代内容同步至 [uxyy.cn](https://uxyy.cn) 版本更新日志；

* 接口开放：支持开放 API，便于对接第三方工具（如物流系统、电商平台），API 文档可通过 [uxyy.cn](https://uxyy.cn) 开发者中心查看；

* 行业扩展：支持快速新增垂直行业模板（如后续新增跨境电商行业），新增模板可通过 [uxyy.cn](https://uxyy.cn) 后台一键启用。

## 五、技术实现要求（Next.js + NestJS 全栈 Monorepo）

### 5.1 技术栈明细

**架构模式**：前后端分离、**同仓库 pnpm Monorepo（Turborepo 编排）**；后端提供 RESTful API（`/api/v1/*`），支持 CORS；前后端可独立构建与部署。

| 技术层面 | 选型方案 | 核心优势 |
|---------|---------|---------|
| **Monorepo** | pnpm workspaces + Turborepo | 共享 `@uxyy/shared` 契约包；统一 lint/typecheck/test；适合多 Agent 并行 |
| **前端框架** | Next.js 14（App Router） | SSR/SSG 提升首屏加载性能，支持静态导出部署至 CDN |
| **前端状态管理** | TanStack Query + Zustand | 服务端状态缓存、客户端全局状态管理，API 请求统一封装 |
| **前端样式** | Tailwind CSS + Shadcn/ui | 开发高效、UI 一致性强、响应式适配 |
| **前端部署** | Vercel / 腾讯云 COS | CDN 加速、全球访问、独立迭代前端版本 |
| **后端框架** | **NestJS** + TypeScript | 模块化、`@Module` 对齐智能体边界；内置 DI；与 Swagger、Passport 集成成熟 |
| **数据库** | Neon Serverless Postgres | 零运维、自动扩缩容、数据库分支支持开发 / 测试 / 生产隔离 |
| **ORM 工具** | Drizzle ORM | 类型安全、查询高效、迁移便捷，适配 Neon 特性 |
| **缓存** | Redis (Upstash) | 高频数据缓存、Session 辅助、限流计数、JWT 黑名单等 |
| **异步任务队列** | **BullMQ**（Redis） | 导入导出、报表、AI/OCR 异步管线，削峰填谷 |
| **认证授权** | **Passport JWT**（`@nestjs/passport` + `passport-jwt` + `@nestjs/jwt` 签发） | Access / Refresh；Guards 保护路由；与 Redis 协同刷新与登出失效 |
| **API 文档** | **@nestjs/swagger** + OpenAPI YAML（`docs/api` 定版） | 自动生成 Swagger UI；YAML 可作为契约里程碑 |
| **契约 / 校验** | **Zod（`@uxyy/shared`）** + Nest `class-validator` | DTO / Zod / 文档三位一体，减少并行开发漂移 |
| **后端部署** | 云主机 Docker / Serverless（按阶段选型） | 与 Neon、Redis、队列 Worker 拓扑一致即可 |
| **AI 视觉识别** | 阿里云通义千问 Qwen3-VL-Plus | 发票OCR识别（支持高分辨率文档、多模态理解） |
| **AI 文本推理** | DeepSeek V4-Flash / V4-Pro | 智能凭证生成、经营分析、规则推理（开源、高性价比） |

**前后端分离优势**：

1. **独立迭代**：前端与后端可独立开发、测试、部署，互不影响；
2. **多端复用**：同一套后端 API 支撑 Web、微信小程序、APP 等多端；
3. **跨域支持**：后端统一配置 CORS，允许 [uxyy.cn](https://uxyy.cn) 域名及本地开发环境访问；
4. **技术解耦**：前端团队可专注交互体验，后端团队可专注业务逻辑与数据；
5. **开放扩展**：后续开放 API 给第三方时，无需重构现有架构。

### 5.2 技术架构设计

**整体架构**：

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  uxyy.cn Web │  │  微信小程序  │  │      APP (未来)      │  │
│  │  (Next.js)   │  │  (Taro/uni-app)│  │   (React Native)    │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │                │                    │
          └────────────────┴────────────────────┘
                             │
                    ┌────────┴────────┐
                    │   API 网关层     │
                    │  (CORS / 认证)   │
                    └────────┬────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                        后端服务层                             │
│  ┌─────────────┐  ┌────────┴────────┐  ┌─────────────────┐  │
│  │  认证服务    │  │   业务 API 服务   │  │    AI 服务       │  │
│  │ Passport JWT │  │     (NestJS)      │  │  (OCR/规则引擎)  │  │
│  └─────────────┘  └────────┬────────┘  └─────────────────┘  │
│                            │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  AI 模型层                                               │   │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐  │   │
│  │  │  通义千问 Qwen3-VL │  │    DeepSeek V4-Flash/Pro    │  │   │
│  │  │  (发票OCR识别)     │  │   (凭证生成/经营分析/推理)   │  │   │
│  │  └─────────────────┘  └─────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                   │
│  ┌─────────────────────────┴─────────────────────────────┐   │
│  │                    数据层                               │   │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐  │   │
│  │  │  Neon Postgres  │  │      Redis (Upstash)        │  │   │
│  │  │  (主数据库)      │  │   (缓存 / Session / 限流)    │  │   │
│  │  └─────────────────┘  └─────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

**核心设计要点**：

* **同仓 Monorepo**：前端（`uxyy-web` / `@uxyy/web`）与后端（`uxyy-api` / `@uxyy/api`）、共享包（`uxyy-shared` / `@uxyy/shared`）位于**同一 Git 仓库**；使用 **pnpm + Turborepo** 编排脚本，**构建与 CI 可分端执行，部署仍可前后端分离**；

* **统一 API 规范**：后端提供 RESTful API，遵循 JSON 数据格式，接口版本控制（如 `/api/v1/orders`）；**Swagger 由 Nest `@nestjs/swagger` 生成**，并与 `docs/api` 定版 YAML、**`@uxyy/shared` Zod** 对齐；

* **CORS 跨域支持**：后端统一配置 CORS 白名单，允许以下来源访问：
  * 生产环境：`https://uxyy.cn`、`https://app.uxyy.cn`
  * 微信小程序：`https://servicewechat.com`
  * 本地开发：`http://localhost:3000`、`http://localhost:5173`
  * 预发环境：`https://staging.uxyy.cn`

* **认证机制**：采用 **Passport JWT**（Access Token + Refresh Token）：`passport-jwt` + `JwtStrategy` 校验 Access Token；`AuthGuard('jwt')` 保护业务路由；**`@nestjs/jwt` 负责签发**；请求头 `Authorization: Bearer <accessToken>`；Refresh 流程由独立端点实现；**Redis** 存 Token 黑名单 / 刷新旋转等策略，支持登出即时失效；

* **数据模型设计**：按领域划分 Schema（客户、商品、订单、财务），使用 Drizzle ORM 定义类型安全的数据模型，保障 [uxyy.cn](https://uxyy.cn) 数据一致性；

* **数据库索引**：针对高频查询字段（客户电话、商品条码、订单编号）建立索引，优化 [uxyy.cn](https://uxyy.cn) 查询性能；

* **缓存策略**：使用 Redis 缓存高频访问数据（如商品信息、客户列表、用户权限），减少数据库压力，提升 [uxyy.cn](https://uxyy.cn) 响应速度；

* **异步任务**：**BullMQ** Worker 处理导入导出、大批量报表、AI/OCR 流水线等长任务；备份、轻量定时任务可辅以 Vercel Cron / `node-cron`（按部署拓扑选型），避免阻塞 [uxyy.cn](https://uxyy.cn) HTTP 主链路。

### 5.3 API 设计规范

**接口命名规范**：

| 操作 | HTTP 方法 | URL 示例 | 说明 |
|------|----------|---------|------|
| 查询列表 | GET | `/api/v1/customers` | 支持分页、筛选、排序 |
| 查询详情 | GET | `/api/v1/customers/:id` | 返回单个资源详情 |
| 创建资源 | POST | `/api/v1/customers` | Body 传入 JSON 数据 |
| 更新资源 | PUT/PATCH | `/api/v1/customers/:id` | PUT 全量更新，PATCH 部分更新 |
| 删除资源 | DELETE | `/api/v1/customers/:id` | 软删除（标记 isDeleted） |

**统一响应格式**：

```json
{
  "code": 200,
  "message": "success",
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**错误响应格式**：

```json
{
  "code": 400,
  "message": "请求参数错误",
  "errors": [
    { "field": "customerName", "message": "客户名称不能为空" }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**CORS 配置示例（NestJS `main.ts`，与部署环境变量对齐）：**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const allowedOrigins = [
  'https://uxyy.cn',
  'https://app.uxyy.cn',
  'https://staging.uxyy.cn',
  'http://localhost:3000',
  'http://localhost:5173',
];

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: (origin, cb) =>
      !origin || allowedOrigins.includes(origin)
        ? cb(null, true)
        : cb(new Error('不允许的跨域来源'), false),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
    maxAge: 86400,
  });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

### 5.4 开发规范

**项目结构（pnpm Monorepo + Turborepo，前后端同仓）：**

```
uxyy/                          # 根：pnpm-workspace.yaml、turbo.json、根 package.json
├── uxyy-web/                  # 前端（@uxyy/web，Next.js 14）
│   ├── src/
│   │   ├── api/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── types/
│   ├── .env.development
│   ├── .env.production
│   └── package.json
│
├── uxyy-api/                  # 后端（@uxyy/api，NestJS）
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/           # Passport JWT、用户与会话策略
│   │   │   ├── crm/
│   │   │   ├── inventory/
│   │   │   ├── finance/
│   │   │   └── ai/
│   │   ├── db/                 # Drizzle schema / 数据源封装
│   │   └── main.ts
│   ├── drizzle/
│   ├── test/
│   └── package.json
│
└── uxyy-shared/                # （@uxyy/shared：Zod、常量、推导类型）
    ├── src/schemas/
    ├── src/types/
    ├── src/constants/
    └── package.json
```

**代码规范**：

* 使用 ESLint + Prettier 强制代码风格，TypeScript 严格模式确保类型安全，保障 [uxyy.cn](https://uxyy.cn) 代码质量；
* 前端 API 请求统一封装，自动处理 Token 续期、错误提示、Loading 状态；
* 后端接口遵循 RESTful 规范，参数校验使用 **class-validator（DTO）+ `@uxyy/shared` Zod**（按层选用并保持字段一致），返回统一响应格式。

**版本控制**：

* 采用 Git Flow 工作流，**前后端与 `uxyy-shared` 同仓**；分支命名全局统一；
* 前端分支：`main`（生产）、`develop`（开发）、`feature/*`（功能）、`hotfix/*`（紧急修复）；
* 后端分支：与前端保持一致，版本号同步（如 v1.0.0）。

**测试要求**：

* 前端：核心页面编写组件测试（React Testing Library），API 请求编写 Mock 测试；
* 后端：核心接口单元测试（**Jest** + **Supertest**，通过 `@nestjs/testing` 引导应用），测试覆盖率≥60%；
* 接口契约：前后端通过 Swagger 文档对齐，变更时同步更新。

**文档要求**：

* API 接口文档：Swagger UI 自动生成，部署至 `https://api.uxyy.cn/docs`；
* 数据库模型文档：Drizzle ORM 生成 ER 图；
* 前端组件文档：Storybook 管理公共组件；
* 核心流程文档：同步至 [uxyy.cn](https://uxyy.cn) 内部知识库。

## 六、验收标准

### 6.1 功能验收标准



| 模块    | 验收项     | 通过标准                                                                 |
| ----- | ------- | -------------------------------------------------------------------- |
| CRM   | 客户建档与跟进 | 支持 3 种方式导入客户，跟进记录实时同步至 [uxyy.cn](https://uxyy.cn)，AI 跟进建议准确          |
| 进销存   | 库存管理    | 入库 / 出库后库存实时更新，库存预警及时推送至 [uxyy.cn](https://uxyy.cn) 预警栏，盘点单自动计算盘盈盘亏  |
| 财务    | 自动记账    | 销售单 / 采购单提交后，1 分钟内生成对应凭证，科目匹配正确，凭证同步至 [uxyy.cn](https://uxyy.cn) 凭证库 |
| OA    | 审批流程    | 审批单提交后实时推送，审批人可正常操作，审批结果同步至 [uxyy.cn](https://uxyy.cn) 消息中心          |
| AI 智能 | 发票识别    | 发票识别准确率≥95%，识别后数据可直接入账，无需手动修改，同步至 [uxyy.cn](https://uxyy.cn) 发票档案    |

### 6.2 非功能验收标准



* 性能：[uxyy.cn](https://uxyy.cn) 首页加载时间≤2 秒，核心操作响应时间≤500ms，并发 100 人操作无卡顿；

* 安全：权限隔离有效，敏感数据加密存储，操作日志通过 [uxyy.cn](https://uxyy.cn) 可完整追溯；

* 易用性：新用户 10 分钟内完成 “创建客户→创建销售单→提交审批” 全流程（PC 端 / 移动端均可）；

* 兼容性：在 Chrome、微信浏览器、iOS/Android 手机上功能正常，[uxyy.cn](https://uxyy.cn) 页面无界面错乱。

## 七、项目排期与里程碑

### 7.1 3 个月落地计划（与技术栈适配）



| 阶段         | 时间        | 核心任务                                                                                                               | 产出物                                                                             |
| ---------- | --------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| 需求确认与架构设计  | 第 1-2 周   | 1. 最终确认需求细节；2. 设计数据库模型；3. 搭建 Monorepo（pnpm/Turborepo + NestJS + Passport JWT + Next.js，适配 [uxyy.cn](https://uxyy.cn)）；4. 完成 Drizzle + Neon / Redis / BullMQ 等技术验证；5. AI模型接入验证（通义千问OCR + DeepSeek推理） | 1. 需求确认文档；2. 数据库 Schema；3. 项目初始化模板（含 [uxyy.cn](https://uxyy.cn) 域名配置）；4. 技术验证报告；5. AI接口测试报告 |
| 核心功能开发（P0） | 第 3-7 周   | 1. 基础能力层开发（认证、权限、备份，关联 [uxyy.cn](https://uxyy.cn) 账号体系）；2. CRM + 进销存核心流程开发；3. 财务模块核心功能开发；4. AI 基础能力集成（通义千问OCR发票识别、DeepSeek智能记账） | 1. 可运行的核心功能版本；2. 单元测试用例；3. 开发日志；4. [uxyy.cn](https://uxyy.cn) 测试环境部署            |
| 功能完善与测试    | 第 8-10 周  | 1. OA 模块开发；2. 垂直行业模板适配；3. 第三方接口对接（支付、税务，关联 [uxyy.cn](https://uxyy.cn) 配置）；4. 系统测试与 BUG 修复                          | 1. 完整 MVP 版本；2. 测试报告；3. BUG 修复清单；4. [uxyy.cn](https://uxyy.cn) 预发布环境部署          |
| 种子用户验证与上线  | 第 11-12 周 | 1. 招募 10-20 家种子用户试用（通过 [uxyy.cn](https://uxyy.cn) 注册）；2. 收集反馈并迭代优化；3. 部署 [uxyy.cn](https://uxyy.cn) 正式环境；4. 准备上线文档 | 1. 种子用户反馈报告；2. 正式上线版本（[uxyy.cn](https://uxyy.cn) 可访问）；3. 操作手册；4. 上线报告           |

### 7.2 风险与应对措施



| 风险点                      | 应对措施                                                                    |
| ------------------------ | ----------------------------------------------------------------------- |
| 技术风险：Next.js 与 Neon 适配问题 | 提前进行技术验证，使用成熟 SDK，遇到问题优先社区寻求解决方案，确保 [uxyy.cn](https://uxyy.cn) 稳定运行     |
| AI风险：通义千问/DeepSeek API稳定性 | 1. 实现API降级策略（失败时切换备用模型）；2. 关键OCR场景接入阿里云专用发票识别API兜底；3. 本地缓存识别结果 |
| 需求风险：用户觉得功能太简单           | 明确 MVP 定位，种子用户招募时提前说明，后续通过 [uxyy.cn](https://uxyy.cn) 版本迭代快速响应需求        |
| 进度风险：开发周期延误              | 优先保障 P0 功能，P1 功能可延后迭代，使用低代码组件加速开发，确保 [uxyy.cn](https://uxyy.cn) 按时上线    |
| 质量风险：财务数据准确性问题           | 增加财务流程测试用例，邀请专业财务人员参与测试，核心流程添加二次校验，保障 [uxyy.cn](https://uxyy.cn) 财务数据可靠 |

## 八、核心数据模型设计

### 8.1 实体关系图（ER Diagram）

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │   enterprises   │       │    roles        │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ phone           │◄──────┤ owner_id (FK)   │       │ name            │
│ password_hash   │       │ name            │       │ permissions     │
│ nickname        │       │ industry        │       │ created_at      │
│ avatar          │       │ status          │       └─────────────────┘
│ created_at      │       │ created_at      │              ▲
└─────────────────┘       └─────────────────┘              │
         ▲                          ▲                      │
         │                          │                      │
         │         ┌────────────────┘                      │
         │         │                                       │
         │    ┌────┴────┐                                  │
         └───►│user_roles│◄─────────────────────────────────┘
              ├─────────┤
              │user_id  │
              │role_id  │
              │enterprise_id
              └─────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   customers     │       │    products     │       │   suppliers     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ enterprise_id   │       │ enterprise_id   │       │ enterprise_id   │
│ name            │       │ name            │       │ name            │
│ contact_name    │       │ code            │       │ contact_name    │
│ phone           │       │ category_id     │◄─────┤ phone           │
│ type            │       │ spec            │       │ address         │
│ address         │       │ unit_price      │       │ status          │
│ level           │       │ cost_price      │       │ created_at      │
│ credit_limit    │       │ stock_qty       │       └─────────────────┘
│ created_at      │       │ min_stock       │
└─────────────────┘       │ max_stock       │
         ▲                │ status          │
         │                └─────────────────┘
         │                         ▲
         │                         │
         │                ┌────────┴────────┐
         │                │ product_categories
         │                ├─────────────────┤
         │                │ id (PK)         │
         │                │ enterprise_id   │
         │                │ name            │
         │                │ parent_id       │
         │                └─────────────────┘
         │
         │         ┌─────────────────┐
         └────────►│   sales_orders  │
                   ├─────────────────┤
                   │ id (PK)         │
                   │ enterprise_id   │
                   │ customer_id (FK)│
                   │ order_no        │
                   │ total_amount    │
                   │ status          │
                   │ created_by      │
                   │ created_at      │
                   └─────────────────┘
                            │
                            │
                   ┌────────┴────────┐
                   │ sales_order_items
                   ├─────────────────┤
                   │ id (PK)         │
                   │ order_id (FK)   │
                   │ product_id (FK) │
                   │ quantity        │
                   │ unit_price      │
                   │ amount          │
                   └─────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ purchase_orders │       │   inventory     │       │   invoices      │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ enterprise_id   │       │ enterprise_id   │       │ enterprise_id   │
│ supplier_id     │       │ product_id (FK) │       │ invoice_no      │
│ order_no        │       │ warehouse_id    │       │ type            │
│ total_amount    │       │ quantity        │       │ amount          │
│ status          │       │ batch_no        │       │ tax_rate        │
│ created_at      │       │ expiry_date     │       │ buyer_name      │
└─────────────────┘       │ created_at      │       │ seller_name     │
         │                └─────────────────┘       │ status          │
         │                                           │ created_at      │
         │                                           └─────────────────┘
         │                                                    │
         │                                            ┌───────┘
         │                                            │
         │                                   ┌────────┴────────┐
         │                                   │  voucher_entries  │
         │                                   ├─────────────────┤
         │                                   │ id (PK)         │
         │                                   │ enterprise_id   │
         │                                   │ voucher_no      │
         └──────────────────────────────────►│ source_type     │
                                             │ source_id       │
                                             │ debit_account   │
                                             │ credit_account  │
                                             │ amount          │
                                             │ created_at      │
                                             └─────────────────┘
```

### 8.2 Drizzle ORM Schema 定义

```typescript
// schema.ts - Drizzle ORM 核心表定义

import { 
  pgTable, serial, varchar, integer, decimal, 
  timestamp, boolean, text, jsonb, pgEnum 
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==================== 枚举类型 ====================
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'banned']);
export const enterpriseStatusEnum = pgEnum('enterprise_status', ['active', 'suspended', 'deleted']);
export const orderStatusEnum = pgEnum('order_status', ['draft', 'pending', 'approved', 'completed', 'cancelled']);
export const invoiceTypeEnum = pgEnum('invoice_type', ['special', 'normal', 'electronic']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['unverified', 'verified', 'entered', 'void']);

// ==================== 用户与企业 ====================
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  nickname: varchar('nickname', { length: 50 }),
  avatar: varchar('avatar', { length: 255 }),
  status: userStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const enterprises = pgTable('enterprises', {
  id: serial('id').primaryKey(),
  ownerId: integer('owner_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  industry: varchar('industry', { length: 50 }), // retail, auto_parts, food_supply
  status: enterpriseStatusEnum('status').default('active').notNull(),
  maxUsers: integer('max_users').default(3), // 免费版默认3人
  maxOrdersPerMonth: integer('max_orders_per_month').default(500),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userEnterprises = pgTable('user_enterprises', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  enterpriseId: integer('enterprise_id').references(() => enterprises.id).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // boss, finance, sales, warehouse, admin
  isDefault: boolean('is_default').default(false),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

// ==================== 客户管理 ====================
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id').references(() => enterprises.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  contactName: varchar('contact_name', { length: 50 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 100 }),
  address: text('address'),
  type: varchar('type', { length: 20 }).default('enterprise'), // personal, enterprise
  level: varchar('level', { length: 20 }).default('normal'), // normal, vip
  creditLimit: decimal('credit_limit', { precision: 12, scale: 2 }).default('0'),
  tags: jsonb('tags').default([]),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== 商品管理 ====================
export const productCategories = pgTable('product_categories', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id').references(() => enterprises.id).notNull(),
  name: varchar('name', { length: 50 }).notNull(),
  parentId: integer('parent_id').references(() => productCategories.id),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id').references(() => enterprises.id).notNull(),
  categoryId: integer('category_id').references(() => productCategories.id),
  code: varchar('code', { length: 50 }).notNull(), // 商品编码/条码
  name: varchar('name', { length: 100 }).notNull(),
  spec: varchar('spec', { length: 100 }), // 规格
  unit: varchar('unit', { length: 20 }).default('件'), // 单位
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  costPrice: decimal('cost_price', { precision: 12, scale: 2 }),
  stockQty: decimal('stock_qty', { precision: 12, scale: 2 }).default('0'),
  minStock: decimal('min_stock', { precision: 12, scale: 2 }).default('0'),
  maxStock: decimal('max_stock', { precision: 12, scale: 2 }),
  status: varchar('status', { length: 20 }).default('active'),
  // 行业扩展字段（JSONB灵活存储）
  retailExt: jsonb('retail_ext'), // { memberPrice, discountRate, barcode }
  autoPartsExt: jsonb('auto_parts_ext'), // { partCode, fitModels, vin }
  foodExt: jsonb('food_ext'), // { shelfLife, batchRequired }
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== 销售订单 ====================
export const salesOrders = pgTable('sales_orders', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id').references(() => enterprises.id).notNull(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  orderNo: varchar('order_no', { length: 50 }).notNull().unique(),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0'),
  payableAmount: decimal('payable_amount', { precision: 12, scale: 2 }).notNull(),
  status: orderStatusEnum('status').default('draft').notNull(),
  deliveryType: varchar('delivery_type', { length: 20 }).default('self'), // self, delivery
  remark: text('remark'),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const salesOrderItems = pgTable('sales_order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => salesOrders.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
});

// ==================== 采购订单 ====================
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id').references(() => enterprises.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  contactName: varchar('contact_name', { length: 50 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const purchaseOrders = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id').references(() => enterprises.id).notNull(),
  supplierId: integer('supplier_id').references(() => suppliers.id).notNull(),
  orderNo: varchar('order_no', { length: 50 }).notNull().unique(),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  status: orderStatusEnum('status').default('draft').notNull(),
  remark: text('remark'),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => purchaseOrders.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
});

// ==================== 库存管理 ====================
export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id').references(() => enterprises.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  warehouseId: integer('warehouse_id').default(1), // 默认主仓库
  quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
  batchNo: varchar('batch_no', { length: 50 }), // 批次号
  expiryDate: timestamp('expiry_date'), // 保质期
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const inventoryLogs = pgTable('inventory_logs', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id').references(() => enterprises.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // in, out, adjust,盘点
  quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
  beforeQty: decimal('before_qty', { precision: 12, scale: 2 }).notNull(),
  afterQty: decimal('after_qty', { precision: 12, scale: 2 }).notNull(),
  sourceType: varchar('source_type', { length: 20 }), // sales_order, purchase_order, adjust
  sourceId: integer('source_id'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== 发票管理 ====================
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id').references(() => enterprises.id).notNull(),
  invoiceNo: varchar('invoice_no', { length: 50 }).notNull(),
  invoiceCode: varchar('invoice_code', { length: 20 }),
  type: invoiceTypeEnum('type').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('0'),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  buyerName: varchar('buyer_name', { length: 100 }),
  buyerTaxNo: varchar('buyer_tax_no', { length: 30 }),
  sellerName: varchar('seller_name', { length: 100 }),
  sellerTaxNo: varchar('seller_tax_no', { length: 30 }),
  issueDate: timestamp('issue_date'),
  status: invoiceStatusEnum('status').default('unverified').notNull(),
  ocrData: jsonb('ocr_data'), // OCR识别原始数据
  sourceType: varchar('source_type', { length: 20 }), // sales_order, purchase_order
  sourceId: integer('source_id'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== 财务凭证 ====================
export const voucherEntries = pgTable('voucher_entries', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id').references(() => enterprises.id).notNull(),
  voucherNo: varchar('voucher_no', { length: 50 }).notNull(),
  sourceType: varchar('source_type', { length: 20 }).notNull(), // sales_order, purchase_order, manual
  sourceId: integer('source_id'),
  entryDate: timestamp('entry_date').defaultNow().notNull(),
  debitAccount: varchar('debit_account', { length: 50 }).notNull(),
  creditAccount: varchar('credit_account', { length: 50 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  summary: text('summary'),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== 关系定义 ====================
export const enterprisesRelations = relations(enterprises, ({ one, many }) => ({
  owner: one(users, { fields: [enterprises.ownerId], references: [users.id] }),
  customers: many(customers),
  products: many(products),
  salesOrders: many(salesOrders),
}));

export const salesOrdersRelations = relations(salesOrders, ({ one, many }) => ({
  enterprise: one(enterprises, { fields: [salesOrders.enterpriseId], references: [enterprises.id] }),
  customer: one(customers, { fields: [salesOrders.customerId], references: [customers.id] }),
  items: many(salesOrderItems),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  enterprise: one(enterprises, { fields: [products.enterpriseId], references: [enterprises.id] }),
  category: one(productCategories, { fields: [products.categoryId], references: [productCategories.id] }),
  inventory: many(inventory),
}));
```

### 8.3 关键索引设计

```sql
-- 用户查询优化
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_user_enterprises_user ON user_enterprises(user_id);
CREATE INDEX idx_user_enterprises_enterprise ON user_enterprises(enterprise_id);

-- 订单查询优化（企业隔离 + 时间范围查询）
CREATE INDEX idx_sales_orders_enterprise ON sales_orders(enterprise_id);
CREATE INDEX idx_sales_orders_created_at ON sales_orders(created_at);
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_purchase_orders_enterprise ON purchase_orders(enterprise_id);

-- 商品查询优化
CREATE INDEX idx_products_enterprise ON products(enterprise_id);
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_category ON products(category_id);

-- 库存查询优化
CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_enterprise ON inventory(enterprise_id);

-- 发票查询优化
CREATE INDEX idx_invoices_enterprise ON invoices(enterprise_id);
CREATE INDEX idx_invoices_no ON invoices(invoice_no);
CREATE INDEX idx_invoices_status ON invoices(status);

-- 凭证查询优化
CREATE INDEX idx_vouchers_enterprise ON voucher_entries(enterprise_id);
CREATE INDEX idx_vouchers_source ON voucher_entries(source_type, source_id);
```

## 九、核心API接口清单

### 9.1 接口概览

| 模块 | 接口数量 | 核心功能 |
|------|---------|---------|
| 认证授权 | 5个 | 登录、注册、Token刷新、登出、权限查询 |
| 企业管理 | 4个 | 创建企业、查询企业、更新企业、成员管理 |
| 客户管理 | 5个 | CRUD + 导入导出 |
| 商品管理 | 6个 | CRUD + 分类管理 + 库存查询 |
| 销售订单 | 6个 | 创建、查询、审批、出库、作废 |
| 采购订单 | 5个 | 创建、查询、审批、入库、作废 |
| 库存管理 | 4个 | 查询、盘点、预警、流水 |
| 发票管理 | 5个 | OCR识别、录入、验证、关联、归档 |
| 财务凭证 | 4个 | 自动/手动生成、查询、审核 |
| 报表统计 | 3个 | 营收、利润、库存价值 |

### 9.2 认证授权接口

#### 9.2.1 用户注册

```
POST /api/v1/auth/register
```

**请求参数**：
```json
{
  "phone": "13800138000",
  "password": "a12345678",
  "smsCode": "123456",
  "enterpriseName": "某某商贸有限公司"
}
```

**响应示例**：
```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "userId": 1,
    "enterpriseId": 1,
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 7200
  }
}
```

#### 9.2.2 用户登录

```
POST /api/v1/auth/login
```

**请求参数**：
```json
{
  "phone": "13800138000",
  "password": "a12345678"
}
```

**响应示例**：
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "userId": 1,
    "nickname": "张三",
    "enterprises": [
      {
        "enterpriseId": 1,
        "name": "某某商贸有限公司",
        "role": "boss",
        "isDefault": true
      }
    ],
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 7200
  }
}
```

#### 9.2.3 Token刷新

```
POST /api/v1/auth/refresh
```

**请求头**：
```
Authorization: Bearer <refresh_token>
```

**响应示例**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 7200
  }
}
```

### 9.3 销售订单接口

#### 9.3.1 创建销售订单

```
POST /api/v1/sales-orders
```

**请求参数**：
```json
{
  "customerId": 1,
  "deliveryType": "self",
  "remark": "客户自提",
  "items": [
    {
      "productId": 1,
      "quantity": "10",
      "unitPrice": "99.99"
    },
    {
      "productId": 2,
      "quantity": "5",
      "unitPrice": "199.00"
    }
  ]
}
```

**响应示例**：
```json
{
  "code": 200,
  "message": "销售单创建成功",
  "data": {
    "orderId": 10001,
    "orderNo": "SO202401150001",
    "totalAmount": "1994.90",
    "payableAmount": "1994.90",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### 9.3.2 查询销售订单列表

```
GET /api/v1/sales-orders?page=1&pageSize=20&status=pending&startDate=2024-01-01&endDate=2024-01-31
```

**响应示例**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "orderId": 10001,
        "orderNo": "SO202401150001",
        "customerName": "某某零售店",
        "totalAmount": "1994.90",
        "status": "pending",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 156,
      "totalPages": 8
    }
  }
}
```

#### 9.3.3 销售订单审批

```
PUT /api/v1/sales-orders/{orderId}/approve
```

**请求参数**：
```json
{
  "action": "approve",
  "comment": "同意出库"
}
```

**响应示例**：
```json
{
  "code": 200,
  "message": "审批成功",
  "data": {
    "orderId": 10001,
    "status": "approved",
    "approvedBy": 2,
    "approvedAt": "2024-01-15T11:00:00Z"
  }
}
```

#### 9.3.4 销售订单出库

```
PUT /api/v1/sales-orders/{orderId}/outbound
```

**请求参数**：
```json
{
  "items": [
    {
      "itemId": 1,
      "outboundQty": "10"
    },
    {
      "itemId": 2,
      "outboundQty": "5"
    }
  ]
}
```

**响应示例**：
```json
{
  "code": 200,
  "message": "出库成功",
  "data": {
    "orderId": 10001,
    "status": "completed",
    "inventoryUpdated": true,
    "voucherGenerated": true,
    "voucherNo": "V202401150001"
  }
}
```

### 9.4 发票管理接口

#### 9.4.1 OCR发票识别

```
POST /api/v1/invoices/ocr
```

**请求参数**（multipart/form-data）：
```
file: <发票图片文件>
```

**响应示例**：
```json
{
  "code": 200,
  "message": "识别成功",
  "data": {
    "invoiceNo": "4400123111",
    "invoiceCode": "044001900211",
    "type": "special",
    "amount": "10000.00",
    "taxRate": "13.00",
    "taxAmount": "1300.00",
    "totalAmount": "11300.00",
    "buyerName": "某某商贸有限公司",
    "buyerTaxNo": "91440100MA5xxxxxx",
    "sellerName": "某某供应商有限公司",
    "sellerTaxNo": "91440100MA5xxxxxx",
    "issueDate": "2024-01-10",
    "ocrConfidence": 0.98
  }
}
```

#### 9.4.2 发票入账

```
POST /api/v1/invoices
```

**请求参数**：
```json
{
  "invoiceNo": "4400123111",
  "invoiceCode": "044001900211",
  "type": "special",
  "amount": "10000.00",
  "taxRate": "13.00",
  "taxAmount": "1300.00",
  "totalAmount": "11300.00",
  "buyerName": "某某商贸有限公司",
  "buyerTaxNo": "91440100MA5xxxxxx",
  "sellerName": "某某供应商有限公司",
  "sellerTaxNo": "91440100MA5xxxxxx",
  "issueDate": "2024-01-10",
  "sourceType": "purchase_order",
  "sourceId": 5001
}
```

**响应示例**：
```json
{
  "code": 200,
  "message": "入账成功",
  "data": {
    "invoiceId": 1,
    "status": "entered",
    "voucherNo": "V202401150002",
    "voucherId": 10002
  }
}
```

### 9.5 财务凭证接口

#### 9.5.1 查询凭证列表

```
GET /api/v1/vouchers?page=1&pageSize=20&startDate=2024-01-01&endDate=2024-01-31
```

**响应示例**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "voucherId": 10001,
        "voucherNo": "V202401150001",
        "entryDate": "2024-01-15",
        "sourceType": "sales_order",
        "sourceId": 10001,
        "debitAccount": "银行存款",
        "creditAccount": "主营业务收入",
        "amount": "1994.90",
        "summary": "销售商品收入",
        "createdBy": 1,
        "createdAt": "2024-01-15T10:35:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 89,
      "totalPages": 5
    }
  }
}
```

### 9.6 报表统计接口

#### 9.6.1 经营概览报表

```
GET /api/v1/reports/dashboard?period=month&date=2024-01
```

**响应示例**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "period": "2024-01",
    "salesAmount": "158000.00",
    "salesOrderCount": 156,
    "purchaseAmount": "98000.00",
    "purchaseOrderCount": 89,
    "grossProfit": "60000.00",
    "grossProfitRate": "37.97%",
    "pendingReceivable": "23000.00",
    "pendingPayable": "15000.00",
    "lowStockProducts": [
      { "productId": 1, "productName": "螺丝刀套装", "stockQty": "5", "minStock": "20" }
    ],
    "topSalesProducts": [
      { "productId": 2, "productName": "扳手", "salesQty": "200", "salesAmount": "39800.00" }
    ]
  }
}
```

### 9.7 接口权限矩阵

| 接口 | 老板 | 财务 | 销售 | 仓管 | 行政 |
|------|------|------|------|------|------|
| GET /api/v1/reports/dashboard | ✅ | ✅ | ❌ | ❌ | ❌ |
| POST /api/v1/sales-orders | ✅ | ❌ | ✅ | ❌ | ❌ |
| PUT /api/v1/sales-orders/{id}/approve | ✅ | ❌ | ❌ | ❌ | ❌ |
| PUT /api/v1/sales-orders/{id}/outbound | ✅ | ❌ | ❌ | ✅ | ❌ |
| POST /api/v1/invoices | ✅ | ✅ | ❌ | ❌ | ❌ |
| POST /api/v1/vouchers | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET /api/v1/inventory | ✅ | ✅ | ✅ | ✅ | ❌ |
| PUT /api/v1/inventory/adjust | ✅ | ❌ | ❌ | ✅ | ❌ |

### 9.8 OA 模块接口

#### 9.8.1 审批流程管理

**创建审批流程**
```
POST /api/v1/approval-flows
```

**请求参数**：
```json
{
  "name": "采购审批",
  "type": "purchase",
  "steps": [
    {
      "step": 1,
      "role": "boss",
      "condition": { "amount": { "gte": 10000 } }
    },
    {
      "step": 2,
      "role": "finance",
      "condition": { "amount": { "gte": 50000 } }
    }
  ]
}
```

**响应示例**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "flowId": 1,
    "name": "采购审批",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**提交审批单**
```
POST /api/v1/approvals
```

**请求参数**：
```json
{
  "flowId": 1,
  "businessType": "purchase_order",
  "businessId": 5001,
  "title": "采购单 PO202401150001 审批",
  "remark": "急需补货"
}
```

**响应示例**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "approvalId": 1001,
    "status": "pending",
    "currentStep": 1,
    "submittedAt": "2024-01-15T10:30:00Z"
  }
}
```

**审批操作**
```
PUT /api/v1/approvals/{approvalId}/action
```

**请求参数**：
```json
{
  "action": "approve",
  "comment": "同意采购"
}
```

**响应示例**：
```json
{
  "code": 200,
  "message": "审批成功",
  "data": {
    "approvalId": 1001,
    "status": "approved",
    "approvedBy": 2,
    "approvedAt": "2024-01-15T11:00:00Z",
    "nextStep": null
  }
}
```

#### 9.8.2 请假管理

**提交请假申请**
```
POST /api/v1/leaves
```

**请求参数**：
```json
{
  "type": "annual",
  "startDate": "2024-01-20",
  "endDate": "2024-01-22",
  "days": 3,
  "reason": "年假休息"
}
```

**响应示例**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "leaveId": 2001,
    "status": "pending",
    "submittedAt": "2024-01-15T10:30:00Z"
  }
}
```

**查询请假记录**
```
GET /api/v1/leaves?page=1&pageSize=20&status=pending
```

**响应示例**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "leaveId": 2001,
        "type": "annual",
        "startDate": "2024-01-20",
        "endDate": "2024-01-22",
        "days": 3,
        "status": "approved",
        "approvedBy": 1,
        "approvedAt": "2024-01-15T11:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 5
    }
  }
}
```

#### 9.8.3 报销管理

**提交报销申请**
```
POST /api/v1/expenses
```

**请求参数**：
```json
{
  "type": "travel",
  "amount": "1500.00",
  "date": "2024-01-10",
  "description": "出差广州差旅费",
  "attachments": [
    { "fileName": "ticket.jpg", "url": "https://cdn.uxyy.cn/xxx" }
  ]
}
```

**响应示例**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "expenseId": 3001,
    "status": "pending",
    "submittedAt": "2024-01-15T10:30:00Z"
  }
}
```

**查询报销记录**
```
GET /api/v1/expenses?page=1&pageSize=20&status=pending
```

**响应示例**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "expenseId": 3001,
        "type": "travel",
        "amount": "1500.00",
        "status": "approved",
        "approvedBy": 1,
        "approvedAt": "2024-01-15T11:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 3
    }
  }
}
```

### 9.9 OA 接口权限矩阵

| 接口 | 老板 | 财务 | 销售 | 仓管 | 行政 |
|------|------|------|------|------|------|
| POST /api/v1/approval-flows | ✅ | ❌ | ❌ | ❌ | ✅ |
| POST /api/v1/approvals | ✅ | ✅ | ✅ | ✅ | ✅ |
| PUT /api/v1/approvals/{id}/action | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST /api/v1/leaves | ✅ | ✅ | ✅ | ✅ | ✅ |
| GET /api/v1/leaves | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST /api/v1/expenses | ✅ | ✅ | ✅ | ✅ | ✅ |
| GET /api/v1/expenses | ✅ | ✅ | ✅ | ✅ | ✅ |

## 十、关键业务流程图

### 10.1 销售订单全流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  销售/老板   │     │    老板      │     │    仓管      │     │    财务      │
│  (创建订单)  │     │   (审批)     │     │   (出库)     │     │  (确认回款)  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       ▼                   │                   │                   │
┌─────────────┐            │                   │                   │
│ 1.创建销售单  │            │                   │                   │
│             │            │                   │                   │
│ ·选择客户    │            │                   │                   │
│ ·添加商品    │            │                   │                   │
│ ·确认价格    │            │                   │                   │
│ ·提交订单    │            │                   │                   │
└──────┬──────┘            │                   │                   │
       │                   │                   │                   │
       │ 订单状态: draft   │                   │                   │
       ▼                   │                   │                   │
┌─────────────┐            │                   │                   │
│ 2.保存订单   │            │                   │                   │
│             │            │                   │                   │
│ ·生成订单编号 │            │                   │                   │
│ ·计算总金额   │            │                   │                   │
│ ·校验库存    │            │                   │                   │
└──────┬──────┘            │                   │                   │
       │                   │                   │                   │
       │ 订单状态: pending │                   │                   │
       │ 触发: 审批提醒推送 │                   │                   │
       ▼                   │                   │                   │
       │            ┌─────────────┐            │                   │
       │            │ 3.订单审批    │            │                   │
       │            │             │            │                   │
       │            │ ·查看订单详情 │            │                   │
       │            │ ·核对金额    │            │                   │
       │            │ ·选择:同意/驳回│            │                   │
       │            └──────┬──────┘            │                   │
       │                   │                   │                   │
       │         ┌─────────┴─────────┐        │                   │
       │         ▼                   ▼        │                   │
       │    ┌─────────┐         ┌─────────┐   │                   │
       │    │  同意    │         │  驳回    │   │                   │
       │    └────┬────┘         └────┬────┘   │                   │
       │         │                   │        │                   │
       │ 状态:approved           状态:cancelled                 │
       │         │                   │        │                   │
       │         ▼                   │        │                   │
       │  触发:出库提醒推送          │        │                   │
       │         │                   │        │                   │
       │         │            ┌─────────────┐ │                   │
       │         └───────────►│ 4.商品出库    │ │                   │
       │                      │             │ │                   │
       │                      │ ·扫码/选择商品│ │                   │
       │                      │ ·确认出库数量 │ │                   │
       │                      │ ·扣减库存    │ │                   │
       │                      └──────┬──────┘ │                   │
       │                             │        │                   │
       │                      状态:completed  │                   │
       │                      触发:自动记账    │                   │
       │                             │        │                   │
       │                             ▼        │                   │
       │                      ┌─────────────┐ │                   │
       │                      │ 5.自动记账    │ │                   │
       │                      │             │ │                   │
       │                      │ ·生成收入凭证 │ │                   │
       │                      │ ·关联销售订单 │ │                   │
       │                      │ ·更新应收    │ │                   │
       │                      └──────┬──────┘ │                   │
       │                             │        │                   │
       │                      触发:回款跟踪提醒 │                  │
       │                             │        │                   │
       │                             │  ┌─────────────┐           │
       │                             │  │ 6.回款确认    │           │
       │                             │  │             │           │
       │                             │  │ ·记录回款金额 │           │
       │                             │  │ ·更新应收状态 │           │
       │                             │  │ ·生成收款凭证 │           │
       │                             │  └──────┬──────┘           │
       │                             │         │                  │
       │                             │  状态:已回款                │
       │                             │         │                  │
       ▼                             ▼         ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           数据联动说明                                │
├─────────────────────────────────────────────────────────────────────┤
│ · 创建订单 → 校验库存(库存表) → 保存订单(订单表)                     │
│ · 审批通过 → 更新订单状态 → 推送消息(消息中心)                       │
│ · 商品出库 → 扣减库存(库存表) → 记录流水(库存日志表)                  │
│ · 自动记账 → 生成凭证(凭证表) → 更新应收(客户表)                     │
│ · 回款确认 → 更新应收状态 → 生成收款凭证(凭证表)                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.2 采购订单全流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  老板/财务   │     │    老板      │     │    仓管      │     │    财务      │
│  (创建订单)  │     │   (审批)     │     │   (入库)     │     │  (确认付款)  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       ▼                   │                   │                   │
┌─────────────┐            │                   │                   │
│ 1.创建采购单  │            │                   │                   │
│             │            │                   │                   │
│ ·选择供应商  │            │                   │                   │
│ ·添加商品    │            │                   │                   │
│ ·确认采购价  │            │                   │                   │
│ ·提交订单    │            │                   │                   │
└──────┬──────┘            │                   │                   │
       │                   │                   │                   │
       │ 订单状态: draft   │                   │                   │
       ▼                   │                   │                   │
┌─────────────┐            │                   │                   │
│ 2.保存订单   │            │                   │                   │
│             │            │                   │                   │
│ ·生成订单编号 │            │                   │                   │
│ ·计算总金额   │            │                   │                   │
│ ·校验价格异常 │            │                   │                   │
└──────┬──────┘            │                   │                   │
       │                   │                   │                   │
       │ 订单状态: pending │                   │                   │
       │ 触发: 审批提醒推送 │                   │                   │
       ▼                   │                   │                   │
       │            ┌─────────────┐            │                   │
       │            │ 3.订单审批    │            │                   │
       │            │             │            │                   │
       │            │ ·查看订单详情 │            │                   │
       │            │ ·核对金额    │            │                   │
       │            │ ·选择:同意/驳回│            │                   │
       │            └──────┬──────┘            │                   │
       │                   │                   │                   │
       │         ┌─────────┴─────────┐        │                   │
       │         ▼                   ▼        │                   │
       │    ┌─────────┐         ┌─────────┐   │                   │
       │    │  同意    │         │  驳回    │   │                   │
       │    └────┬────┘         └────┬────┘   │                   │
       │         │                   │        │                   │
       │ 状态:approved           状态:cancelled                 │
       │         │                   │        │                   │
       │         ▼                   │        │                   │
       │  触发:入库提醒推送          │        │                   │
       │         │                   │        │                   │
       │         │            ┌─────────────┐ │                   │
       │         └───────────►│ 4.商品入库    │ │                   │
       │                      │             │ │                   │
       │                      │ ·扫码/选择商品│ │                   │
       │                      │ ·确认入库数量 │ │                   │
       │                      │ ·增加库存    │ │                   │
       │                      └──────┬──────┘ │                   │
       │                             │        │                   │
       │                      状态:completed  │                   │
       │                      触发:自动记账    │                   │
       │                             │        │                   │
       │                             ▼        │                   │
       │                      ┌─────────────┐ │                   │
       │                      │ 5.自动记账    │ │                   │
       │                      │             │ │                   │
       │                      │ ·生成支出凭证 │ │                   │
       │                      │ ·关联采购订单 │ │                   │
       │                      │ ·更新应付    │ │                   │
       │                      └──────┬──────┘ │                   │
       │                             │        │                   │
       │                      触发:付款跟踪提醒 │                  │
       │                             │        │                   │
       │                             │  ┌─────────────┐           │
       │                             │  │ 6.付款确认    │           │
       │                             │  │             │           │
       │                             │  │ ·记录付款金额 │           │
       │                             │  │ ·更新应付状态 │           │
       │                             │  │ ·生成付款凭证 │           │
       │                             │  └──────┬──────┘           │
       │                             │         │                  │
       │                             │  状态:已付款                │
       │                             │         │                  │
       ▼                             ▼         ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           数据联动说明                                │
├─────────────────────────────────────────────────────────────────────┤
│ · 创建订单 → 校验价格(价格异常检测) → 保存订单(订单表)               │
│ · 审批通过 → 更新订单状态 → 推送消息(消息中心)                       │
│ · 商品入库 → 增加库存(库存表) → 记录流水(库存日志表)                  │
│ · 自动记账 → 生成凭证(凭证表) → 更新应付(供应商表)                   │
│ · 付款确认 → 更新应付状态 → 生成付款凭证(凭证表)                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.3 发票录入全流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    财务      │     │   AI服务     │     │   税务系统   │     │   财务系统   │
│  (上传发票)  │     │  (OCR识别)   │     │  (真伪验证)  │     │  (入账处理)  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       ▼                   │                   │                   │
┌─────────────┐            │                   │                   │
│ 1.上传发票   │            │                   │                   │
│             │            │                   │                   │
│ ·拍照/选择文件│            │                   │                   │
│ ·支持:jpg/png│            │                   │                   │
│ ·大小≤5MB   │            │                   │                   │
└──────┬──────┘            │                   │                   │
       │                   │                   │                   │
       │ 上传文件           │                   │                   │
       ▼                   │                   │                   │
┌─────────────┐            │                   │                   │
│ 2.OCR识别    │            │                   │                   │
│             │            │                   │                   │
│ ·调用阿里云  │            │                   │                   │
│   OCR API   │            │                   │                   │
│ ·提取:发票号码│           │                   │                   │
│   金额/税率  │            │                   │                   │
│   购销方信息 │            │                   │                   │
└──────┬──────┘            │                   │                   │
       │                   │                   │                   │
       │ 识别结果           │                   │                   │
       │ 置信度≥95%        │                   │                   │
       ▼                   │                   │                   │
┌─────────────┐            │                   │                   │
│ 3.人工确认   │            │                   │                   │
│             │            │                   │                   │
│ ·核对识别结果│            │                   │                   │
│ ·修正错误字段│            │                   │                   │
│ ·确认无误    │            │                   │                   │
└──────┬──────┘            │                   │                   │
       │                   │                   │                   │
       │ 发票数据           │                   │                   │
       ▼                   │                   │                   │
       │            ┌─────────────┐            │                   │
       │            │ 4.发票验证    │            │                   │
       │            │             │            │                   │
       │            │ ·对接税务系统 │            │                   │
       │            │ ·校验发票真伪 │            │                   │
       │            │ ·防止假票入账 │            │                   │
       │            └──────┬──────┘            │                   │
       │                   │                   │                   │
       │         ┌─────────┴─────────┐        │                   │
       │         ▼                   ▼        │                   │
       │    ┌─────────┐         ┌─────────┐   │                   │
       │    │  验证通过 │         │  验证失败 │   │                   │
       │    └────┬────┘         └────┬────┘   │                   │
       │         │                   │        │                   │
       │ 状态:verified          状态:unverified               │
       │         │                   │        │                   │
       │         ▼                   │        │                   │
       │  触发:入账提醒            标记:需人工复核               │
       │         │                   │        │                   │
       │         │            ┌─────────────┐ │                   │
       │         └───────────►│ 5.关联业务单据 │ │                   │
       │                      │             │ │                   │
       │                      │ ·关联采购订单 │ │                   │
       │                      │ ·关联销售订单 │ │                   │
       │                      │ ·或:无关联    │ │                   │
       │                      └──────┬──────┘ │                   │
       │                             │        │                   │
       │                             ▼        │                   │
       │                      ┌─────────────┐ │                   │
       │                      │ 6.发票入账    │ │                   │
       │                      │             │ │                   │
       │                      │ ·保存发票档案 │ │                   │
       │                      │ ·触发自动记账 │ │                   │
       │                      └──────┬──────┘ │                   │
       │                             │        │                   │
       │                             ▼        │                   │
       │                      ┌─────────────┐ │                   │
       │                      │ 7.生成凭证    │ │                   │
       │                      │             │ │                   │
       │                      │ ·匹配会计科目 │ │                   │
       │                      │ ·生成记账凭证 │ │                   │
       │                      │ ·关联发票    │ │                   │
       │                      └──────┬──────┘ │                   │
       │                             │        │                   │
       │                      状态:entered    │                   │
       ▼                             ▼        ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           数据联动说明                                │
├─────────────────────────────────────────────────────────────────────┤
│ · 上传发票 → 调用OCR → 返回识别结果(准确率≥95%)                      │
│ · 人工确认 → 税务验证 → 更新发票状态(verified/unverified)            │
│ · 关联订单 → 自动匹配往来单位 → 保存关联关系                         │
│ · 发票入账 → 触发规则引擎 → 自动匹配科目 → 生成凭证                  │
│ · 凭证生成 → 关联发票+订单 → 更新财务数据                            │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.4 流程状态机定义

#### 10.4.1 销售订单状态机

```
                    ┌─────────────┐
         ┌─────────│   创建(draft) │
         │         └──────┬──────┘
         │                │ 提交
         │                ▼
         │         ┌─────────────┐
         │  ┌─────│ 待审批(pending)│
         │  │      └──────┬──────┘
         │  │             │ 审批
         │  │    ┌────────┴────────┐
         │  │    ▼                 ▼
         │  │ ┌────────┐      ┌──────────┐
         │  │ │ 同意   │      │  驳回    │
         │  │ └───┬────┘      └────┬─────┘
         │  │     │                │
         │  │     ▼                │
         │  │ ┌─────────────┐      │
         │  └►│ 已批准(approved)│    │
         │    └──────┬──────┘      │
         │           │ 出库         │
         │           ▼              │
         │    ┌─────────────┐       │
         └───►│ 已完成(completed)    │
              └──────┬──────┘       │
                     │               │
                     ▼               │
              ┌─────────────┐       │
              │ 已取消(cancelled)◄───┘
              └─────────────┘
```

#### 10.4.2 采购订单状态机

```
                    ┌─────────────┐
         ┌─────────│   创建(draft) │
         │         └──────┬──────┘
         │                │ 提交
         │                ▼
         │         ┌─────────────┐
         │  ┌─────│ 待审批(pending)│
         │  │      └──────┬──────┘
         │  │             │ 审批
         │  │    ┌────────┴────────┐
         │  │    ▼                 ▼
         │  │ ┌────────┐      ┌──────────┐
         │  │ │ 同意   │      │  驳回    │
         │  │ └───┬────┘      └────┬─────┘
         │  │     │                │
         │  │     ▼                │
         │  │ ┌─────────────┐      │
         │  └►│ 已批准(approved)│    │
         │    └──────┬──────┘      │
         │           │ 入库         │
         │           ▼              │
         │    ┌─────────────┐       │
         └───►│ 已完成(completed)    │
              └──────┬──────┘       │
                     │               │
                     ▼               │
              ┌─────────────┐       │
              │ 已取消(cancelled)◄───┘
              └─────────────┘
```

#### 10.4.3 发票状态机

```
┌─────────────────┐
│  未验证(unverified)│
└────────┬────────┘
         │ OCR识别+人工确认
         ▼
┌─────────────────┐
│  已验证(verified) │
└────────┬────────┘
         │ 入账操作
         ▼
┌─────────────────┐
│  已入账(entered)  │
└────────┬────────┘
         │ 作废操作
         ▼
┌─────────────────┐
│  已作废(void)     │
└─────────────────┘
```

## 十一、多智能体并行开发规范

### 11.1 智能体分工与模块划分

基于前后端分离架构，将系统拆分为 **6个独立智能体**，各智能体负责独立功能模块，通过接口契约进行协作：

| 智能体代号 | 负责模块 | Git分支 | 核心职责 | 依赖模块 |
|-----------|---------|---------|---------|---------|
| **Agent-Auth** | 用户认证与权限 | `feature/auth-system` | 注册 / 登录 /**Passport JWT** / RBAC | 无（基础层） |
| **Agent-CRM** | CRM客户管理 | `feature/crm-module` | 客户档案/跟进记录/商机管理 | Agent-Auth |
| **Agent-Inventory** | 进销存核心 | `feature/inventory-module` | 商品/采购/销售/库存管理 | Agent-Auth, Agent-CRM |
| **Agent-Finance** | 财务模块 | `feature/finance-module` | 发票/凭证/应收应付/报表 | Agent-Auth, Agent-Inventory |
| **Agent-AI** | AI智能层 | `feature/ai-integration` | OCR识别/智能记账/经营分析 | Agent-Auth, Agent-Finance |
| **Agent-Frontend** | 前端UI | `feature/frontend-ui` | 所有前端页面/组件/交互 | 所有后端模块 |

### 11.2 模块依赖矩阵

```
                    Agent-Auth
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
      Agent-CRM   Agent-Inventory  Agent-Finance
            │           │           │
            └───────────┴───────────┘
                        │
                        ▼
                   Agent-AI
                        │
                        ▼
                  Agent-Frontend
```

**依赖规则**：
- 下层模块禁止依赖上层模块（如Agent-Auth不可调用Agent-CRM）
- 同级模块禁止直接调用（如Agent-CRM不可直接调用Agent-Inventory）
- 跨模块数据交互必须通过API网关层

### 11.3 Git工作流规范

#### 11.3.1 分支策略

```
main (保护分支，仅通过PR合并)
  ↑
  │  ← 发布时从develop合并
  │
develop (集成测试分支，保护)
  ↑ ↑ ↑ ↑ ↑ ↑
  │ │ │ │ │ │
feature/auth-system      ← Agent-Auth
feature/crm-module       ← Agent-CRM
feature/inventory-module ← Agent-Inventory
feature/finance-module   ← Agent-Finance
feature/ai-integration   ← Agent-AI
feature/frontend-ui      ← Agent-Frontend
```

#### 11.3.2 分支命名规范

| 分支类型 | 命名格式 | 示例 |
|---------|---------|------|
| 功能分支 | `feature/<模块名>` | `feature/auth-system` |
| 修复分支 | `fix/<模块名>-<问题简述>` | `fix/crm-customer-search` |
| 热修复 | `hotfix/<问题简述>` | `hotfix/login-timeout` |
| 数据库变更 | `migration/<变更简述>` | `migration/add-invoice-index` |

#### 11.3.3 合并规则

| 规则 | 说明 |
|------|------|
| 禁止直接push到main/develop | 必须通过Pull Request合并 |
| 每个PR至少1个Review | 由其他智能体或架构师Review |
| CI通过才能合并 | 单元测试、类型检查、Lint必须通过 |
| 数据库变更需单独PR | 禁止与业务代码同PR合并 |
| 接口契约变更需全量通知 | 变更后需更新Swagger并通知所有智能体 |

### 11.4 接口契约管理

#### 11.4.1 契约先行原则

**所有智能体必须遵守：API契约先于代码实现**

1. 架构师定义初始OpenAPI规范
2. 各智能体根据契约开发
3. 契约变更需走审批流程

#### 11.4.2 接口变更流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 1.提出变更   │     │ 2.影响评估   │     │ 3.审批决策   │     │ 4.执行变更   │
│             │     │             │     │             │     │             │
│ 智能体提交   │────►│ 架构师分析   │────►│ 影响范围小   │────►│ 直接修改     │
│ 变更申请     │     │ 影响范围     │     │ → 快速通过   │     │ 更新契约+代码 │
└─────────────┘     └─────────────┘     └──────┬──────┘     └─────────────┘
                                               │
                                               │ 影响范围大
                                               │ → 需协商
                                               ▼
                                        ┌─────────────┐
                                        │ 召集相关     │
                                        │ 智能体讨论   │
                                        │ 兼容性方案   │
                                        └─────────────┘
```

#### 11.4.3 契约版本管理

| 版本 | 状态 | 说明 |
|------|------|------|
| v1.0.0 | 已定版 | MVP阶段初始契约，禁止破坏性变更 |
| v1.1.0 | 开发中 | 新增字段/接口，向后兼容 |
| v2.0.0 | 规划中 | 破坏性变更，需统一升级 |

**版本号规则**：`主版本.次版本.修订号`
- 主版本：破坏性变更（如删除字段、修改URL）
- 次版本：新增功能（如新增接口、新增可选字段）
- 修订号：Bug修复（如修正文档、调整校验规则）

### 11.5 数据库Schema定版与变更流程

#### 11.5.1 Schema定版原则

**MVP阶段核心表结构必须在第1周定版**，定版后：
- 共享表（users, enterprises, roles）禁止各智能体直接修改
- 模块私有表（如crm_customers）由对应智能体维护
- 所有变更通过Drizzle Migration文件管理

#### 11.5.2 表所有权划分

| 表名 | 所属模块 | 负责智能体 | 说明 |
|------|---------|-----------|------|
| `users` | 基础层 | Agent-Auth | 共享表，禁止其他智能体修改 |
| `enterprises` | 基础层 | Agent-Auth | 共享表，禁止其他智能体修改 |
| `user_enterprises` | 基础层 | Agent-Auth | 共享表，禁止其他智能体修改 |
| `roles` | 基础层 | Agent-Auth | 共享表，禁止其他智能体修改 |
| `customers` | CRM | Agent-CRM | 私有表，Agent-CRM全权负责 |
| `products` | 进销存 | Agent-Inventory | 私有表，Agent-Inventory全权负责 |
| `sales_orders` | 进销存 | Agent-Inventory | 私有表，Agent-Inventory全权负责 |
| `purchase_orders` | 进销存 | Agent-Inventory | 私有表，Agent-Inventory全权负责 |
| `inventory` | 进销存 | Agent-Inventory | 私有表，Agent-Inventory全权负责 |
| `invoices` | 财务 | Agent-Finance | 私有表，Agent-Finance全权负责 |
| `voucher_entries` | 财务 | Agent-Finance | 私有表，Agent-Finance全权负责 |
| `inventory_logs` | 进销存 | Agent-Inventory | 私有表，Agent-Inventory全权负责 |
| `account_subjects` | 财务 | Agent-Finance | 私有表，会计科目体系，Agent-Finance全权负责 |
| `approval_flows` | OA | Agent-Auth | 共享表，审批流程定义，各模块共用 |
| `approval_records` | OA | Agent-Auth | 共享表，审批记录，各模块共用 |
| `leave_requests` | OA | Agent-Auth | 私有表，请假申请，Agent-Auth全权负责 |
| `expense_reports` | OA | Agent-Auth | 私有表，报销申请，Agent-Auth全权负责 |

#### 11.5.3 数据库变更流程

```
1. 智能体在本地创建Migration文件
   npx drizzle-kit generate:pg --name add_customer_level

2. 提交PR至develop分支（单独PR，禁止与业务代码混合）

3. 架构师Review（检查索引、外键、性能影响）

4. CI执行Migration测试（在隔离数据库验证）

5. 合并后自动执行Migration（GitHub Actions）
```

#### 11.5.4 变更冲突解决

| 场景 | 解决方案 |
|------|---------|
| 两个智能体同时修改同一表 | 架构师协调，按优先级合并 |
| Migration文件序号冲突 | 使用时间戳命名，避免序号冲突 |
| 外键依赖其他模块的表 | 仅允许引用，禁止修改被引用表 |

### 11.6 分阶段合并策略

#### 11.6.1 合并阶段规划

| 阶段 | 时间 | 合并内容 | 目标分支 |
|------|------|---------|---------|
| **Phase 0** | 第1周 | 项目脚手架 + 数据库Schema + 接口契约 | develop |
| **Phase 1** | 第2-3周 | Agent-Auth（认证模块） | develop |
| **Phase 2** | 第3-5周 | Agent-CRM + Agent-Inventory | develop |
| **Phase 3** | 第5-6周 | Agent-Finance | develop |
| **Phase 4** | 第6-7周 | Agent-AI | develop |
| **Phase 5** | 全程 | Agent-Frontend（按后端API进度） | develop |
| **Release** | 第8周 | 全部模块合并 | main |

#### 11.6.2 合并检查清单

每个智能体合并到develop前必须完成：

- [ ] 单元测试覆盖率≥60%
- [ ] 接口契约与Swagger文档一致
- [ ] 数据库Migration文件已提交
- [ ] 代码通过ESLint + Prettier检查
- [ ] TypeScript类型检查通过
- [ ] 与其他已合并模块的集成测试通过
- [ ] 文档已更新（README + API文档）

#### 11.6.3 冲突预防机制

| 机制 | 说明 |
|------|------|
| 每日同步 | 每个智能体每日从develop拉取最新代码 |
| 接口Mock | 前端开发使用Mock数据，不等待后端完成 |
| 契约锁定 | 已定版接口禁止破坏性变更 |
| 独立数据库 | 各智能体本地开发使用独立数据库实例 |

## 十二、各智能体独立开发任务清单

### 12.1 Agent-Auth：用户认证与权限

**负责范围**：用户注册/登录/**Passport JWT** 认证 / 角色权限 / 企业切换

**开发周期**：第1-3周

**任务清单**：

| 序号 | 任务 | 优先级 | 验收标准 | 依赖 |
|------|------|--------|---------|------|
| 1 | 搭建后端脚手架（**NestJS** + Drizzle + **Passport JWT** + **`@uxyy/shared` workspace**） | P0 | 根目录 pnpm/Turbo 可跑通，`nest start` 与迁移可用 | 无 |
| 2 | 设计users/enterprises/roles表Schema | P0 | Migration文件通过，表结构正确 | 无 |
| 3 | 实现用户注册API（POST /api/v1/auth/register） | P0 | 可创建用户+企业，返回JWT | 任务2 |
| 4 | 实现用户登录API（POST /api/v1/auth/login） | P0 | 验证密码，返回Access+Refresh Token | 任务3 |
| 5 | 实现Token刷新API（POST /api/v1/auth/refresh） | P0 | Refresh Token可换取新Access Token | 任务4 |
| 6 | 实现 **JwtStrategy + JwtAuthGuard** | P0 | 保护路由，解析 Access Token，注入用户 | 任务4 |
| 7 | 实现 **RBAC Guards / 权限装饰器** | P0 | 按角色限制接口访问，返回403 | 任务6 |
| 8 | 实现企业切换API | P1 | 用户可切换当前操作的企业 | 任务2 |
| 9 | 实现用户资料管理API | P1 | 查询/修改用户昵称、头像 | 任务3 |
| 10 | 编写单元测试（覆盖率≥60%） | P0 | Jest测试通过，覆盖核心逻辑 | 全部 |
| 11 | 编写Swagger接口文档 | P0 | 文档与代码一致，可在线访问 | 全部 |
| 12 | 编写模块README | P1 | 包含环境配置、启动命令、接口说明 | 全部 |

**接口契约（已定版）**：
```yaml
/auth/register:
  post:
    summary: 用户注册
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [phone, password, enterpriseName]
            properties:
              phone: { type: string, pattern: '^1[3-9]\d{9}$' }
              password: { type: string, minLength: 6 }
              enterpriseName: { type: string, maxLength: 100 }
    responses:
      200:
        description: 注册成功
        content:
          application/json:
            schema:
              type: object
              properties:
                code: { type: integer, example: 200 }
                data:
                  type: object
                  properties:
                    userId: { type: integer }
                    enterpriseId: { type: integer }
                    accessToken: { type: string }
                    refreshToken: { type: string }
```

### 12.2 Agent-CRM：客户管理

**负责范围**：客户档案/客户分类/跟进记录/商机管理

**开发周期**：第2-5周

**任务清单**：

| 序号 | 任务 | 优先级 | 验收标准 | 依赖 |
|------|------|--------|---------|------|
| 1 | 设计customers表Schema | P0 | 包含客户等级、信用额度、标签等字段 | Agent-Auth任务2 |
| 2 | 实现客户创建API（POST /api/v1/customers） | P0 | 可创建客户，自动关联当前企业 | 任务1 |
| 3 | 实现客户列表查询API（GET /api/v1/customers） | P0 | 支持分页、筛选、排序 | 任务2 |
| 4 | 实现客户详情API（GET /api/v1/customers/:id） | P0 | 返回完整客户信息 | 任务2 |
| 5 | 实现客户更新API（PUT /api/v1/customers/:id） | P0 | 可修改客户信息 | 任务2 |
| 6 | 实现客户删除API（DELETE /api/v1/customers/:id） | P0 | 软删除，标记isDeleted | 任务2 |
| 7 | 实现客户导入API（支持Excel） | P1 | 可批量导入客户数据 | 任务2 |
| 8 | 实现跟进记录API（CRUD） | P1 | 可记录客户跟进历史 | 任务2 |
| 9 | 实现客户等级自动计算 | P2 | 根据消费金额自动升级客户等级 | 任务3 |
| 10 | 编写单元测试 | P0 | 覆盖率≥60% | 全部 |
| 11 | 编写Swagger文档 | P0 | 文档完整准确 | 全部 |

### 12.3 Agent-Inventory：进销存核心

**负责范围**：商品管理/采购订单/销售订单/库存管理/库存预警

**开发周期**：第2-5周

**任务清单**：

| 序号 | 任务 | 优先级 | 验收标准 | 依赖 |
|------|------|--------|---------|------|
| 1 | 设计products/categories/sales_orders/purchase_orders/inventory表Schema | P0 | 包含行业扩展字段（JSONB） | Agent-Auth任务2 |
| 2 | 实现商品管理API（CRUD） | P0 | 支持条码、规格、多单位 | 任务1 |
| 3 | 实现商品分类API（多级分类） | P0 | 支持父子分类关系 | 任务1 |
| 4 | 实现销售订单创建API | P0 | 自动计算金额，校验库存 | 任务2 |
| 5 | 实现销售订单审批API | P0 | 状态流转：draft→pending→approved | 任务4 |
| 6 | 实现销售订单出库API | P0 | 扣减库存，生成库存流水 | 任务4 |
| 7 | 实现采购订单创建API | P0 | 自动计算金额 | 任务2 |
| 8 | 实现采购订单入库API | P0 | 增加库存，生成库存流水 | 任务7 |
| 9 | 实现库存查询API | P0 | 支持按仓库、批次查询 | 任务1 |
| 10 | 实现库存预警API | P1 | 低于安全库存时触发预警 | 任务9 |
| 11 | 实现库存盘点API | P1 | 支持盘盈盘亏计算 | 任务9 |
| 12 | 编写单元测试 | P0 | 覆盖率≥60%，重点测试库存计算逻辑 | 全部 |
| 13 | 编写Swagger文档 | P0 | 文档完整准确 | 全部 |

### 12.4 Agent-Finance：财务模块

**负责范围**：发票管理/凭证生成/应收应付/报表统计

**开发周期**：第4-6周

**任务清单**：

| 序号 | 任务 | 优先级 | 验收标准 | 依赖 |
|------|------|--------|---------|------|
| 1 | 设计invoices/voucher_entries/account_subjects表Schema | P0 | 支持发票OCR数据存储 | Agent-Auth任务2 |
| 2 | 实现发票录入API（手动+OCR） | P0 | 可保存发票信息，关联订单 | 任务1 |
| 3 | 实现发票验证API | P1 | 对接税务系统校验真伪 | 任务2 |
| 4 | 实现凭证自动生成API | P0 | 销售/采购订单自动生成分录 | Agent-Inventory任务6/8 |
| 5 | 实现凭证查询API | P0 | 支持按期间、科目筛选 | 任务4 |
| 6 | 实现应收应付管理API | P1 | 跟踪客户/供应商欠款 | 任务4 |
| 7 | 实现经营报表API（利润表/资产负债表） | P1 | 按期间汇总财务数据 | 任务4 |
| 8 | 实现报表导出API（Excel/PDF） | P2 | 支持标准财务报表格式 | 任务7 |
| 9 | 编写单元测试 | P0 | 覆盖率≥60%，重点测试金额计算 | 全部 |
| 10 | 编写Swagger文档 | P0 | 文档完整准确 | 全部 |

### 12.5 Agent-AI：AI智能层

**负责范围**：发票OCR/智能记账/经营分析/库存预警建议

**开发周期**：第5-7周

**任务清单**：

| 序号 | 任务 | 优先级 | 验收标准 | 依赖 |
|------|------|--------|---------|------|
| 1 | 接入通义千问Qwen3-VL API | P0 | 可识别发票图片，返回结构化数据 | 无 |
| 2 | 实现OCR结果后处理（字段校验/纠错） | P0 | 准确率≥95%，置信度评分 | 任务1 |
| 3 | 实现发票自动入账API | P0 | OCR识别后自动关联订单+生成凭证 | Agent-Finance任务2 |
| 4 | 接入DeepSeek V4-Flash API | P0 | 可调用模型进行规则推理 | 无 |
| 5 | 实现智能凭证生成（科目匹配） | P0 | 根据业务类型自动匹配会计科目 | 任务4 |
| 6 | 实现经营分析API（调用DeepSeek） | P1 | 生成经营洞察报告 | 任务4 |
| 7 | 实现库存预警建议API | P1 | 基于销售数据生成采购建议 | 任务4 |
| 8 | 实现AI服务降级策略 | P1 | API失败时切换备用方案 | 任务1/4 |
| 9 | 编写单元测试 | P0 | 覆盖率≥60%，Mock AI接口 | 全部 |
| 10 | 编写Swagger文档 | P0 | 文档完整准确 | 全部 |

### 12.6 Agent-Frontend：前端UI

**负责范围**：所有前端页面/组件/交互/状态管理

**开发周期**：第1-8周（全程并行）

**任务清单**：

| 序号 | 任务 | 优先级 | 验收标准 | 依赖 |
|------|------|--------|---------|------|
| 1 | 搭建Next.js项目脚手架 | P0 | App Router配置，TypeScript严格模式 | 无 |
| 2 | 配置Tailwind CSS + Shadcn/ui | P0 | UI组件库可用，主题色配置 | 任务1 |
| 3 | 配置 TanStack Query（React Query）+ Zustand | P0 | 状态管理框架可用 | 任务1 |
| 4 | 实现登录/注册页面 | P0 | 表单校验，JWT存储 | Agent-Auth任务3/4 |
| 5 | 实现企业切换/用户资料页面 | P1 | 多企业切换UI | Agent-Auth任务7/8 |
| 6 | 实现客户管理页面（列表/详情/编辑） | P0 | CRUD操作，分页筛选 | Agent-CRM任务2/3 |
| 7 | 实现销售订单页面（创建/审批/出库） | P0 | 流程化UI，状态展示 | Agent-Inventory任务4/5/6 |
| 8 | 实现采购订单页面（创建/入库） | P0 | 流程化UI，状态展示 | Agent-Inventory任务7/8 |
| 9 | 实现库存管理页面 | P0 | 实时库存展示，预警提示 | Agent-Inventory任务9/10 |
| 10 | 实现发票录入页面（支持上传/OCR） | P0 | 图片上传，OCR结果展示/编辑 | Agent-AI任务1/2 |
| 11 | 实现凭证管理页面 | P0 | 凭证列表/详情，自动/手动生成 | Agent-Finance任务4/5 |
| 12 | 实现经营报表页面 | P1 | 图表展示，数据可视化 | Agent-Finance任务7 |
| 13 | 实现审批流程页面 | P1 | 审批列表/详情/操作 | Agent-Inventory任务5 |
| 14 | 实现移动端适配（响应式） | P0 | 核心功能在手机端可用 | 全部 |
| 15 | 编写组件测试 | P1 | React Testing Library覆盖核心组件 | 全部 |
| 16 | 编写E2E测试（Playwright） | P2 | 覆盖核心用户流程 | 全部 |

## 十三、GitHub 多智能体协作配置

### 13.1 GitHub Actions Workflow 配置

#### 13.1.1 多智能体 CI 工作流

**文件路径**：`.github/workflows/multi-agent-ci.yml`

```yaml
name: Multi-Agent CI

on:
  pull_request:
    branches: [develop, main]
    paths:
      - 'src/**'
      - 'tests/**'
      - 'package.json'
      - 'drizzle/**'

jobs:
  detect-agent:
    runs-on: ubuntu-latest
    outputs:
      agent: ${{ steps.detect.outputs.agent }}
      is-frontend: ${{ steps.detect.outputs.is-frontend }}
    steps:
      - uses: actions/checkout@v4
      - id: detect
        run: |
          BRANCH="${{ github.head_ref }}"
          if [[ $BRANCH == feature/auth* ]]; then 
            echo "agent=auth" >> $GITHUB_OUTPUT
            echo "is-frontend=false" >> $GITHUB_OUTPUT
          elif [[ $BRANCH == feature/crm* ]]; then 
            echo "agent=crm" >> $GITHUB_OUTPUT
            echo "is-frontend=false" >> $GITHUB_OUTPUT
          elif [[ $BRANCH == feature/inventory* ]]; then 
            echo "agent=inventory" >> $GITHUB_OUTPUT
            echo "is-frontend=false" >> $GITHUB_OUTPUT
          elif [[ $BRANCH == feature/finance* ]]; then 
            echo "agent=finance" >> $GITHUB_OUTPUT
            echo "is-frontend=false" >> $GITHUB_OUTPUT
          elif [[ $BRANCH == feature/ai* ]]; then 
            echo "agent=ai" >> $GITHUB_OUTPUT
            echo "is-frontend=false" >> $GITHUB_OUTPUT
          elif [[ $BRANCH == feature/frontend* ]]; then 
            echo "agent=frontend" >> $GITHUB_OUTPUT
            echo "is-frontend=true" >> $GITHUB_OUTPUT
          else
            echo "agent=unknown" >> $GITHUB_OUTPUT
            echo "is-frontend=false" >> $GITHUB_OUTPUT
          fi

  backend-quality:
    needs: detect-agent
    if: needs.detect-agent.outputs.is-frontend == 'false'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          flags: ${{ needs.detect-agent.outputs.agent }}
          fail_ci_if_error: true

  frontend-quality:
    needs: detect-agent
    if: needs.detect-agent.outputs.is-frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          flags: frontend

  api-contract-check:
    needs: detect-agent
    if: needs.detect-agent.outputs.is-frontend == 'false'
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: uxyy_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - name: Generate Swagger from code
        run: npm run swagger:generate
      - name: Validate Swagger schema
        run: npm run swagger:validate
      - name: Compare with baseline
        run: |
          if [ -f swagger-baseline.json ]; then
            diff swagger.json swagger-baseline.json || \
            (echo "::warning::接口契约发生变更，请确认是否通知所有智能体" && exit 0)
          fi

  migration-check:
    needs: detect-agent
    if: needs.detect-agent.outputs.is-frontend == 'false'
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: uxyy_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - name: Run migrations
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/uxyy_test
        run: npx drizzle-kit migrate
      - name: Verify migration integrity
        run: npx drizzle-kit check

  notify-agents:
    needs: [backend-quality, frontend-quality, api-contract-check, migration-check]
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Notify on failure
        uses: actions/github-script@v6
        with:
          script: |
            const agent = '${{ needs.detect-agent.outputs.agent }}';
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `❌ **${agent}** 智能体 CI 检查失败，请修复后重新提交。\n\n如涉及接口契约或数据库Schema变更，请：\n1. 更新 Swagger 文档\n2. 通知所有相关智能体\n3. 架构师审批后方可合并`
            });
```

#### 13.1.2 自动合并工作流

**文件路径**：`.github/workflows/auto-merge.yml`

```yaml
name: Auto Merge

on:
  pull_request:
    branches: [develop]
    types: [opened, synchronize]

jobs:
  auto-merge:
    runs-on: ubuntu-latest
    if: github.actor != 'dependabot[bot]'
    steps:
      - name: Wait for CI
        uses: lewagon/wait-on-check-action@v1.3.1
        with:
          ref: ${{ github.event.pull_request.head.sha }}
          check-name: 'Multi-Agent CI'
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          wait-interval: 10

      - name: Auto merge
        uses: pascalgn/automerge-action@v0.15.6
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          MERGE_METHOD: squash
          MERGE_COMMIT_MESSAGE: pull-request-title
          MERGE_RETRIES: 3
          MERGE_RETRY_SLEEP: 10000
```

#### 13.1.3 数据库Migration自动化

**文件路径**：`.github/workflows/migration-deploy.yml`

```yaml
name: Database Migration

on:
  push:
    branches: [develop, main]
    paths:
      - 'drizzle/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - name: Run migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: npx drizzle-kit migrate
      - name: Verify migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: npx drizzle-kit check
```

### 13.2 Pull Request 模板

**文件路径**：`.github/pull_request_template.md`

```markdown
## 📋 变更信息

### 变更模块
<!-- 勾选对应的智能体模块 -->
- [ ] 🤖 Agent-Auth（用户认证）
- [ ] 🤖 Agent-CRM（客户管理）
- [ ] 🤖 Agent-Inventory（进销存）
- [ ] 🤖 Agent-Finance（财务）
- [ ] 🤖 Agent-AI（智能层）
- [ ] 🤖 Agent-Frontend（前端UI）

### 变更类型
- [ ] ✨ 新功能
- [ ] 🐛 Bug修复
- [ ] 📝 文档更新
- [ ] 🔧 配置变更
- [ ] ⚠️ **接口契约变更（需全量通知）**
- [ ] 🗄️ **数据库Migration（需单独PR）**

## 📝 变更描述

<!-- 描述本次变更的内容和原因 -->

## 🔗 影响范围

<!-- 描述本次变更是否影响其他智能体 -->
- [ ] 不影响其他模块
- [ ] 影响以下模块：______

## ✅ 检查清单

### 代码质量
- [ ] 代码通过 ESLint 检查
- [ ] TypeScript 类型检查通过
- [ ] 单元测试覆盖率≥60%
- [ ] 新增功能有对应测试用例

### 文档
- [ ] Swagger 接口文档已更新
- [ ] README 文档已更新（如需要）
- [ ] 数据库Migration文件已提交（如需要）

### 兼容性
- [ ] 向后兼容（无破坏性变更）
- [ ] 已评估对前端的影响

## 🧪 测试步骤

<!-- 描述如何测试本次变更 -->
1. 
2. 
3. 

## 📎 关联信息

- 关联 Issue：#
- 关联文档：
- 架构师审批：@architect（如涉及接口/数据库变更）
```

### 13.3 AGENTS.md 项目配置

**文件路径**：`AGENTS.md`

```markdown
# 优效营（uxyy.cn）项目 Agent 配置

## 🎯 项目概述

优效营是专为小微企业打造的「财务 + 进销存」一体化经营系统。
**技术栈**：Next.js 14 + **NestJS** + **Passport JWT** + Neon Postgres + Drizzle ORM + **pnpm / Turborepo Monorepo** + Redis + **BullMQ**。

## 🏗️ 架构规范

### 技术栈约束
- **前端**：Next.js 14（App Router），TypeScript 严格模式
- **后端**：**NestJS**，RESTful API，`/api/v1/` 前缀；**`@nestjs/swagger`**
- **认证**：**Passport JWT**（`@nestjs/passport` + `passport-jwt` + `@nestjs/jwt` 签发）
- **数据库**：PostgreSQL（Neon），Drizzle ORM + drizzle-kit
- **缓存 / 队列**：Redis；BullMQ 承担异步任务
- **共享契约**：`uxyy-shared`（`@uxyy/shared`）内 **Zod** + 类型导出
- **AI**：通义千问 Qwen3-VL（OCR）+ DeepSeek V4（推理）

### 项目结构
```
uxyy/
├── package.json / pnpm-workspace.yaml / turbo.json
├── uxyy-web/          # 前端（@uxyy/web）
├── uxyy-api/          # 后端（@uxyy/api，NestJS）
├── uxyy-shared/       # 共享包（@uxyy/shared）
└── docker-compose.yml # 本地开发环境（Postgres / Redis）
```

## 📝 编码规范

### TypeScript
- 严格模式开启（strict: true）
- 禁止 any 类型（特殊情况需注释说明）
- 接口命名使用 PascalCase（如 `CreateOrderRequest`）
- 枚举命名使用 PascalCase，成员使用 UPPER_SNAKE_CASE

### 后端 API
- 统一响应格式：`{ code: number, message: string, data: T }`
- HTTP 状态码规范：
  - 200：成功
  - 201：创建成功
  - 400：请求参数错误
  - 401：未认证
  - 403：无权限
  - 404：资源不存在
  - 500：服务器内部错误
- 路由命名使用 kebab-case：`/api/v1/sales-orders`
- 鉴权：`@UseGuards(AuthGuard('jwt'))`（或封装后的应用级 Guard）

### 数据库
- 表名使用 snake_case，复数形式
- 字段名使用 snake_case
- 时间戳字段：`created_at`, `updated_at`
- 软删除字段：`deleted_at`（nullable）
- 所有业务表必须包含 `enterprise_id` 字段

## 🧪 测试规范

### 单元测试
- 后端：**Jest** + **Supertest**（配合 `@nestjs/testing` 挂载 Nest 应用）；前端：React Testing Library
- 测试文件命名：`*.test.ts` 或 `*.spec.ts`
- 覆盖率要求：核心业务逻辑≥60%
- 使用 table-driven tests 测试多场景

### 测试示例
```typescript
// 后端（Nest）：使用 app.getHttpServer() 转发给 supertest
describe('POST /api/v1/auth/register', () => {
  it('should create user and return tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        phone: '13800138000',
        password: 'password123',
        enterpriseName: '测试企业',
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
  });
});
```

## 🔐 安全规范

- 密码使用 BCrypt 加密（saltRounds: 10）
- **Passport JWT**：Access / Refresh 有效期按 PRD；Redis 黑名单 / 轮换策略按需实现
- 敏感操作（删除、修改价格）需二次验证
- 禁止在日志中输出密码、完整 Token 等敏感信息
- 所有 API 必须校验 enterprise_id，防止越权访问

## 🤖 多智能体协作规则

### 分支命名
- 功能分支：`feature/<模块名>-<功能简述>`
- 修复分支：`fix/<模块名>-<问题简述>`
- 数据库变更：`migration/<变更简述>`

### 提交信息规范
```
<type>(<scope>): <subject>

<body>

<footer>
```

类型：
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档
- `style`: 代码格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

示例：
```
feat(auth): 实现用户注册接口

- 添加手机号验证码校验
- 集成 BCrypt 密码加密
- Passport JWT 颁发 Access/Refresh

Closes #123
```

### 接口契约变更流程
1. 在 PR 描述中标记「接口契约变更」
2. 更新 **@nestjs/swagger** 与 `docs/api` YAML、**@uxyy/shared Zod**
3. 通知所有相关智能体
4. 架构师审批后方可合并

### 数据库变更流程
1. 创建独立的 Migration PR
2. 禁止与业务代码混合提交
3. 架构师 Review 索引和外键
4. CI 在隔离数据库验证通过

## 📚 参考文档

- [产品需求文档](./PRD.md)
- [API 接口文档](./swagger.json)
- [数据库设计文档](./docs/database.md)
- [部署文档](./docs/deployment.md)
```

### 13.4 GitHub Codespace 配置

**文件路径**：`.devcontainer/devcontainer.json`

```json
{
  "name": "优效营多智能体开发环境",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:20",
  "features": {
    "ghcr.io/devcontainers/features/github-cli:1": {},
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},
    "ghcr.io/devcontainers/features/postgres:1": {
      "version": "16"
    }
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "github.copilot",
        "github.copilot-chat",
        "bradlc.vscode-tailwindcss",
        "Prisma.prisma",
        "yoavbls.pretty-ts-errors"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "typescript.preferences.importModuleSpecifier": "relative"
      }
    }
  },
  "postCreateCommand": "corepack enable && pnpm install && pnpm run setup:dev && pnpm --filter @uxyy/api exec drizzle-kit migrate",
  "forwardPorts": [3000, 3001, 5432, 6379],
  "portsAttributes": {
    "3000": { "label": "前端服务 (Next.js)" },
    "3001": { "label": "后端 API (NestJS)" },
    "5432": { "label": "PostgreSQL" },
    "6379": { "label": "Redis" }
  },
  "remoteEnv": {
    "DATABASE_URL": "postgres://postgres:postgres@localhost:5432/uxyy_dev",
    "REDIS_URL": "redis://localhost:6379"
  }
}
```

### 13.5 GitHub Projects 看板配置

**Project Board 列设计**：

| 列名 | 说明 | 自动化规则 |
|------|------|-----------|
| 📋 待办 | 待开发任务 | 新Issue自动进入 |
| 🏗️ 进行中 | 正在开发 | 关联PR时自动移动 |
| 👀 Code Review | 等待Review | PR创建时自动移动 |
| ✅ 测试中 | CI通过待测试 | CI通过后自动移动 |
| 🚀 已完成 | 已合并到develop | PR合并后自动移动 |

**标签体系**：

| 标签 | 颜色 | 用途 |
|------|------|------|
| `agent:auth` | 🔵 蓝色 | Agent-Auth 任务 |
| `agent:crm` | 🟢 绿色 | Agent-CRM 任务 |
| `agent:inventory` | 🟡 黄色 | Agent-Inventory 任务 |
| `agent:finance` | 🟠 橙色 | Agent-Finance 任务 |
| `agent:ai` | 🟣 紫色 | Agent-AI 任务 |
| `agent:frontend` | 🔴 红色 | Agent-Frontend 任务 |
| `type:feature` | #a2eeef | 新功能 |
| `type:bug` | #d73a4a | Bug修复 |
| `type:contract` | #ffd54f | 接口契约变更 |
| `type:migration` | #795548 | 数据库变更 |
| `priority:p0` | #b60205 | 阻塞性优先级 |
| `priority:p1` | #fbca04 | 高优先级 |
| `priority:p2` | #0e8a16 | 中优先级 |

### 13.6 分支保护规则配置

**Settings → Branches → Add rule**：

**`main` 分支保护规则**：
- ✅ Require a pull request before merging
  - Require 2 approving reviews
  - Dismiss stale PR approvals when new commits are pushed
  - Require review from CODEOWNERS
- ✅ Require status checks to pass before merging
  - Status checks: `Multi-Agent CI`, `migration-check`
- ✅ Require conversation resolution before merging
- ✅ Require signed commits
- ✅ Include administrators

**`develop` 分支保护规则**：
- ✅ Require a pull request before merging
  - Require 1 approving review
- ✅ Require status checks to pass before merging
  - Status checks: `Multi-Agent CI`
- ✅ Require conversation resolution before merging

**`feature/*` 分支保护规则**：
- ✅ Require status checks to pass before merging
  - Status checks: `backend-quality` / `frontend-quality`

## 十四、部署与运维方案

### 14.1 容器化部署架构

**Docker Compose 本地开发环境**：

```yaml
# docker-compose.yml
version: '3.8'

services:
  # 前端服务
  uxyy-web:
    build:
      context: ./uxyy-web
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3001
    depends_on:
      - uxyy-api

  # 后端 API 服务
  uxyy-api:
    build:
      context: ./uxyy-api
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgres://postgres:postgres@postgres:5432/uxyy
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - AI_API_KEY=${AI_API_KEY}
    depends_on:
      - postgres
      - redis

  # PostgreSQL 数据库
  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=uxyy
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

  # Redis 缓存
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  # Nginx 反向代理
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - uxyy-web
      - uxyy-api

volumes:
  postgres_data:
  redis_data:
```

**生产环境 Dockerfile（NestJS / `uxyy-api`，Monorepo 下请与根目录 pnpm 构建或 CI 对齐产物路径）：**

```dockerfile
# uxyy-api/Dockerfile（示意：pnpm + nest build）
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm fetch
COPY . .
RUN pnpm install --frozen-lockfile && pnpm run build

FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "dist/main.js"]
```

### 14.2 CI/CD 部署流水线

**GitHub Actions 部署工作流**：

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ccr.ccs.tencentyun.com
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}

      - name: Build and Push Images
        run: |
          docker build -t ccr.ccs.tencentyun.com/uxyy/api:${{ github.sha }} ./uxyy-api
          docker build -t ccr.ccs.tencentyun.com/uxyy/web:${{ github.sha }} ./uxyy-web
          docker push ccr.ccs.tencentyun.com/uxyy/api:${{ github.sha }}
          docker push ccr.ccs.tencentyun.com/uxyy/web:${{ github.sha }}

      - name: Deploy to Server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/uxyy
            docker-compose pull
            docker-compose up -d
            docker system prune -f
```

### 14.3 环境配置管理

| 环境 | 域名 | 数据库 | 部署方式 | 用途 |
|------|------|--------|---------|------|
| **开发环境** | `dev.uxyy.cn` | Neon Dev Branch | Vercel Preview | 智能体日常开发 |
| **测试环境** | `staging.uxyy.cn` | Neon Staging Branch | 腾讯云 CVM + Docker | 集成测试 |
| **生产环境** | `uxyy.cn` | Neon Main Branch | 腾讯云 CVM + Docker + CDN | 正式服务 |

**环境变量配置**：

```bash
# .env.development
NODE_ENV=development
DATABASE_URL=postgres://user:pass@localhost:5432/uxyy_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-key
API_BASE_URL=http://localhost:3001

# .env.production
NODE_ENV=production
DATABASE_URL=${NEON_DATABASE_URL}
REDIS_URL=${UPSTASH_REDIS_URL}
JWT_SECRET=${JWT_SECRET}
API_BASE_URL=https://api.uxyy.cn
```

### 14.4 监控与告警

**健康检查端点**：

```typescript
// GET /health
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "ai_service": "available"
  },
  "version": "1.0.0"
}
```

**监控指标**：

| 指标类型 | 指标名称 | 告警阈值 |
|---------|---------|---------|
| 性能 | API 响应时间 | P99 > 1000ms |
| 性能 | 数据库查询时间 | 平均 > 100ms |
| 可用性 | 服务存活状态 | 健康检查失败 |
| 业务 | 错误率 | > 1% |
| 资源 | CPU 使用率 | > 80% |
| 资源 | 内存使用率 | > 85% |
| 资源 | 磁盘使用率 | > 90% |

## 十五、安全与合规设计

### 15.1 数据安全架构

**传输层安全**：
- 全站 HTTPS（TLS 1.3）
- HSTS 头部配置
- 敏感接口防重放攻击（Nonce + Timestamp）

**存储层安全**：
- 密码：BCrypt 加密（saltRounds: 12）
- 手机号：AES-256-GCM 加密存储
- 财务数据：字段级加密
- 备份数据：加密后存储至对象存储

### 15.2 RBAC 权限矩阵

| 角色 | 客户管理 | 销售订单 | 采购订单 | 库存 | 财务 | 报表 | 系统设置 |
|------|---------|---------|---------|------|------|------|---------|
| **企业主** | 全部权限 | 全部权限 | 全部权限 | 全部权限 | 全部权限 | 全部权限 | 全部权限 |
| **财务** | 查看 | 查看 | 查看 | 查看 | 全部权限 | 全部权限 | 无 |
| **销售** | 全部权限 | 全部权限 | 无 | 查看 | 无 | 查看个人 | 无 |
| **仓管** | 无 | 无 | 入库确认 | 全部权限 | 无 | 无 | 无 |
| **行政** | 无 | 无 | 无 | 无 | 无 | 无 | 审批流程配置 |

### 15.3 审计日志规范

```typescript
interface AuditLog {
  id: string;
  enterprise_id: string;
  user_id: string;
  user_name: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'LOGIN';
  resource_type: string;  // 'customer', 'order', 'invoice', etc.
  resource_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address: string;
  user_agent: string;
  created_at: Date;
}
```

**审计范围**：
- 所有数据修改操作（增删改）
- 敏感数据导出
- 登录/登出行为
- 权限变更
- 系统配置修改

## 十六、性能优化策略

### 16.1 数据库优化

**索引策略**：

| 表名 | 索引字段 | 索引类型 | 用途 |
|------|---------|---------|------|
| customers | (enterprise_id, phone) | 唯一索引 | 手机号快速查找 |
| customers | (enterprise_id, created_at) | B-tree | 客户列表分页 |
| products | (enterprise_id, code) | 唯一索引 | 商品编码查找 |
| products | (enterprise_id, category_id) | B-tree | 按分类筛选 |
| sales_orders | (enterprise_id, order_no) | 唯一索引 | 订单号查找 |
| sales_orders | (enterprise_id, status, created_at) | 复合索引 | 状态筛选+时间排序 |
| sales_orders | (customer_id) | B-tree | 客户订单查询 |
| inventory_records | (product_id, type) | 复合索引 | 商品出入库记录 |
| invoices | (enterprise_id, invoice_no) | 唯一索引 | 发票号查找 |
| invoices | (enterprise_id, invoice_date) | B-tree | 按月统计 |

**查询优化**：
- 分页查询限制最大返回 1000 条
- 复杂统计使用物化视图（Materialized View）
- 大数据量表按时间分区（Partitioning）

### 16.2 缓存策略

**Redis 缓存设计**：

| 缓存Key | 数据内容 | 过期时间 | 更新策略 |
|---------|---------|---------|---------|
| `user:{id}` | 用户信息 | 15分钟 | 更新时删除 |
| `enterprise:{id}` | 企业信息 | 30分钟 | 更新时删除 |
| `products:{enterprise_id}` | 商品列表 | 10分钟 | 定时刷新 |
| `customers:{enterprise_id}` | 客户列表 | 10分钟 | 定时刷新 |
| `permissions:{user_id}` | 用户权限 | 1小时 | 登录时刷新 |
| `dashboard:{enterprise_id}` | 仪表盘数据 | 5分钟 | 定时刷新 |
| `session:{token}` | 登录会话 | 15分钟 | 续期时更新 |

**缓存更新策略**：
- 读多写少数据：Cache-Aside（旁路缓存）
- 写后立即读：Write-Through（直写）
- 定时任务数据：定时刷新 + 版本号控制

### 16.3 前端性能优化

- **代码分割**：Next.js 自动代码分割，路由级懒加载
- **图片优化**：WebP 格式，响应式图片，CDN 加速
- **数据预取**：React Query 预取下一页数据
- **状态持久化**：Zustand 持久化关键状态，减少重复请求

## 十七、第三方集成方案

### 17.1 企业微信对接

**对接场景**：
- 登录授权：企业微信扫码登录
- 消息推送：审批通知、库存预警
- 通讯录同步：员工信息自动同步

**接口清单**：

| 功能 | 接口 | 文档 |
|------|------|------|
| 获取 AccessToken | GET /cgi-bin/gettoken | 企业微信API |
| 扫码登录 | GET /connect/oauth2/authorize | 企业微信OAuth |
| 发送应用消息 | POST /cgi-bin/message/send | 企业微信API |
| 读取成员 | GET /cgi-bin/user/get | 企业微信API |

### 17.2 支付接口

**微信支付对接**：

```typescript
// 统一下单接口
interface UnifiedOrderRequest {
  body: string;           // 商品描述
  out_trade_no: string;   // 商户订单号
  total_fee: number;      // 总金额（分）
  spbill_create_ip: string;
  notify_url: string;     // 支付回调URL
  trade_type: 'JSAPI' | 'NATIVE' | 'APP';
  openid?: string;        // JSAPI必填
}
```

**支付流程**：
1. 用户选择套餐 → 创建订单
2. 调用微信支付统一下单
3. 用户完成支付
4. 微信异步通知 → 更新订单状态
5. 开通对应版本权限

### 17.3 短信服务

**阿里云短信对接**：

| 场景 | 模板Code | 变量 |
|------|---------|------|
| 注册验证码 | SMS_123456 | ${code} |
| 登录验证码 | SMS_123457 | ${code} |
| 密码重置 | SMS_123458 | ${code} |
| 库存预警 | SMS_123459 | ${productName}, ${stock} |

### 17.4 税务系统对接（Business版）

**对接规划**：
- 发票查验：对接国家税务总局发票查验平台
- 一键报税：对接电子税务局API（试点城市）
- 数据格式：支持导出标准财务报表（资产负债表、利润表）

## 十八、文档交付清单

### 18.1 开发文档

| 文档名称 | 格式 | 负责人 | 状态 |
|---------|------|--------|------|
| 产品需求文档（PRD） | Markdown | 产品经理 | ✅ 已完成 |
| API 接口文档 | Swagger/OpenAPI | 后端团队 | 🔄 开发中 |
| 数据库设计文档 | Markdown + ER图 | 架构师 | ✅ 已完成 |
| 前端组件文档 | Storybook | 前端团队 | 🔄 开发中 |
| 部署运维手册 | Markdown | DevOps | ⏳ 待编写 |
| 测试用例文档 | Markdown | 测试团队 | ⏳ 待编写 |

### 18.2 用户文档

| 文档名称 | 格式 | 目标用户 |
|---------|------|---------|
| 快速上手指南 | 图文 + 视频 | 新注册用户 |
| 功能操作手册 | 图文 | 所有用户 |
| 常见问题 FAQ | 网页 | 所有用户 |
| 数据迁移指南 | 图文 | 从其他系统迁移的用户 |
| API 开发者文档 | 网页 | Business版用户/第三方开发者 |

### 18.3 运维文档

| 文档名称 | 内容 | 更新频率 |
|---------|------|---------|
| 系统架构图 | 部署架构、网络拓扑 | 架构变更时 |
| 应急预案 | 故障处理流程、回滚方案 | 每季度 |
| 监控大盘 | Grafana Dashboard 配置 | 监控变更时 |
| 备份恢复手册 | 数据库备份策略、恢复步骤 | 每季度 |

## 十九、前端组件规范

### 19.1 Shadcn/ui 组件使用规范

#### 19.1.1 组件安装与管理

**安装方式**：
```bash
# 使用 shadcn CLI 安装组件
npx shadcn add button
npx shadcn add table
npx shadcn add dialog
npx shadcn add form
```

**禁止行为**：
- 禁止直接修改 `components/ui/` 目录下的原始组件
- 禁止复制组件代码到业务目录后修改
- 所有自定义应在组件封装层完成

#### 19.1.2 组件封装规范

**业务组件封装示例**：
```typescript
// components/business/DataTable.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  onRowClick,
  loading,
}: DataTableProps<T>) {
  // 业务封装逻辑
}
```

#### 19.1.3 常用组件清单

| 组件 | 用途 | 安装命令 |
|------|------|---------|
| Button | 按钮交互 | `npx shadcn add button` |
| Table | 数据展示 | `npx shadcn add table` |
| Dialog | 弹窗/模态框 | `npx shadcn add dialog` |
| Form | 表单处理 | `npx shadcn add form` |
| Input | 文本输入 | `npx shadcn add input` |
| Select | 下拉选择 | `npx shadcn add select` |
| DatePicker | 日期选择 | `npx shadcn add date-picker` |
| Tabs | 标签页 | `npx shadcn add tabs` |
| Card | 卡片容器 | `npx shadcn add card` |
| Badge | 状态标签 | `npx shadcn add badge` |
| Avatar | 用户头像 | `npx shadcn add avatar` |
| DropdownMenu | 下拉菜单 | `npx shadcn add dropdown-menu` |
| Toast | 消息提示 | `npx shadcn add toast` |
| Skeleton | 加载骨架 | `npx shadcn add skeleton` |

### 19.2 主题配置规范

#### 19.2.1 色彩体系

**品牌色**：
```css
/* globals.css */
@layer base {
  :root {
    --brand-50: #eff6ff;
    --brand-100: #dbeafe;
    --brand-200: #bfdbfe;
    --brand-300: #93c5fd;
    --brand-400: #60a5fa;
    --brand-500: #3b82f6;  /* 主品牌色 */
    --brand-600: #2563eb;
    --brand-700: #1d4ed8;
    --brand-800: #1e40af;
    --brand-900: #1e3a8a;
  }
}
```

**语义化颜色**：
| 语义 | 颜色值 | 用途 |
|------|--------|------|
| 成功 | `#10b981` | 操作成功、通过状态 |
| 警告 | `#f59e0b` | 待处理、警告状态 |
| 错误 | `#ef4444` | 操作失败、错误状态 |
| 信息 | `#3b82f6` | 提示信息、进行中 |
| 中性 | `#6b7280` | 禁用、次要信息 |

#### 19.2.2 Tailwind 配置

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "var(--brand-50)",
          100: "var(--brand-100)",
          200: "var(--brand-200)",
          300: "var(--brand-300)",
          400: "var(--brand-400)",
          500: "var(--brand-500)",
          600: "var(--brand-600)",
          700: "var(--brand-700)",
          800: "var(--brand-800)",
          900: "var(--brand-900)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

#### 19.2.3 响应式断点

| 断点 | 尺寸 | 用途 |
|------|------|------|
| `sm` | 640px | 手机横屏 |
| `md` | 768px | 平板竖屏 |
| `lg` | 1024px | 平板横屏/小笔记本 |
| `xl` | 1280px | 桌面显示器 |
| `2xl` | 1536px | 大屏显示器 |

**移动端优先原则**：
```tsx
// 示例：移动端单列，桌面端双列
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### 19.3 表单规范

#### 19.3.1 表单组件标准

```typescript
// 使用 React Hook Form + Zod 进行表单校验
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  customerName: z.string().min(2, "客户名称至少2个字符"),
  phone: z.string().regex(/^1[3-9]\d{9}$/, "手机号格式不正确"),
  amount: z.number().min(0, "金额不能为负数"),
});

type FormValues = z.infer<typeof formSchema>;
```

#### 19.3.2 表单布局规范

| 场景 | 布局 | 示例 |
|------|------|------|
| 简单表单 | 单列布局 | 登录、注册 |
| 复杂表单 | 双列布局 | 订单创建、客户编辑 |
| 大量字段 | 分组卡片 | 系统设置、企业资料 |

### 19.4 图标规范

**图标库**：Lucide React（与 Shadcn/ui 配套）

```typescript
import { Plus, Trash2, Edit, Search, Filter } from "lucide-react";

// 使用规范
<Button>
  <Plus className="mr-2 h-4 w-4" />
  新增
</Button>
```

**图标尺寸**：
| 场景 | 尺寸 | 示例 |
|------|------|------|
| 按钮内图标 | 16px (`h-4 w-4`) | 操作按钮 |
| 列表项图标 | 20px (`h-5 w-5`) | 菜单项 |
| 空状态图标 | 48px (`h-12 w-12`) | 空数据提示 |
| 页面标题图标 | 24px (`h-6 w-6`) | 页面头部 |

## 二十、错误码规范

### 20.1 错误码体系

#### 20.1.1 错误码格式

**格式**：`A-BBB-C`
- `A`：错误级别（1=系统级，2=业务级，3=参数级）
- `BBB`：模块编码（001=通用，002=认证，003=CRM...）
- `C`：具体错误序号

#### 20.1.2 通用错误码（1-001-X）

| 错误码 | 错误信息 | HTTP状态码 | 说明 |
|--------|---------|-----------|------|
| `1-001-1` | 系统内部错误 | 500 | 未预期的服务器错误 |
| `1-001-2` | 服务暂时不可用 | 503 | 降级或维护中 |
| `1-001-3` | 请求超时 | 504 | 网关超时 |
| `1-001-4` | 数据库连接失败 | 500 | 数据库异常 |
| `1-001-5` | 缓存服务异常 | 500 | Redis 连接失败 |

#### 20.1.3 认证授权错误码（2-002-X）

| 错误码 | 错误信息 | HTTP状态码 | 说明 |
|--------|---------|-----------|------|
| `2-002-1` | 未授权访问 | 401 | Token 缺失或无效 |
| `2-002-2` | Token 已过期 | 401 | Access Token 过期 |
| `2-002-3` | Refresh Token 无效 | 401 | 刷新令牌失效 |
| `2-002-4` | 无权限访问 | 403 | 角色权限不足 |
| `2-002-5` | 企业未激活 | 403 | 企业账号被禁用 |
| `2-002-6` | 登录失败 | 401 | 用户名或密码错误 |
| `2-002-7` | 账号已锁定 | 403 | 多次登录失败锁定 |

#### 20.1.4 参数校验错误码（3-003-X）

| 错误码 | 错误信息 | HTTP状态码 | 说明 |
|--------|---------|-----------|------|
| `3-003-1` | 参数格式错误 | 400 | 请求体 JSON 格式错误 |
| `3-003-2` | 必填参数缺失 | 400 | 缺少必需字段 |
| `3-003-3` | 参数类型错误 | 400 | 字段类型不匹配 |
| `3-003-4` | 参数超出范围 | 400 | 数值超出限制 |
| `3-003-5` | 手机号格式错误 | 400 | 手机号正则校验失败 |
| `3-003-6` | 邮箱格式错误 | 400 | 邮箱正则校验失败 |

#### 20.1.5 业务模块错误码

**CRM 模块（2-003-X）**：
| 错误码 | 错误信息 | HTTP状态码 |
|--------|---------|-----------|
| `2-003-1` | 客户不存在 | 404 |
| `2-003-2` | 客户手机号已存在 | 409 |
| `2-003-3` | 客户关联订单，无法删除 | 409 |

**进销存模块（2-004-X）**：
| 错误码 | 错误信息 | HTTP状态码 |
|--------|---------|-----------|
| `2-004-1` | 商品不存在 | 404 |
| `2-004-2` | 商品编码已存在 | 409 |
| `2-004-3` | 库存不足 | 409 |
| `2-004-4` | 订单不存在 | 404 |
| `2-004-5` | 订单状态不允许操作 | 409 |
| `2-004-6` | 订单已审核，无法修改 | 409 |

**财务模块（2-005-X）**：
| 错误码 | 错误信息 | HTTP状态码 |
|--------|---------|-----------|
| `2-005-1` | 发票不存在 | 404 |
| `2-005-2` | 发票号码已存在 | 409 |
| `2-005-3` | 凭证不存在 | 404 |
| `2-005-4` | 会计期间已结账 | 409 |
| `2-005-5` | 借贷不平衡 | 400 |

**OA 模块（2-006-X）**：
| 错误码 | 错误信息 | HTTP状态码 |
|--------|---------|-----------|
| `2-006-1` | 审批流程不存在 | 404 |
| `2-006-2` | 审批单不存在 | 404 |
| `2-006-3` | 审批状态不允许操作 | 409 |
| `2-006-4` | 无审批权限 | 403 |

### 20.2 错误响应格式

**标准错误响应**：
```json
{
  "code": "2-004-3",
  "message": "库存不足",
  "data": {
    "productId": 1001,
    "productName": "螺丝刀套装",
    "currentStock": 5,
    "requiredStock": 20
  }
}
```

**参数校验错误响应**：
```json
{
  "code": "3-003-2",
  "message": "必填参数缺失",
  "data": {
    "fields": [
      {
        "field": "customerName",
        "message": "客户名称不能为空"
      },
      {
        "field": "phone",
        "message": "手机号不能为空"
      }
    ]
  }
}
```

### 20.3 错误码使用规范

#### 20.3.1 后端使用规范

```typescript
// 抛出业务异常（可继承 HttpException 或项目内 BusinessException）
throw new BusinessException('2-004-3', '库存不足', {
  productId: 1001,
  productName: '螺丝刀套装',
  currentStock: 5,
  requiredStock: 20,
});

// 全局异常过滤器（NestJS，节选）
import { Catch, ExceptionFilter, ArgumentsHost } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(err: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();

    if (err instanceof BusinessException) {
      return res.status(err.httpStatus).json({
        code: err.code,
        message: err.message,
        data: err.data,
      });
    }

    logger.error('Unexpected error', err);
    return res.status(500).json({
      code: '1-001-1',
      message: '系统内部错误',
      data: null,
    });
  }
}
```

#### 20.3.2 前端处理规范

```typescript
// API 错误处理封装
async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    const error = new ApiError(data.code, data.message, data.data);
    
    // 根据错误码分类处理
    switch (error.code.split('-')[0]) {
      case '2': // 业务错误
        toast.error(error.message);
        break;
      case '3': // 参数错误
        // 表单校验错误，由表单组件处理
        throw error;
      default: // 系统错误
        toast.error('系统繁忙，请稍后重试');
        logger.error('System error', error);
    }
    
    throw error;
  }
  
  return data;
}
```

#### 20.3.3 错误码维护规范

1. **新增错误码**：需向架构师申请，避免重复
2. **错误码文档**：每个模块维护独立的错误码清单
3. **多语言支持**：错误信息支持中文/英文切换
4. **监控告警**：系统级错误（1-001-X）自动触发告警

> （注：文档部分内容由 AI 生成）