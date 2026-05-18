# 优效营安全功能说明文档

本文档详细说明优效营系统的安全功能实现，包括配置、使用方法和最佳实践。

## 目录

1. [安全功能概览](#安全功能概览)
2. [Helmet 安全中间件](#helmet-安全中间件)
3. [CSRF 防护](#csrf-防护)
4. [请求频率限制](#请求频率限制)
5. [结构化日志系统](#结构化日志系统)
6. [性能监控指标](#性能监控指标)
7. [生产环境配置](#生产环境配置)
8. [故障排查](#故障排查)

---

## 安全功能概览

优效营系统集成了多层安全防护机制：

| 安全功能 | 作用 | 配置复杂度 |
|---------|------|-----------|
| Helmet 安全头 | HTTP 安全头保护 | 自动，无需配置 |
| CSRF Token 防护 | 防止跨站请求伪造 | 自动，前端已集成 |
| 请求频率限制 | 防止暴力破解和 DDoS | 自动，可调整阈值 |
| 结构化日志 | 安全审计和故障排查 | 环境变量配置 |
| 性能监控 | 系统健康监控 | 自动，提供指标端点 |

---

## Helmet 安全中间件

### 功能说明

Helmet 自动配置以下 HTTP 安全头：

```http
# 内容安全策略
Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data: https:; connect-src 'self'; font-src 'self'; object-src 'none'; media-src 'self'; frame-src 'none'

# 强制 HTTPS (HSTS)
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload

# 防止 MIME 类型嗅探
X-Content-Type-Options: nosniff

# 防止点击劫持
X-Frame-Options: DENY

# XSS 过滤
X-XSS-Protection: 1; mode=block

# 引用策略
Referrer-Policy: strict-origin-when-cross-origin
```

### 配置说明

Helmet 中间件已自动集成，无需额外配置。如需自定义，修改：

```typescript
// uxyy-api/src/app.bootstrap.ts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // 自定义 CSP 规则
        scriptSrc: ["'self'", "'unsafe-inline'"], // 如需内联脚本
      },
    },
  })
);
```

### 验证方法

```bash
# 查看响应头
curl -I https://your-domain.com/api/health
```

---

## CSRF 防护

### 工作原理

采用**双提交 Cookie 模式**：

1. 服务端生成随机 CSRF Token，存入 Cookie（`XSRF-TOKEN`）
2. 前端从 Cookie 读取 Token，添加到请求头（`X-CSRF-Token`）
3. 服务端验证请求头中的 Token 与 Cookie 中的 Token 是否匹配

### 前端集成

前端已自动集成 CSRF 防护：

```typescript
// 前端 API 客户端自动处理
import { apiClient } from '@/lib/api/client';

// 自动携带 CSRF Token
await apiClient.post('/auth/login', { phone, password });
```

### 手动使用

如需手动发送请求：

```javascript
// 从 Cookie 获取 Token
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('XSRF-TOKEN='))
  ?.split('=')[1];

// 添加到请求头
fetch('/api/v1/some-endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify(data),
});
```

### 排除路径

以下路径不需要 CSRF Token：

- `GET /api/v1/auth/csrf-token` - 获取 Token 接口
- `POST /api/v1/auth/login` - 登录接口
- `POST /api/v1/auth/register` - 注册接口
- `POST /api/v1/auth/refresh` - 刷新 Token
- `GET /health` - 健康检查
- `GET /metrics` - 监控指标

---

## 请求频率限制

### 限流规则

| 端点类型 | 限制 | 时间窗口 |
|---------|------|---------|
| 登录 | 5 次 | 1 分钟 |
| 注册 | 3 次 | 1 分钟 |
| 敏感操作 | 10 次 | 1 分钟 |
| 默认 | 100 次 | 1 分钟 |

### 限流响应

触发限流时返回 429 状态码：

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704067200
Retry-After: 60

{
  "code": 429,
  "message": "请求过于频繁，请 60 秒后重试"
}
```

### 调整限流阈值

```typescript
// uxyy-api/src/common/interceptors/rate-limit.interceptor.ts
private readonly limits: Record<string, RateLimitConfig> = {
  login: { windowMs: 60 * 1000, maxRequests: 10 }, // 调整为 10 次/分钟
  register: { windowMs: 60 * 1000, maxRequests: 5 },
  sensitive: { windowMs: 60 * 1000, maxRequests: 20 },
  default: { windowMs: 60 * 1000, maxRequests: 200 },
};
```

---

## 结构化日志系统

### 日志级别

| 级别 | 使用场景 |
|-----|---------|
| debug | 开发调试信息 |
| info | 一般信息，请求记录 |
| warn | 警告，如慢请求 |
| error | 错误信息 |

### 开发环境日志

```bash
# 彩色格式化输出
[2026-05-18 10:30:45.123] INFO (12345): request completed
    req: {
      "id": "req-abc123",
      "method": "GET",
      "url": "/api/v1/users"
    }
    res: {
      "statusCode": 200,
      "duration": 45
    }
```

### 生产环境日志

```json
{"level":30,"time":1704067200123,"pid":12345,"hostname":"server-1","req":{"id":"req-abc123","method":"GET","url":"/api/v1/users","headers":{"user-agent":"Mozilla/5.0"}},"res":{"statusCode":200},"duration":45,"msg":"request completed"}
```

### 配置日志级别

```bash
# .env
LOG_LEVEL=info
```

### 日志字段说明

| 字段 | 说明 |
|-----|------|
| `req.id` | 请求唯一 ID |
| `req.method` | HTTP 方法 |
| `req.url` | 请求路径 |
| `res.statusCode` | 响应状态码 |
| `duration` | 响应时间（毫秒） |
| `userId` | 用户 ID（已登录时） |

### 敏感信息清理

以下字段自动从日志中移除：

- `password`
- `token`
- `secret`
- `authorization`
- `cookie`
- `creditCard`

---

## 性能监控指标

### 指标端点

```bash
# 获取 Prometheus 格式指标
curl https://your-domain.com/metrics
```

### 指标说明

#### HTTP 请求指标

```
# 请求总数
http_requests_total{method="GET",path="/api/v1/users",status="200"} 1000

# 5xx 错误数
http_requests_errors_5xx{method="POST",path="/api/v1/auth/login"} 5

# 4xx 错误数
http_requests_errors_4xx{method="GET",path="/api/v1/users"} 20

# 响应时间分布（毫秒）
http_request_duration_ms_bucket{method="GET",path="/api/v1/users",le="100"} 800
http_request_duration_ms_bucket{method="GET",path="/api/v1/users",le="500"} 950
http_request_duration_ms_bucket{method="GET",path="/api/v1/users",le="1000"} 990
http_request_duration_ms_sum{method="GET",path="/api/v1/users"} 45000
http_request_duration_ms_count{method="GET",path="/api/v1/users"} 1000
```

#### 数据库指标

```
# 数据库查询总数
db_queries_total{table="users",operation="select"} 5000

# 慢查询数（>1000ms）
db_queries_slow_total{table="users"} 10

# 查询时间分布
db_query_duration_ms_bucket{table="users",operation="select",le="50"} 4000
```

#### 业务指标

```
# 用户登录次数
business_logins_total{type="password"} 1000
business_logins_total{type="refresh"} 500

# 导出任务数
business_exports_total{status="success"} 100
business_exports_total{status="failed"} 5
```

### 慢请求警告

响应时间超过 1000ms 的请求会记录警告日志：

```json
{"level":40,"time":1704067200123,"msg":"Slow request detected","duration":1500,"path":"/api/v1/reports"}
```

---

## 生产环境配置

### 必需环境变量

```bash
# 基础配置
NODE_ENV=production
ALLOWED_ORIGINS=https://your-domain.com,https://app.your-domain.com

# JWT 密钥（使用强随机字符串）
JWT_ACCESS_SECRET=your-256-bit-secret-min-32-characters
JWT_REFRESH_SECRET=your-256-bit-refresh-secret-min-32-characters

# 日志配置
LOG_LEVEL=info

# 数据库和缓存
DATABASE_URL=postgresql://user:password@host:5432/uxyy
REDIS_URL=redis://default:password@host:6379
```

### 生成强随机密钥

```bash
# 生成 64 字符随机字符串
openssl rand -base64 48

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

### Docker 部署配置

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    image: uxyy-api:latest
    environment:
      - NODE_ENV=production
      - ALLOWED_ORIGINS=https://your-domain.com
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - LOG_LEVEL=info
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    ports:
      - "3000:3000"
    restart: unless-stopped
```

---

## 故障排查

### CSRF 验证失败

**症状**: 403 Forbidden，错误信息 "Invalid CSRF token"

**排查步骤**:

1. 检查 Cookie 中是否存在 `XSRF-TOKEN`
2. 检查请求头是否包含 `X-CSRF-Token`
3. 确认两个 Token 值相同
4. 检查请求路径是否在排除列表中

**解决方案**:

```javascript
// 确保前端正确携带 Token
const response = await fetch('/api/v1/some-endpoint', {
  method: 'POST',
  credentials: 'include', // 重要：携带 Cookie
  headers: {
    'X-CSRF-Token': getCsrfTokenFromCookie(),
  },
});
```

### 触发限流

**症状**: 429 Too Many Requests

**排查步骤**:

1. 检查响应头 `X-RateLimit-Remaining` 是否为 0
2. 检查 `Retry-After` 等待时间
3. 确认请求频率是否超过限制

**解决方案**:

- 实现前端请求队列和重试机制
- 增加指数退避策略
- 必要时调整限流阈值

### 日志不输出

**症状**: 看不到应用日志

**排查步骤**:

1. 检查 `LOG_LEVEL` 设置
2. 确认日志输出目标（stdout/文件）
3. 检查日志文件权限

**解决方案**:

```bash
# 查看容器日志
docker logs uxyy-api-container

# 进入容器查看日志文件
docker exec -it uxyy-api-container cat /var/log/uxyy/app.log
```

### 指标端点无法访问

**症状**: `/metrics` 返回 404

**排查步骤**:

1. 确认 MetricsModule 已正确导入
2. 检查端点是否被排除在全局前缀外
3. 查看应用启动日志

**解决方案**:

```typescript
// app.bootstrap.ts
app.setGlobalPrefix('api/v1', {
  exclude: [
    { path: 'metrics', method: RequestMethod.ALL }, // 确保已排除
  ],
});
```

---

## 安全最佳实践

1. **定期轮换密钥**: JWT 密钥建议每 3-6 个月轮换一次
2. **监控异常请求**: 定期检查日志中的 403/429 错误
3. **配置告警**: 对 5xx 错误率和慢请求设置告警阈值
4. **HTTPS 强制**: 生产环境必须启用 HTTPS，HSTS 已自动配置
5. **CORS 限制**: 严格配置 `ALLOWED_ORIGINS`，不要允许所有来源
6. **日志审计**: 定期审计日志，发现异常访问模式

---

## 相关文档

- [部署指南](../DEPLOY.md)
- [API 文档](./api-documentation.md)
- [CHANGELOG](../CHANGELOG.md)
