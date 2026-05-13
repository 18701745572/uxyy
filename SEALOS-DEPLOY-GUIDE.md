# 优效营 (uxyy) Sealos 分步部署指南

> 目标：将项目部署到 https://hzh.sealos.run/

---

## 📋 部署前准备清单

- [ ] Sealos 账号（访问 https://cloud.sealos.io 注册）
- [ ] Docker Desktop 或 Docker 环境
- [ ] 项目代码已更新到最新
- [ ] 大约 30-60 分钟时间

---

## 第一步：创建基础服务（在 Sealos 控制台）

### 1.1 登录 Sealos 控制台

1. 打开浏览器访问：https://cloud.sealos.io
2. 使用手机号或邮箱注册/登录
3. 进入控制台首页

### 1.2 创建 PostgreSQL 数据库

1. 点击左侧菜单 **「数据库」**
2. 点击右上角 **「+ 新建」** 按钮
3. 选择 **PostgreSQL**
4. 填写配置：
   - **数据库名称**: `uxyy`
   - **用户名**: `postgres`
   - **密码**: 设置一个强密码（例如：`UxYy2025!@#Db`）
   - **确认密码**: 再次输入
   - **CPU**: 0.5 Core
   - **内存**: 1 Gi
   - **存储**: 5 Gi
5. 点击 **「确认」**
6. 等待数据库创建完成（约 1-2 分钟）
7. **记录连接信息**（点击数据库名称查看）：
   - 主机地址：`postgres-uxyy.xxx.svc.cluster.local`
   - 端口：`5432`
   - 用户名：`postgres`
   - 密码：你设置的密码

### 1.3 创建 Redis 实例

1. 在 **「数据库」** 页面，点击 **「+ 新建」**
2. 选择 **Redis**
3. 填写配置：
   - **实例名称**: `uxyy-redis`
   - **密码**: 设置一个强密码（例如：`UxYy2025!@#Redis`）
   - **CPU**: 0.25 Core
   - **内存**: 512 Mi
   - **存储**: 1 Gi
4. 点击 **「确认」**
5. 等待 Redis 创建完成
6. **记录连接信息**：
   - 主机地址：`redis-uxyy-redis.xxx.svc.cluster.local`
   - 端口：`6379`
   - 密码：你设置的密码

---

## 第二步：生成安全密钥

### 2.1 生成 JWT 密钥

打开 PowerShell 或命令行，执行：

```powershell
# 生成 64 位随机密钥（Access Token）
$accessSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
Write-Host "JWT_ACCESS_SECRET: $accessSecret"

# 生成另一个 64 位随机密钥（Refresh Token）
$refreshSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
Write-Host "JWT_REFRESH_SECRET: $refreshSecret"
```

**将生成的两个密钥保存到安全的地方！**

---

## 第三步：修改部署配置

### 3.1 编辑 sealos.yaml

打开项目根目录的 `sealos.yaml` 文件，修改以下内容：

#### 修改数据库连接字符串（第 35 行）

```yaml
# 原来：
value: "postgresql://postgres:password@your-postgres-host:5432/uxyy"

# 改为你的实际连接信息（示例）：
value: "postgresql://postgres:UxYy2025!@#Db@postgres-uxyy.xxx.svc.cluster.local:5432/uxyy"
```

#### 修改 Redis 连接字符串（第 38 行）

```yaml
# 原来：
value: "redis://default:password@your-redis-host:6379"

# 改为你的实际连接信息（示例）：
value: "redis://default:UxYy2025!@#Redis@redis-uxyy-redis.xxx.svc.cluster.local:6379"
```

#### 修改 JWT 密钥（第 41-45 行）

```yaml
# 原来：
value: "your-strong-random-access-secret-min-32-chars"

# 改为刚才生成的密钥：
value: "你生成的64位随机字符串"
```

#### 修改域名（第 129 行）

```yaml
# 原来：
- host: your-domain.hzh.sealos.run

# 改为你的子域名（示例）：
- host: uxyy.hzh.sealos.run
```

---

## 第四步：构建 Docker 镜像

### 4.1 确保 Docker 正在运行

在 PowerShell 中检查：

```powershell
docker --version
docker info
```

如果显示版本信息，说明 Docker 正常。

### 4.2 进入项目目录

```powershell
cd C:\Users\1\Desktop\uxyy.cn\uxyy
```

### 4.3 构建后端 API 镜像

```powershell
# 构建镜像（这可能需要 5-10 分钟）
docker build -t uxyy-api:latest -f uxyy-api/Dockerfile .

# 验证镜像创建成功
docker images | findstr uxyy-api
```

### 4.4 构建前端 Web 镜像

```powershell
# 构建镜像（这可能需要 5-10 分钟）
docker build -t uxyy-web:latest -f uxyy-web/Dockerfile .

# 验证镜像创建成功
docker images | findstr uxyy-web
```

---

## 第五步：推送镜像到 Sealos

### 5.1 获取 Sealos 镜像仓库地址

1. 在 Sealos 控制台，点击左侧 **「镜像仓库」**
2. 查看你的镜像仓库地址（格式：`sealos.hub:5000/你的用户名/`）

### 5.2 登录 Sealos 镜像仓库

```powershell
# 在 Sealos 控制台获取临时登录令牌
# 点击「镜像仓库」→「使用指南」→ 复制登录命令

# 示例登录命令：
docker login sealos.hub:5000 -u your-username -p your-token
```

### 5.3 标记并推送镜像

```powershell
# 替换为你的 Sealos 用户名
$SEALOS_USER = "你的用户名"

# 标记后端镜像
docker tag uxyy-api:latest sealos.hub:5000/${SEALOS_USER}/uxyy-api:latest

# 标记前端镜像
docker tag uxyy-web:latest sealos.hub:5000/${SEALOS_USER}/uxyy-web:latest

# 推送后端镜像（可能需要几分钟）
docker push sealos.hub:5000/${SEALOS_USER}/uxyy-api:latest

# 推送前端镜像（可能需要几分钟）
docker push sealos.hub:5000/${SEALOS_USER}/uxyy-web:latest
```

### 5.4 验证推送成功

在 Sealos 控制台 **「镜像仓库」** 页面，应该能看到两个镜像：
- `uxyy-api`
- `uxyy-web`

---

## 第六步：在 Sealos 部署应用

### 6.1 更新 sealos.yaml 中的镜像地址

编辑 `sealos.yaml`，修改镜像名称：

```yaml
# 第 24 行，后端镜像：
image: sealos.hub:5000/你的用户名/uxyy-api:latest

# 第 88 行，前端镜像：
image: sealos.hub:5000/你的用户名/uxyy-web:latest
```

### 6.2 安装 Sealos CLI（可选）

**方式一：使用 Sealos CLI 部署**

```powershell
# 下载 Sealos CLI（Windows）
Invoke-WebRequest -Uri "https://github.com/labring/sealos/releases/latest/download/sealos_windows_amd64.exe" -OutFile "sealos.exe"

# 登录 Sealos
.\sealos.exe login cloud.sealos.io -u your-username -p your-password

# 部署应用
.\sealos.exe apply -f sealos.yaml
```

**方式二：使用 Sealos 控制台部署（推荐）**

1. 在 Sealos 控制台，点击 **「应用管理」**
2. 点击 **「+ 新建」** → **「从 YAML 部署」**
3. 复制 `sealos.yaml` 的全部内容，粘贴到文本框
4. 点击 **「确认」**
5. 等待部署完成（约 2-3 分钟）

### 6.3 验证部署状态

1. 在 **「应用管理」** 页面，应该看到两个应用：
   - `uxyy-api` - 状态应为 Running
   - `uxyy-web` - 状态应为 Running

2. 点击应用名称查看详情：
   - 确认 Pod 状态为 **Running**
   - 查看日志确认没有错误

---

## 第七步：数据库迁移

### 7.1 进入后端容器

1. 在 Sealos 控制台，点击 **「应用管理」**
2. 点击 `uxyy-api` 应用
3. 点击 **「终端」** 标签
4. 进入容器命令行

### 7.2 执行数据库迁移

在容器终端中执行：

```bash
# 进入应用目录
cd /app/uxyy-api

# 执行数据库迁移
pnpm run db:migrate

# 看到 "Migration completed" 表示成功
```

### 7.3 初始化种子数据（可选）

```bash
# 初始化开发账号（默认：13800138000 / Dev12345!）
pnpm run db:seed
```

---

## 第八步：配置外网访问

### 8.1 确认 Ingress 已创建

1. 在 Sealos 控制台，点击 **「网络」** → **「Ingress」**
2. 确认有两个 Ingress：
   - `uxyy-web-ingress` - 指向前端服务
   - `uxyy-api-ingress` - 指向后端服务（可选）

### 8.2 测试访问

打开浏览器，访问你的域名：

```
https://uxyy.hzh.sealos.run
```

应该能看到登录页面。

---

## 第九步：验证部署

### 9.1 测试 API 接口

```powershell
# 测试健康检查
Invoke-RestMethod -Uri "https://uxyy.hzh.sealos.run/api/health" -Method GET

# 测试登录接口
$body = @{
    phone = "13800138000"
    password = "Dev12345!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://uxyy.hzh.sealos.run/api/auth/login" -Method POST -Body $body -ContentType "application/json"
```

### 9.2 完整功能测试

1. 使用默认账号登录：
   - 手机号：`13800138000`
   - 密码：`Dev12345!`

2. 测试主要功能模块：
   - [ ] 客户管理
   - [ ] 库存管理
   - [ ] 财务管理
   - [ ] 审批流程

---

## 🔧 常见问题排查

### 问题 1：镜像推送失败

**症状**：`docker push` 报错或超时

**解决**：
```powershell
# 检查网络连接
ping sealos.hub

# 重新登录
docker logout sealos.hub:5000
docker login sealos.hub:5000 -u your-username -p your-token

# 检查镜像标签是否正确
docker images
```

### 问题 2：应用启动失败

**症状**：Pod 状态为 CrashLoopBackOff

**解决**：
1. 在 Sealos 控制台查看应用日志
2. 检查环境变量是否正确设置
3. 确认数据库和 Redis 连接信息正确

### 问题 3：数据库连接失败

**症状**：日志显示 `Connection refused` 或 `timeout`

**解决**：
1. 检查 `DATABASE_URL` 格式：
   ```
   postgresql://用户名:密码@主机:端口/数据库名
   ```
2. 确认 PostgreSQL 服务正在运行
3. 检查网络策略是否允许访问

### 问题 4：前端无法访问后端

**症状**：页面加载但 API 请求失败

**解决**：
1. 检查 `API_URL` 环境变量
2. 确认后端服务正常运行
3. 检查浏览器开发者工具的 Network 面板

---

## 📊 部署完成后的维护

### 查看日志

在 Sealos 控制台：
1. **「应用管理」** → 点击应用名称 → **「日志」**

### 更新部署

```powershell
# 1. 修改代码后重新构建镜像
docker build -t uxyy-api:latest -f uxyy-api/Dockerfile .
docker build -t uxyy-web:latest -f uxyy-web/Dockerfile .

# 2. 推送新镜像
docker push sealos.hub:5000/your-username/uxyy-api:latest
docker push sealos.hub:5000/your-username/uxyy-web:latest

# 3. 在 Sealos 控制台重启应用
# 「应用管理」→ 点击应用 → 「重启」
```

### 扩容

在 Sealos 控制台：
1. **「应用管理」** → 点击应用名称
2. 点击 **「伸缩」**
3. 增加副本数量

---

## ✅ 部署检查清单

- [ ] PostgreSQL 数据库已创建
- [ ] Redis 实例已创建
- [ ] 已生成 JWT 密钥
- [ ] sealos.yaml 已修改环境变量
- [ ] Docker 镜像构建成功
- [ ] 镜像已推送到 Sealos
- [ ] 应用已在 Sealos 部署
- [ ] 数据库迁移已执行
- [ ] 外网访问正常
- [ ] 登录功能测试通过

---

## 📞 获取帮助

如果遇到问题：

1. 查看应用日志定位错误
2. 检查 Sealos 官方文档：https://sealos.io/docs
3. 在 Sealos 社区寻求帮助

---

**部署完成！🎉**

访问地址：https://uxyy.hzh.sealos.run
