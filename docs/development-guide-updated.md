# 优效营开发指南 v2.0

> 本文档基于多智能体并行开发实践总结，包含代码审查规范、API 设计标准和最佳实践。

**更新日期**: 2026-05-04  
**适用版本**: v1.0+  
**维护团队**: 优效营开发团队

---

## 目录

1. [代码审查规范](#1-代码审查规范)
2. [API 设计标准](#2-api-设计标准)
3. [数据库设计规范](#3-数据库设计规范)
4. [Git Worktree 工作流](#4-git-worktree-工作流)
5. [测试策略](#5-测试策略)
6. [部署指南](#6-部署指南)

---

## 1. 代码审查规范

### 1.1 审查清单

每个智能体在提交代码前必须完成以下检查：

#### 基础检查
- [ ] 代码通过 `pnpm run lint` 无错误
- [ ] 代码通过 `pnpm run typecheck` 无类型错误
- [ ] 所有新增功能有对应的单元测试
- [ ] 测试覆盖率不低于 80%

#### 安全审查
- [ ] 没有硬编码的密钥或密码
- [ ] 所有输入都有验证和过滤
- [ ] 企业数据隔离正确实现
- [ ] 敏感操作有权限检查

#### 性能审查
- [ ] 数据库查询有适当的索引
- [ ] 没有 N+1 查询问题
- [ ] 大数据量查询有分页
- [ ] 缓存策略合理

### 1.2 审查流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  代码编写    │ -> │  自测通过    │ -> │  提交 PR    │
└─────────────┘    └─────────────┘    └──────┬──────┘
                                              │
┌─────────────┐    ┌─────────────┐    ┌──────▼──────┐
│  合并到主分支 │ <- │  审查通过    │ <- │  交叉审查    │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 1.3 审查重点

#### Auth 模块审查要点
- JWT Token 生成和验证逻辑
- 密码加密和存储安全
- 企业上下文传递正确性
- 角色权限检查完整性

#### Inventory 模块审查要点
- 库存事务一致性
- 并发控制机制
- 库存预警逻辑
- 订单状态流转

#### Finance 模块审查要点
- 金额计算精度
- 借贷平衡校验
- 会计期间处理
- 报表数据准确性

#### CRM 模块审查要点
- 客户数据隐私保护
- 商机阶段流转
- 跟进记录完整性
- 销售漏斗统计

#### AI 模块审查要点
- API Key 安全管理
- 异步任务处理
- 队列失败重试
- OCR 结果验证

---

## 2. API 设计标准

### 2.1 URL 规范

```
/api/v1/{module}/{resource}/{action}
```

**示例**:
- `GET /api/v1/inventory/products` - 获取商品列表
- `POST /api/v1/inventory/products` - 创建商品
- `GET /api/v1/inventory/products/:id` - 获取商品详情
- `PUT /api/v1/inventory/products/:id` - 更新商品
- `DELETE /api/v1/inventory/products/:id` - 删除商品

### 2.2 HTTP 方法

| 方法 | 用途 | 幂等性 |
|-----|------|-------|
| GET | 获取资源 | ✅ |
| POST | 创建资源 | ❌ |
| PUT | 全量更新 | ✅ |
| PATCH | 部分更新 | ✅ |
| DELETE | 删除资源 | ✅ |

### 2.3 请求响应规范

#### 成功响应

```json
{
  "code": 200,
  "data": {
    "id": 1,
    "name": "商品名称"
  },
  "message": "success"
}
```

#### 列表响应

```json
{
  "code": 200,
  "data": {
    "list": [...],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

#### 错误响应

```json
{
  "code": 400,
  "error": "INVALID_PARAMETER",
  "message": "参数错误：name 不能为空",
  "details": {
    "field": "name",
    "issue": "required"
  }
}
```

### 2.4 状态码使用

| 状态码 | 使用场景 |
|-------|---------|
| 200 | 请求成功 |
| 201 | 资源创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如重复） |
| 422 | 业务逻辑错误 |
| 500 | 服务器内部错误 |

---

## 3. 数据库设计规范

### 3.1 命名规范

- **表名**: 小写复数，下划线分隔，如 `purchase_orders`
- **字段名**: 小写，下划线分隔，如 `created_at`
- **索引名**: `idx_{table}_{field}`，如 `idx_products_enterprise_id`
- **外键名**: `fk_{table}_{ref_table}`，如 `fk_orders_customer_id`

### 3.2 必备字段

每个表必须包含以下字段：

```typescript
{
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'), // 软删除
}
```

### 3.3 索引策略

```sql
-- 主键索引（自动创建）
PRIMARY KEY (id)

-- 外键索引
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- 复合索引
CREATE INDEX idx_products_enterprise_category ON products(enterprise_id, category);

-- 唯一索引
CREATE UNIQUE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL;

-- 部分索引
CREATE INDEX idx_orders_pending ON orders(status) WHERE status = 'pending';
```

### 3.4 金额字段

金额必须使用字符串存储，避免精度丢失：

```typescript
{
  amount: varchar('amount', { length: 20 }).notNull(), // 存储为字符串
  // 使用时转换为 Decimal
}
```

---

## 4. Git Worktree 工作流

### 4.1 工作流架构

```
┌─────────────────────────────────────────────────────────┐
│                      主仓库 (main)                       │
│                   c:\Users\1\Desktop\uxyy.cn\uxyy        │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬────────────┐
        │            │            │            │
        ▼            ▼            ▼            ▼
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│agent-auth │ │agent-inv  │ │agent-fin  │ │ 其他...    │
│feature/   │ │feature/   │ │feature/   │ │            │
│auth-init  │ │inventory  │ │finance    │ │            │
└───────────┘ └───────────┘ └───────────┘ └───────────┘
```

### 4.2 常用命令

```powershell
# 查看所有 worktree
git worktree list

# 创建新的 worktree
git worktree add ../worktrees/agent-feature feature/branch-name

# 进入 worktree 目录工作
cd ../worktrees/agent-feature

# 在 worktree 中提交代码
git add -A
git commit -m "feat: xxx"
git push origin feature/branch-name

# 删除 worktree
git worktree remove ../worktrees/agent-feature

# 清理无效的 worktree
git worktree prune
```

### 4.3 工作流程

1. **创建功能分支**
   ```powershell
   git checkout -b feature/auth-login develop
   git worktree add ../worktrees/agent-auth-login feature/auth-login
   ```

2. **在 worktree 中开发**
   ```powershell
   cd ../worktrees/agent-auth-login
   # 编写代码
   pnpm run dev
   ```

3. **提交代码**
   ```powershell
   git add -A
   git commit -m "feat(auth): 添加登录功能"
   git push origin feature/auth-login
   ```

4. **创建 PR 合并到 develop**
   ```powershell
   gh pr create --base develop --title "feat(auth): 添加登录功能"
   ```

5. **清理 worktree**
   ```powershell
   git checkout develop
   git worktree remove ../worktrees/agent-auth-login
   git branch -d feature/auth-login
   ```

---

## 5. 测试策略

### 5.1 测试金字塔

```
        /\
       /  \
      / E2E \      <- 端到端测试 (少量)
     /--------\
    / 集成测试 \   <- API 集成测试 (中等)
   /------------\
  /   单元测试    \ <- 单元测试 (大量)
 /----------------\
```

### 5.2 单元测试规范

```typescript
// inventory.service.spec.ts
describe('InventoryService', () => {
  let service: InventoryService;
  let db: Mocked<AppDrizzleDb>;

  beforeEach(() => {
    db = createMockDb();
    service = new InventoryService(db);
  });

  describe('createProduct', () => {
    it('should create product successfully', async () => {
      // Arrange
      const dto = { name: 'Test Product', price: 100 };
      
      // Act
      const result = await service.createProduct(1, dto);
      
      // Assert
      expect(result.name).toBe(dto.name);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should throw error when enterprise not found', async () => {
      // Arrange
      const dto = { name: 'Test Product' };
      
      // Act & Assert
      await expect(service.createProduct(undefined, dto))
        .rejects.toThrow(ForbiddenException);
    });
  });
});
```

### 5.3 集成测试规范

```typescript
// inventory.e2e-spec.ts
describe('InventoryController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/inventory/products (GET)', () => {
    return request(app.getHttpServer())
      .get('/inventory/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(200);
        expect(res.body.data.list).toBeDefined();
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

---

## 6. 部署指南

### 6.1 环境配置

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: ./uxyy-api
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis

  web:
    build: ./uxyy-web
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:3001

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=uxyy
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=uxyy
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 6.2 部署流程

```powershell
# 1. 构建镜像
docker-compose build

# 2. 运行数据库迁移
docker-compose run --rm api pnpm run db:migrate

# 3. 启动服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f api

# 5. 健康检查
curl http://localhost:3001/health
```

### 6.3 CI/CD 流程

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - name: Install dependencies
        run: pnpm install
      - name: Run linter
        run: pnpm run lint
      - name: Run type check
        run: pnpm run typecheck
      - name: Run tests
        run: pnpm run test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          # 部署脚本
```

---

## 附录

### A. 常用命令速查

```powershell
# 开发
pnpm run dev          # 启动开发服务器
pnpm run build        # 构建项目
pnpm run lint         # 代码检查
pnpm run typecheck    # 类型检查
pnpm run test         # 运行测试

# 数据库
pnpm run db:generate  # 生成迁移文件
pnpm run db:migrate   # 执行迁移
pnpm run db:seed      # 填充测试数据
pnpm run db:studio    # 打开 Drizzle Studio

# Git
git worktree list                    # 列出 worktree
git worktree add <path> <branch>     # 添加 worktree
git worktree remove <path>           # 删除 worktree
```

### B. 目录结构

```
uxyy/
├── uxyy-api/              # 后端 API
│   ├── src/
│   │   ├── modules/       # 业务模块
│   │   ├── db/           # 数据库配置
│   │   └── main.ts       # 入口文件
│   └── package.json
├── uxyy-web/             # 前端应用
│   ├── src/
│   │   ├── app/          # Next.js 页面
│   │   └── lib/          # 工具函数
│   └── package.json
├── uxyy-shared/          # 共享代码
│   └── src/
├── docs/                 # 文档
│   ├── api-documentation.md
│   └── code-review-report.md
├── worktrees/            # Git Worktree 目录
│   ├── agent-auth/
│   ├── agent-inventory/
│   └── ...
└── package.json
```

### C. 联系方式

- **技术负责人**: [待填写]
- **产品负责人**: [待填写]
- **运维负责人**: [待填写]

---

**文档版本**: v2.0  
**最后更新**: 2026-05-04  
**维护团队**: 优效营开发团队
