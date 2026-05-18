# 数据库备份与恢复文档

本文档详细说明优效营系统的数据库备份策略、实现和使用方法。

## 目录

1. [备份功能概览](#备份功能概览)
2. [备份策略](#备份策略)
3. [自动备份配置](#自动备份配置)
4. [手动备份操作](#手动备份操作)
5. [数据恢复](#数据恢复)
6. [数据导入导出](#数据导入导出)
7. [备份文件管理](#备份文件管理)
8. [生产环境配置](#生产环境配置)
9. [故障排查](#故障排查)

---

## 备份功能概览

系统提供完整的数据库备份解决方案：

| 功能 | 说明 | 适用场景 |
|-----|------|---------|
| **全量备份** | 备份整个数据库 | 系统级灾难恢复 |
| **企业级备份** | 备份单个企业数据 | 企业数据迁移 |
| **JSON 导出** | 导出为结构化 JSON | 数据分析、跨系统迁移 |
| **自动备份** | 定时自动执行 | 日常数据保护 |
| **压缩存储** | Gzip 压缩，节省空间 | 存储优化 |
| **校验和验证** | SHA-256 校验文件完整性 | 数据完整性保证 |

### 技术实现

- **备份工具**: `pg_dump` (PostgreSQL 官方工具)
- **恢复工具**: `psql` (PostgreSQL 官方工具)
- **压缩算法**: Gzip
- **校验算法**: SHA-256
- **存储位置**: 本地文件系统（可配置）
- **调度方式**: 定时任务（默认每天凌晨 2 点）

---

## 备份策略

### 默认配置

```typescript
{
  autoBackup: true,           // 启用自动备份
  backupFrequency: 'daily',   // 备份频率：daily | weekly | monthly
  backupTime: '02:00',        // 备份时间（凌晨 2 点）
  retentionDays: 30,          // 保留天数（30天）
  includeFiles: false,        // 是否包含文件附件
  encryptionEnabled: false    // 是否启用加密
}
```

### 备份类型

#### 1. 全量备份
- 备份整个数据库
- 使用 `pg_dump` 导出完整 SQL
- 包含所有企业数据
- 适用于：系统灾难恢复

#### 2. 企业级备份
- 备份指定企业数据
- 使用 `pg_dump --data-only --where="enterprise_id=X"`
- 仅包含指定企业相关表
- 适用于：企业数据迁移、企业级恢复

#### 3. JSON 数据导出
- 导出为结构化 JSON 格式
- 包含：客户、商品、订单、发票、凭证等
- 便于数据分析和跨系统迁移
- 适用于：数据分析、第三方集成

---

## 自动备份配置

### 配置备份参数

**API 端点**: `PUT /api/v1/system/backup/config`

**请求体**:
```json
{
  "autoBackup": true,
  "backupFrequency": "daily",
  "backupTime": "02:00",
  "retentionDays": 30,
  "includeFiles": false,
  "encryptionEnabled": false
}
```

**参数说明**:

| 参数 | 类型 | 说明 | 可选值 |
|-----|------|------|-------|
| `autoBackup` | boolean | 是否启用自动备份 | true/false |
| `backupFrequency` | string | 备份频率 | daily/weekly/monthly |
| `backupTime` | string | 备份时间 | HH:MM 格式 |
| `retentionDays` | number | 保留天数 | 1-365 |
| `includeFiles` | boolean | 包含文件附件 | true/false |
| `encryptionEnabled` | boolean | 启用加密 | true/false |

### 查看当前配置

**API 端点**: `GET /api/v1/system/backup/config`

**响应**:
```json
{
  "autoBackup": true,
  "backupFrequency": "daily",
  "backupTime": "02:00",
  "retentionDays": 30,
  "includeFiles": false,
  "encryptionEnabled": false
}
```

---

## 手动备份操作

### 创建全量备份

**API 端点**: `POST /api/v1/system/backup/create`

**权限**: 需要 `SYS_BACKUP` 权限（老板/管理员角色）

**响应**:
```json
{
  "success": true,
  "fileName": "backup_full_2026-05-18T02-00-00-000Z.gz",
  "filePath": "/app/backups/backup_full_2026-05-18T02-00-00-000Z.gz",
  "fileSize": 10485760,
  "createdAt": "2026-05-18T02:00:00.000Z",
  "message": "备份创建成功",
  "checksum": "a1b2c3d4e5f6..."
}
```

### 创建企业级备份

**API 端点**: `POST /api/v1/system/backup/create?enterpriseId=123`

**响应**:
```json
{
  "success": true,
  "fileName": "backup_enterprise_123_2026-05-18T02-00-00-000Z.gz",
  "fileSize": 2097152,
  "message": "备份创建成功"
}
```

### 导出企业数据为 JSON

**API 端点**: `POST /api/v1/system/backup/export-json`

**导出内容**:
- 客户数据 (customers)
- 商品数据 (products)
- 销售订单 (salesOrders)
- 采购订单 (purchaseOrders)
- 发票数据 (invoices)
- 财务凭证 (vouchers)
- 供应商数据 (suppliers)
- 仓库数据 (warehouses)
- 库存数据 (inventory)

**响应**:
```json
{
  "success": true,
  "fileName": "export_enterprise_123_2026-05-18T02-00-00-000Z.gz",
  "fileSize": 5242880,
  "message": "数据导出成功"
}
```

---

## 数据恢复

### 从备份恢复

**API 端点**: `POST /api/v1/system/backup/restore`

**请求体**:
```json
{
  "recordId": 123
}
```

**恢复流程**:
1. 验证备份文件存在
2. 校验文件完整性（SHA-256）
3. 解压备份文件
4. 使用 `psql` 执行恢复
5. 清理临时文件

**⚠️ 警告**: 数据恢复会覆盖现有数据，请谨慎操作！

### 恢复特定企业数据

**API 端点**: `POST /api/v1/system/backup/restore`

**请求体**:
```json
{
  "recordId": 123,
  "enterpriseId": 456
}
```

---

## 数据导入导出

### 导入 JSON 数据

**API 端点**: `POST /api/v1/system/backup/import-json`

**Content-Type**: `multipart/form-data`

**表单字段**:
- `file`: 备份文件（.json 或 .gz）

**导入规则**:
- 自动解压 .gz 文件
- 删除原数据中的 `id` 字段（避免冲突）
- 更新 `enterpriseId` 为目标企业
- 使用 `ON CONFLICT DO NOTHING` 处理冲突

**导入顺序**（按依赖关系）:
1. 客户 (customers)
2. 供应商 (suppliers)
3. 商品 (products)
4. 仓库 (warehouses)
5. 库存 (inventory)
6. 销售订单 (salesOrders)
7. 采购订单 (purchaseOrders)
8. 发票 (invoices)
9. 凭证 (vouchers)

### 下载备份文件

**API 端点**: `GET /api/v1/system/backup/download/:recordId`

**响应**: 文件流下载

---

## 备份文件管理

### 查看备份列表

**API 端点**: `GET /api/v1/system/backup/list`

**查询参数**:
- `enterpriseId`: 筛选特定企业（可选，管理员可用）

**响应**:
```json
{
  "backups": [
    {
      "id": 1,
      "enterpriseId": 0,
      "backupType": "full",
      "fileName": "backup_full_2026-05-18T02-00-00-000Z.gz",
      "filePath": "/app/backups/backup_full_2026-05-18T02-00-00-000Z.gz",
      "fileSize": 10485760,
      "status": "completed",
      "checksum": "a1b2c3d4e5f6...",
      "metadata": {
        "timestamp": "2026-05-18T02:00:00.000Z",
        "backupType": "full"
      },
      "createdAt": "2026-05-18T02:00:00.000Z"
    }
  ]
}
```

### 查看备份统计

**API 端点**: `GET /api/v1/system/backup/stats`

**响应**:
```json
{
  "totalBackups": 100,
  "successfulBackups": 98,
  "failedBackups": 2,
  "totalSize": 10737418240,
  "latestBackup": "2026-05-18T02:00:00.000Z"
}
```

### 删除备份

**API 端点**: `DELETE /api/v1/system/backup/:recordId`

**说明**:
- 删除数据库记录
- 同时删除物理文件
- 不可恢复，请谨慎操作

### 验证备份完整性

**API 端点**: `POST /api/v1/system/backup/verify`

**请求体**:
```json
{
  "recordId": 123
}
```

**响应**:
```json
{
  "valid": true,
  "checksum": "a1b2c3d4e5f6...",
  "message": "备份文件校验通过"
}
```

---

## 生产环境配置

### 环境变量

```bash
# 备份目录（默认：./backups）
BACKUP_DIR=/app/backups

# 数据库连接（用于 pg_dump）
DATABASE_URL=postgresql://user:password@host:5432/uxyy
```

### Docker 配置

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    image: uxyy-api:latest
    environment:
      - BACKUP_DIR=/app/backups
      - DATABASE_URL=${DATABASE_URL}
    volumes:
      - backup-data:/app/backups  # 持久化备份数据
    
  # 可选：使用对象存储同步备份
  backup-sync:
    image: rclone/rclone
    volumes:
      - backup-data:/data
    command: sync /data remote:backup-bucket
    
volumes:
  backup-data:
```

### Kubernetes 配置

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: uxyy-api
spec:
  template:
    spec:
      containers:
        - name: api
          env:
            - name: BACKUP_DIR
              value: "/app/backups"
          volumeMounts:
            - name: backup-volume
              mountPath: /app/backups
      volumes:
        - name: backup-volume
          persistentVolumeClaim:
            claimName: backup-pvc
---
# pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: backup-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi  # 根据数据量调整
```

### 云存储同步（推荐）

使用 rclone 或 aws-cli 将备份同步到对象存储：

```bash
# 安装 rclone
# 配置云存储
rclone config

# 创建同步脚本
#!/bin/bash
# backup-sync.sh
rclone sync /app/backups s3:uxyy-backups --include "*.gz"

# 添加到 crontab（每小时同步一次）
0 * * * * /app/backup-sync.sh
```

---

## 故障排查

### 备份失败

**症状**: 备份状态显示 "failed"

**排查步骤**:

1. **检查磁盘空间**
```bash
df -h /app/backups
```

2. **检查数据库连接**
```bash
psql "${DATABASE_URL}" -c "SELECT 1"
```

3. **检查 pg_dump 是否安装**
```bash
which pg_dump
pg_dump --version
```

4. **查看错误日志**
```bash
docker logs uxyy-api | grep -i "backup failed"
```

**常见错误**:

| 错误 | 原因 | 解决方案 |
|-----|------|---------|
| `pg_dump: command not found` | 未安装 PostgreSQL 客户端 | 安装 postgresql-client |
| `Permission denied` | 目录权限不足 | 修改备份目录权限 |
| `No space left on device` | 磁盘空间不足 | 清理旧备份或扩容 |
| `Connection refused` | 数据库连接失败 | 检查 DATABASE_URL |

### 恢复失败

**症状**: 恢复操作返回错误

**排查步骤**:

1. **验证备份文件存在**
```bash
ls -la /app/backups/backup_xxx.gz
```

2. **验证文件完整性**
```bash
# 计算校验和
sha256sum /app/backups/backup_xxx.gz
```

3. **测试解压**
```bash
gunzip -t /app/backups/backup_xxx.gz
```

4. **检查数据库权限**
```bash
# 确认有写入权限
psql "${DATABASE_URL}" -c "CREATE TABLE test (id int)"
```

### 自动备份未执行

**症状**: 没有按时创建备份

**排查步骤**:

1. **检查配置是否启用**
```bash
curl /api/v1/system/backup/config
```

2. **检查应用日志**
```bash
docker logs uxyy-api | grep -i "auto backup"
```

3. **手动测试备份**
```bash
curl -X POST /api/v1/system/backup/create
```

4. **检查时间设置**
- 确认服务器时区正确
- 确认 `backupTime` 格式正确 (HH:MM)

---

## 最佳实践

### 1. 备份策略建议

- **频率**: 生产环境建议每日备份
- **时间**: 选择业务低峰期（凌晨 2-4 点）
- **保留期**: 至少保留 30 天，重要数据保留 90 天
- **多地存储**: 本地 + 云端双重备份

### 2. 监控告警

建议配置以下监控：

```yaml
# 备份失败告警
- alert: BackupFailed
  expr: increase(backup_failures_total[1h]) > 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "数据库备份失败"

# 备份文件大小异常
- alert: BackupSizeAnomaly
  expr: backup_file_size_bytes < 1024  # 小于 1KB 可能有问题
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "备份文件大小异常"

# 磁盘空间告警
- alert: DiskSpaceLow
  expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "备份磁盘空间不足"
```

### 3. 定期演练

- 每季度进行一次恢复演练
- 验证备份文件的完整性和可用性
- 记录恢复时间（RTO）
- 测试不同场景的恢复流程

### 4. 安全建议

- 备份文件存储在独立磁盘/分区
- 启用备份文件加密（`encryptionEnabled: true`）
- 限制备份目录的访问权限（chmod 700）
- 定期轮换备份存储的访问密钥

---

## API 端点汇总

| 方法 | 端点 | 说明 | 权限 |
|-----|------|------|------|
| GET | `/api/v1/system/backup/config` | 获取备份配置 | SYS_BACKUP |
| PUT | `/api/v1/system/backup/config` | 更新备份配置 | SYS_BACKUP |
| POST | `/api/v1/system/backup/create` | 创建备份 | SYS_BACKUP |
| GET | `/api/v1/system/backup/list` | 获取备份列表 | SYS_BACKUP |
| GET | `/api/v1/system/backup/stats` | 获取备份统计 | SYS_BACKUP |
| DELETE | `/api/v1/system/backup/:id` | 删除备份 | SYS_BACKUP |
| POST | `/api/v1/system/backup/restore` | 恢复备份 | SYS_BACKUP |
| POST | `/api/v1/system/backup/verify` | 验证备份 | SYS_BACKUP |
| POST | `/api/v1/system/backup/export-json` | 导出 JSON | SYS_BACKUP |
| POST | `/api/v1/system/backup/import-json` | 导入 JSON | SYS_BACKUP |
| GET | `/api/v1/system/backup/download/:id` | 下载备份 | SYS_BACKUP |

---

## 相关文档

- [部署指南](../DEPLOY.md)
- [安全功能说明](./security-features.md)
- [API 文档](./api-documentation.md)
