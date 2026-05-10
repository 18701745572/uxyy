import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { DRIZZLE_DB } from '../database.constants';
import type { AppDrizzleDb } from '../database.module';
import * as schema from '../../../db/schema';
import { eq, desc, and } from 'drizzle-orm';

const execAsync = promisify(exec);

export interface BackupResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  createdAt?: Date;
  message?: string;
  error?: string;
  checksum?: string;
}

export interface BackupConfig {
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupTime: string;
  retentionDays: number;
  includeFiles: boolean;
  encryptionEnabled: boolean;
}

export interface BackupRecord {
  id: number;
  enterpriseId: number;
  backupType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  status: string;
  checksum?: string;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: Date;
}

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;
  private readonly tempDir: string;
  private isRunning = false;

  constructor(
    private readonly configService: ConfigService,
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
  ) {
    this.backupDir = this.configService.get('BACKUP_DIR') || './backups';
    this.tempDir = path.join(this.backupDir, 'temp');
    this.ensureDirectories();
  }

  onModuleInit() {
    this.ensureDirectories();
    this.scheduleAutoBackup();
  }

  private ensureDirectories() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 获取或创建企业备份配置
   */
  async getOrCreateConfig(enterpriseId: number): Promise<BackupConfig> {
    const existing = await this.db
      .select()
      .from(schema.backupConfigs)
      .where(eq(schema.backupConfigs.enterpriseId, enterpriseId));

    if (existing.length > 0) {
      const config = existing[0];
      return {
        autoBackup: config.autoBackup ?? true,
        backupFrequency: (config.backupFrequency as 'daily' | 'weekly' | 'monthly') ?? 'daily',
        backupTime: config.backupTime ?? '02:00',
        retentionDays: config.retentionDays ?? 30,
        includeFiles: config.includeFiles ?? false,
        encryptionEnabled: config.encryptionEnabled ?? false,
      };
    }

    const defaultConfig: BackupConfig = {
      autoBackup: true,
      backupFrequency: 'daily',
      backupTime: '02:00',
      retentionDays: 30,
      includeFiles: false,
      encryptionEnabled: false,
    };

    await this.db.insert(schema.backupConfigs).values({
      enterpriseId,
      ...defaultConfig,
    });

    return defaultConfig;
  }

  /**
   * 更新企业备份配置
   */
  async updateConfig(enterpriseId: number, config: Partial<BackupConfig>): Promise<BackupConfig> {
    await this.db
      .update(schema.backupConfigs)
      .set({
        ...config,
        updatedAt: new Date(),
      })
      .where(eq(schema.backupConfigs.enterpriseId, enterpriseId));

    return this.getOrCreateConfig(enterpriseId);
  }

  /**
   * 创建数据库备份（带压缩和校验）
   */
  async createBackup(enterpriseId?: number): Promise<BackupResult> {
    if (this.isRunning) {
      return {
        success: false,
        message: '备份正在进行中，请稍后再试',
      };
    }

    this.isRunning = true;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupType = enterpriseId ? 'enterprise' : 'full';
    const baseFileName = enterpriseId
      ? `backup_enterprise_${enterpriseId}_${timestamp}`
      : `backup_full_${timestamp}`;

    try {
      const dbUrl = this.configService.get('DATABASE_URL');
      
      // 创建SQL备份文件
      const sqlFilePath = path.join(this.tempDir, `${baseFileName}.sql`);
      const command = enterpriseId
        ? `pg_dump "${dbUrl}" --data-only --where="enterprise_id=${enterpriseId}" > "${sqlFilePath}"`
        : `pg_dump "${dbUrl}" > "${sqlFilePath}"`;

      await execAsync(command);

      // 计算校验和
      const checksum = await this.calculateChecksum(sqlFilePath);

      // 压缩备份文件
      const compressedFilePath = path.join(this.backupDir, `${baseFileName}.gz`);
      await this.compressFile(sqlFilePath, compressedFilePath);

      // 删除临时文件
      fs.unlinkSync(sqlFilePath);

      const stats = fs.statSync(compressedFilePath);

      // 记录备份记录
      await this.db.insert(schema.backupRecords).values({
        enterpriseId: enterpriseId || 0,
        backupType,
        fileName: `${baseFileName}.gz`,
        filePath: compressedFilePath,
        fileSize: stats.size,
        status: 'completed',
        checksum,
        metadata: {
          enterpriseId,
          timestamp,
          backupType,
        },
      });

      this.logger.log(`Backup created: ${baseFileName}.gz (${stats.size} bytes)`);

      // 自动清理过期备份
      const config = enterpriseId ? await this.getOrCreateConfig(enterpriseId) : { retentionDays: 30 };
      await this.cleanupOldBackups(config.retentionDays, enterpriseId);

      return {
        success: true,
        filePath: compressedFilePath,
        fileName: `${baseFileName}.gz`,
        fileSize: stats.size,
        createdAt: new Date(),
        message: '备份创建成功',
        checksum,
      };
    } catch (error) {
      this.logger.error('Backup failed:', error);
      // 记录失败记录
      await this.db.insert(schema.backupRecords).values({
        enterpriseId: enterpriseId || 0,
        backupType,
        fileName: `${baseFileName}.gz`,
        filePath: '',
        fileSize: 0,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : '备份失败',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : '备份失败',
        message: '备份创建失败',
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 恢复数据库备份
   */
  async restoreBackup(filePath: string, enterpriseId?: number): Promise<BackupResult> {
    if (this.isRunning) {
      return {
        success: false,
        message: '备份正在进行中，请稍后再试',
      };
    }

    this.isRunning = true;

    try {
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          message: '备份文件不存在',
        };
      }

      const dbUrl = this.configService.get('DATABASE_URL');
      let restorePath = filePath;

      // 如果是压缩文件，先解压
      if (filePath.endsWith('.gz')) {
        restorePath = path.join(this.tempDir, `restore_${Date.now()}.sql`);
        await this.decompressFile(filePath, restorePath);
      }

      // 使用 psql 恢复备份
      const command = `psql "${dbUrl}" < "${restorePath}"`;
      await execAsync(command);

      // 清理临时文件
      if (restorePath !== filePath) {
        fs.unlinkSync(restorePath);
      }

      this.logger.log(`Backup restored: ${filePath}`);

      return {
        success: true,
        message: '备份恢复成功',
        createdAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Restore failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '恢复失败',
        message: '备份恢复失败',
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 获取备份列表（从数据库记录）
   */
  async getBackupList(enterpriseId?: number): Promise<BackupRecord[]> {
    try {
      let baseQuery = this.db
        .select()
        .from(schema.backupRecords)
        .orderBy(desc(schema.backupRecords.createdAt));

      const query = enterpriseId
        ? baseQuery.where(eq(schema.backupRecords.enterpriseId, enterpriseId))
        : baseQuery;

      const records = await query;

      return records.map(record => ({
        id: record.id,
        enterpriseId: record.enterpriseId,
        backupType: record.backupType,
        fileName: record.fileName,
        filePath: record.filePath,
        fileSize: record.fileSize,
        status: record.status,
        checksum: record.checksum || undefined,
        metadata: record.metadata ? (record.metadata as Record<string, unknown>) : undefined,
        errorMessage: record.errorMessage || undefined,
        createdAt: record.createdAt,
      }));
    } catch (error) {
      this.logger.error('Get backup list failed:', error);
      return [];
    }
  }

  /**
   * 获取备份统计信息
   */
  async getBackupStats(enterpriseId?: number): Promise<{
    totalBackups: number;
    successfulBackups: number;
    failedBackups: number;
    totalSize: number;
    latestBackup?: Date;
  }> {
    let baseQuery = this.db
      .select({
        status: schema.backupRecords.status,
        fileSize: schema.backupRecords.fileSize,
        createdAt: schema.backupRecords.createdAt,
      })
      .from(schema.backupRecords);

    const query = enterpriseId
      ? baseQuery.where(eq(schema.backupRecords.enterpriseId, enterpriseId))
      : baseQuery;

    const records = await query;

    const stats = {
      totalBackups: records.length,
      successfulBackups: records.filter((r: { status: string }) => r.status === 'completed').length,
      failedBackups: records.filter((r: { status: string }) => r.status === 'failed').length,
      totalSize: records.reduce((sum: number, r: { fileSize: number }) => sum + r.fileSize, 0),
      latestBackup: records.length > 0 
        ? new Date(Math.max(...records.map((r: { createdAt: Date }) => r.createdAt.getTime())))
        : undefined,
    };

    return stats;
  }

  /**
   * 删除备份文件
   */
  async deleteBackup(recordId: number): Promise<BackupResult> {
    try {
      const record = await this.db
        .select()
        .from(schema.backupRecords)
        .where(eq(schema.backupRecords.id, recordId));

      if (record.length === 0) {
        return {
          success: false,
          message: '备份记录不存在',
        };
      }

      const filePath = record[0].filePath;

      // 删除文件（如果存在）
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // 删除数据库记录
      await this.db
        .delete(schema.backupRecords)
        .where(eq(schema.backupRecords.id, recordId));

      this.logger.log(`Backup deleted: ${record[0].fileName}`);

      return {
        success: true,
        message: '备份删除成功',
      };
    } catch (error) {
      this.logger.error('Delete backup failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除失败',
        message: '备份删除失败',
      };
    }
  }

  /**
   * 清理过期备份
   */
  async cleanupOldBackups(retentionDays: number = 30, enterpriseId?: number): Promise<number> {
    try {
      const now = new Date().getTime();
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

      let baseQuery = this.db
        .select({
          id: schema.backupRecords.id,
          filePath: schema.backupRecords.filePath,
          createdAt: schema.backupRecords.createdAt,
        })
        .from(schema.backupRecords);

      const query = enterpriseId
        ? baseQuery.where(eq(schema.backupRecords.enterpriseId, enterpriseId))
        : baseQuery;

      const records = await query;
      let deletedCount = 0;

      for (const record of records) {
        if (now - record.createdAt.getTime() > retentionMs) {
          // 删除文件
          if (record.filePath && fs.existsSync(record.filePath)) {
            fs.unlinkSync(record.filePath);
          }

          // 删除数据库记录
          await this.db
            .delete(schema.backupRecords)
            .where(eq(schema.backupRecords.id, record.id));

          deletedCount++;
          this.logger.log(`Old backup deleted: ${record.id}`);
        }
      }

      return deletedCount;
    } catch (error) {
      this.logger.error('Cleanup old backups failed:', error);
      return 0;
    }
  }

  /**
   * 验证备份文件完整性
   */
  async verifyBackup(filePath: string, expectedChecksum?: string): Promise<{
    valid: boolean;
    checksum?: string;
    message: string;
  }> {
    try {
      if (!fs.existsSync(filePath)) {
        return {
          valid: false,
          message: '备份文件不存在',
        };
      }

      const checksum = await this.calculateChecksum(filePath);

      if (expectedChecksum && checksum !== expectedChecksum) {
        return {
          valid: false,
          checksum,
          message: '备份文件校验失败，文件可能已损坏',
        };
      }

      return {
        valid: true,
        checksum,
        message: '备份文件校验通过',
      };
    } catch (error) {
      this.logger.error('Verify backup failed:', error);
      return {
        valid: false,
        message: error instanceof Error ? error.message : '校验失败',
      };
    }
  }

  /**
   * 导出企业数据为JSON
   */
  async exportEnterpriseData(enterpriseId: number): Promise<BackupResult> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const baseFileName = `export_enterprise_${enterpriseId}_${timestamp}`;
      const jsonFilePath = path.join(this.tempDir, `${baseFileName}.json`);
      const compressedFilePath = path.join(this.backupDir, `${baseFileName}.gz`);

      // 收集企业相关数据
      const data: Record<string, unknown[]> = {};

      // 客户数据
      data.customers = await this.db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.enterpriseId, enterpriseId));

      // 商品数据
      data.products = await this.db
        .select()
        .from(schema.products)
        .where(eq(schema.products.enterpriseId, enterpriseId));

      // 销售订单数据
      data.salesOrders = await this.db
        .select()
        .from(schema.salesOrders)
        .where(eq(schema.salesOrders.enterpriseId, enterpriseId));

      // 采购订单数据
      data.purchaseOrders = await this.db
        .select()
        .from(schema.purchaseOrders)
        .where(eq(schema.purchaseOrders.enterpriseId, enterpriseId));

      // 发票数据
      data.invoices = await this.db
        .select()
        .from(schema.invoices)
        .where(eq(schema.invoices.enterpriseId, enterpriseId));

      // 凭证数据
      data.vouchers = await this.db
        .select()
        .from(schema.vouchers)
        .where(eq(schema.vouchers.enterpriseId, enterpriseId));

      // 供应商数据
      data.suppliers = await this.db
        .select()
        .from(schema.suppliers)
        .where(eq(schema.suppliers.enterpriseId, enterpriseId));

      // 仓库数据
      data.warehouses = await this.db
        .select()
        .from(schema.warehouses)
        .where(eq(schema.warehouses.enterpriseId, enterpriseId));

      // 库存数据
      data.inventory = await this.db
        .select()
        .from(schema.inventory)
        .where(eq(schema.inventory.enterpriseId, enterpriseId));

      // 写入JSON文件
      fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2));

      // 计算校验和
      const checksum = await this.calculateChecksum(jsonFilePath);

      // 压缩文件
      await this.compressFile(jsonFilePath, compressedFilePath);

      // 删除临时文件
      fs.unlinkSync(jsonFilePath);

      const stats = fs.statSync(compressedFilePath);

      // 记录备份记录
      await this.db.insert(schema.backupRecords).values({
        enterpriseId,
        backupType: 'export_json',
        fileName: `${baseFileName}.gz`,
        filePath: compressedFilePath,
        fileSize: stats.size,
        status: 'completed',
        checksum,
        metadata: {
          enterpriseId,
          timestamp,
          backupType: 'export_json',
          tables: Object.keys(data),
        },
      });

      this.logger.log(`Enterprise data exported: ${baseFileName}.gz`);

      return {
        success: true,
        filePath: compressedFilePath,
        fileName: `${baseFileName}.gz`,
        fileSize: stats.size,
        createdAt: new Date(),
        message: '数据导出成功',
        checksum,
      };
    } catch (error) {
      this.logger.error('Export enterprise data failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '导出失败',
        message: '数据导出失败',
      };
    }
  }

  /**
   * 导入企业数据（从JSON）
   */
  async importEnterpriseData(enterpriseId: number, filePath: string): Promise<BackupResult> {
    try {
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          message: '备份文件不存在',
        };
      }

      let jsonFilePath = filePath;

      // 如果是压缩文件，先解压
      if (filePath.endsWith('.gz')) {
        jsonFilePath = path.join(this.tempDir, `import_${Date.now()}.json`);
        await this.decompressFile(filePath, jsonFilePath);
      }

      // 读取JSON数据
      const content = fs.readFileSync(jsonFilePath, 'utf-8');
      const data = JSON.parse(content);

      // 导入数据（按依赖顺序）
      if (data.customers) {
        for (const customer of data.customers as unknown[]) {
          const record = customer as Record<string, unknown>;
          delete record.id;
          record.enterpriseId = enterpriseId;
          await this.db.insert(schema.customers).values(record as never).onConflictDoNothing();
        }
      }

      if (data.suppliers) {
        for (const supplier of data.suppliers as unknown[]) {
          const record = supplier as Record<string, unknown>;
          delete record.id;
          record.enterpriseId = enterpriseId;
          await this.db.insert(schema.suppliers).values(record as never).onConflictDoNothing();
        }
      }

      if (data.products) {
        for (const product of data.products as unknown[]) {
          const record = product as Record<string, unknown>;
          delete record.id;
          record.enterpriseId = enterpriseId;
          await this.db.insert(schema.products).values(record as never).onConflictDoNothing();
        }
      }

      if (data.warehouses) {
        for (const warehouse of data.warehouses as unknown[]) {
          const record = warehouse as Record<string, unknown>;
          delete record.id;
          record.enterpriseId = enterpriseId;
          await this.db.insert(schema.warehouses).values(record as never).onConflictDoNothing();
        }
      }

      if (data.inventory) {
        for (const item of data.inventory as unknown[]) {
          const record = item as Record<string, unknown>;
          delete record.id;
          record.enterpriseId = enterpriseId;
          await this.db.insert(schema.inventory).values(record as never).onConflictDoNothing();
        }
      }

      if (data.salesOrders) {
        for (const order of data.salesOrders as unknown[]) {
          const record = order as Record<string, unknown>;
          delete record.id;
          record.enterpriseId = enterpriseId;
          await this.db.insert(schema.salesOrders).values(record as never).onConflictDoNothing();
        }
      }

      if (data.purchaseOrders) {
        for (const order of data.purchaseOrders as unknown[]) {
          const record = order as Record<string, unknown>;
          delete record.id;
          record.enterpriseId = enterpriseId;
          await this.db.insert(schema.purchaseOrders).values(record as never).onConflictDoNothing();
        }
      }

      if (data.invoices) {
        for (const invoice of data.invoices as unknown[]) {
          const record = invoice as Record<string, unknown>;
          delete record.id;
          record.enterpriseId = enterpriseId;
          await this.db.insert(schema.invoices).values(record as never).onConflictDoNothing();
        }
      }

      if (data.vouchers) {
        for (const voucher of data.vouchers as unknown[]) {
          const record = voucher as Record<string, unknown>;
          delete record.id;
          record.enterpriseId = enterpriseId;
          await this.db.insert(schema.vouchers).values(record as never).onConflictDoNothing();
        }
      }

      // 清理临时文件
      if (jsonFilePath !== filePath) {
        fs.unlinkSync(jsonFilePath);
      }

      this.logger.log(`Enterprise data imported for enterprise ${enterpriseId}`);

      return {
        success: true,
        message: '数据导入成功',
        createdAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Import enterprise data failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '导入失败',
        message: '数据导入失败',
      };
    }
  }

  /**
   * 计算文件校验和
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }

  /**
   * 压缩文件
   */
  private async compressFile(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const input = fs.createReadStream(inputPath);
      const output = fs.createWriteStream(outputPath);
      const gzip = zlib.createGzip();

      input.pipe(gzip).pipe(output);

      output.on('close', resolve);
      output.on('error', reject);
    });
  }

  /**
   * 解压文件
   */
  private async decompressFile(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const input = fs.createReadStream(inputPath);
      const output = fs.createWriteStream(outputPath);
      const gunzip = zlib.createGunzip();

      input.pipe(gunzip).pipe(output);

      output.on('close', resolve);
      output.on('error', reject);
    });
  }

  /**
   * 定时自动备份（简单实现）
   */
  private scheduleAutoBackup() {
    // 在实际生产环境中，可以使用 BullMQ 或 NestJS Schedule 模块
    // 这里简化实现，每天凌晨2点执行备份
    const scheduleBackup = () => {
      const now = new Date();
      const nextBackup = new Date();
      nextBackup.setHours(2, 0, 0, 0);
      
      if (nextBackup <= now) {
        nextBackup.setDate(nextBackup.getDate() + 1);
      }

      const delay = nextBackup.getTime() - now.getTime();

      setTimeout(async () => {
        try {
          await this.createBackup(); // 全量备份
          this.logger.log('Auto backup completed');
        } catch (error) {
          this.logger.error('Auto backup failed:', error);
        } finally {
          scheduleBackup(); // 继续调度下一次
        }
      }, delay);
    };

    scheduleBackup();
  }
}