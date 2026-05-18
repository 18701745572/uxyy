# Sealos 部署指南

## 项目结构

- `uxyy-web` - Next.js 前端应用
- `uxyy-api` - NestJS 后端 API
- `uxyy-shared` - 共享类型和工具

## 部署前准备

### 1. 在 Sealos 控制台创建依赖服务

#### 创建 PostgreSQL 数据库
1. 进入 Sealos 控制台
2. 点击「数据库」→「创建数据库」
3. 选择 PostgreSQL，配置：
   - 数据库名称: `uxyy`
   - 用户名: `postgres`
   - 密码: 设置强密码
   - 规格: 按需选择（建议至少 1GB 内存）
4. 记录连接信息（主机地址、端口、密码）

#### 创建 Redis 实例
1. 点击「数据库」→「创建数据库」
2. 选择 Redis，配置：
   - 实例名称: `uxyy-redis`
   - 密码: 设置强密码
3. 记录连接信息

### 2. 修改配置文件

#### 更新 `sealos.yaml`

打开 `sealos.yaml`，修改以下环境变量：

```yaml
# 后端 API 环境变量
- name: DATABASE_URL
  value: "postgresql://postgres:你的密码@your-postgres-host:5432/uxyy"
- name: REDIS_URL
  value: "redis://default:你的密码@your-redis-host:6379"
- name: JWT_ACCESS_SECRET
  value: "your-strong-random-access-secret-min-32-chars"
- name: JWT_REFRESH_SECRET
  value: "your-strong-random-refresh-secret-min-32-chars"

# 前端 Ingress 域名
- host: your-domain.hzh.sealos.run  # 替换为你的 Sealos 子域名
```

生成强随机密钥：
```bash
openssl rand -base64 64
```

## 构建和部署

### 方法一：使用 Sealos CLI

#### 1. 安装 Sealos CLI
```bash
curl -sfL https://raw.githubusercontent.com/labring/sealos/main/scripts/cloud/install.sh -o /tmp/install.sh && bash /tmp/install.sh
```

#### 2. 登录 Sealos
```bash
sealos login cloud.sealos.io -u your-username -p your-password
```

#### 3. 构建镜像
```bash
# 在项目根目录执行

# 构建后端镜像
docker build -t uxyy-api:latest -f uxyy-api/Dockerfile .

# 构建前端镜像
docker build -t uxyy-web:latest -f uxyy-web/Dockerfile .
```

#### 4. 推送镜像到 Sealos 镜像仓库
```bash
# 标记镜像（替换为你的 Sealos 用户名）
docker tag uxyy-api:latest sealos.hub:5000/your-username/uxyy-api:latest
docker tag uxyy-web:latest sealos.hub:5000/your-username/uxyy-web:latest

# 推送
docker push sealos.hub:5000/your-username/uxyy-api:latest
docker push sealos.hub:5000/your-username/uxyy-web:latest
```

#### 5. 部署到 Sealos
```bash
sealos apply -f sealos.yaml
```

### 方法二：使用 Sealos 控制台（推荐）

#### 1. 构建并推送镜像到 Docker Hub
```bash
# 登录 Docker Hub
docker login

# 构建并推送
docker build -t your-dockerhub-username/uxyy-api:latest -f uxyy-api/Dockerfile .
docker build -t your-dockerhub-username/uxyy-web:latest -f uxyy-web/Dockerfile .
docker push your-dockerhub-username/uxyy-api:latest
docker push your-dockerhub-username/uxyy-web:latest
```

#### 2. 在 Sealos 控制台部署
1. 进入「应用管理」→「创建应用」
2. 选择「从镜像部署」
3. 先部署后端：
   - 镜像: `your-dockerhub-username/uxyy-api:latest`
   - 端口: 3000
   - 环境变量: 配置 DATABASE_URL、REDIS_URL、JWT 密钥等
4. 再部署前端：
   - 镜像: `your-dockerhub-username/uxyy-web:latest`
   - 端口: 3001
   - 环境变量: API_URL=http://后端服务名:3000

#### 3. 配置外网访问
1. 为前端服务创建 Ingress
2. 绑定你的 `hzh.sealos.run` 子域名

## 数据库迁移

部署完成后，需要执行数据库迁移：

```bash
# 进入后端 Pod
kubectl exec -it uxyy-api-pod-name -- /bin/sh

# 执行迁移
cd /app/uxyy-api
pnpm run db:migrate

# 可选：初始化种子数据
pnpm run db:seed
```

## 验证部署

1. **健康检查**
   ```bash
   curl https://your-domain.hzh.sealos.run/api/health
   ```

2. **前端访问**
   打开浏览器访问: `https://your-domain.hzh.sealos.run`

3. **API 测试**
   ```bash
   curl https://your-domain.hzh.sealos.run/api/auth/login \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"phone":"13800138000","password":"Dev12345!"}'
   ```

## 常见问题

### 1. 前端无法连接后端
- 检查 `API_URL` 环境变量是否正确
- 确认后端服务是否正常运行
- 查看前端容器日志: `kubectl logs uxyy-web-pod-name`

### 2. 数据库连接失败
- 检查 `DATABASE_URL` 格式是否正确
- 确认 PostgreSQL 服务是否允许外部连接
- 验证网络策略是否允许访问数据库

### 3. 镜像构建失败
- 确保在项目根目录执行构建命令
- 检查 Dockerfile 路径是否正确
- 确认 pnpm-lock.yaml 存在

### 4. 内存不足
- 在 `sealos.yaml` 中增加资源限制
- 建议后端至少 1GB 内存

## 更新部署

```bash
# 重新构建镜像
docker build -t uxyy-api:latest -f uxyy-api/Dockerfile .
docker build -t uxyy-web:latest -f uxyy-web/Dockerfile .

# 推送镜像
docker push your-registry/uxyy-api:latest
docker push your-registry/uxyy-web:latest

# 重启部署
kubectl rollout restart deployment/uxyy-api
kubectl rollout restart deployment/uxyy-web
```

## 监控和日志

```bash
# 查看 Pod 状态
kubectl get pods

# 查看日志
kubectl logs -f deployment/uxyy-api
kubectl logs -f deployment/uxyy-web

# 进入容器调试
kubectl exec -it uxyy-api-pod-name -- /bin/sh
```

## 生产环境安全配置

### 必需的环境变量

部署到生产环境时，必须配置以下安全相关的环境变量：

```yaml
# 基础安全配置
- name: NODE_ENV
  value: "production"
- name: ALLOWED_ORIGINS
  value: "https://your-domain.com,https://app.your-domain.com"

# JWT 密钥（必需强随机字符串，至少 32 字符）
- name: JWT_ACCESS_SECRET
  value: "your-strong-random-access-secret-min-32-chars"
- name: JWT_REFRESH_SECRET
  value: "your-strong-random-refresh-secret-min-32-chars"

# 日志配置
- name: LOG_LEVEL
  value: "info"  # 可选: debug, info, warn, error
- name: LOG_FILE_PATH
  value: "/var/log/uxyy/app.log"  # 可选，默认输出到 stdout

# 数据库和缓存
- name: DATABASE_URL
  value: "postgresql://postgres:your-password@host:5432/uxyy"
- name: REDIS_URL
  value: "redis://default:your-password@host:6379"

# 备份目录
- name: BACKUP_DIR
  value: "/app/backups"
```

### 安全功能说明

系统已集成以下安全功能：

1. **Helmet 安全头**
   - Content Security Policy (CSP)
   - HSTS (HTTP Strict Transport Security)
   - XSS 过滤
   - 点击劫持防护
   - 自动配置，无需额外操作

2. **CSRF 防护**
   - 双提交 Cookie 模式
   - 自动验证非安全请求
   - 前端自动获取和提交 Token

3. **请求频率限制**
   - 登录接口：5次/分钟
   - 注册接口：3次/分钟
   - 敏感操作：10次/分钟
   - 默认接口：100次/分钟

4. **结构化日志**
   - 生产环境输出 JSON 格式
   - 自动清理敏感信息
   - 支持请求链路追踪

5. **性能监控**
   - 访问 `/metrics` 查看系统指标
   - HTTP 请求统计
   - 数据库查询性能
   - 错误率监控

### 监控和告警

#### 查看指标
```bash
# 获取 Prometheus 格式的指标
curl https://your-domain.hzh.sealos.run/metrics
```

#### 日志查看
```bash
# 查看应用日志
kubectl logs -f deployment/uxyy-api

# 查看结构化日志（JSON 格式）
kubectl logs deployment/uxyy-api | jq .
```

## 安全建议

1. **JWT 密钥**: 使用强随机字符串，不要提交到 Git
2. **数据库密码**: 定期更换，使用复杂密码
3. **环境变量**: 使用 Sealos 的密钥管理功能
4. **HTTPS**: 强制使用 HTTPS 访问
5. **资源限制**: 设置合理的资源限制防止滥用
6. **CORS 配置**: 生产环境必须设置 `ALLOWED_ORIGINS`，不要允许所有来源
7. **日志安全**: 生产环境日志自动清理敏感字段（密码、token 等）
8. **定期备份**: 配置数据库自动备份策略
