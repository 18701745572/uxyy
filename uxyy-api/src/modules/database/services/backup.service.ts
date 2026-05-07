import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { DRIZZLE_DB } from '../database.constants';
import type { AppDrizzleDb } from '../database.module';
import * as schema from '../../../db/schema';
import { eq, sql } from 'drizzle-orm';

const execAsync = promisify(exec);

export interface BackupResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  createdAt?: Date;
  message?: string;
  error?: string;
}

export interface BackupConfig {
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupTime: string;
  retentionDays: number;
  includeFiles: boolean;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
  ) {
    this.backupDir = this.configService.get('BACKUP_DIR') || './backups';
    this.ensureBackupDir();
  }

  private ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * 创建数据库备份
   */
  async createBackup(enterpriseId?: number): Promise<BackupResult> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = enterpriseId 
        ? `backup_enterprise_${enterpriseId}_${timestamp}.sql`
        : `backup_full_${timestamp}.sql`;
      const filePath = path.join(this.backupDir, fileName);

      const dbUrl = this.configService.get('DATABASE_URL');
      
      // 使用 pg_dump 创建备份
      const command = enterpriseId
        ? `pg_dump "${dbUrl}" --data-only --where="enterprise_id=${enterpriseId}" > "${filePath}"`
        : `pg_dump "${dbUrl}" > "${filePath}"`;

      await execAsync(command);

      const stats = fs.statSync(filePath);
      
      this.logger.log(`Backup created: ${fileName} (${stats.size} bytes)`);

      return {
        success: true,
        filePath,
        fileName,
        fileSize: stats.size,
        createdAt: new Date(),
        message: '备份创建成功',
      };
    } catch (error) {
      this.logger.error('Backup failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '备份失败',
        message: '备份创建失败',
      };
    }
  }

  /**
   * 恢复数据库备份
   */
  async restoreBackup(filePath: string, enterpriseId?: number): Promise<BackupResult> {
    try {
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          message: '备份文件不存在',
        };
      }

      const dbUrl = this.configService.get('DATABASE_URL');
      
      // 使用 psql 恢复备份
      const command = `psql "${dbUrl}" < "${filePath}"`;
      await execAsync(command);

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
    }
  }

  /**
   * 获取备份列表
   */
  async getBackupList(enterpriseId?: number): Promise<BackupResult[]> {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups: BackupResult[] = [];

      for (const fileName of files) {
        if (fileName.endsWith('.sql')) {
          // 如果指定了企业ID，只返回该企业相关的备份
          if (enterpriseId && !fileName.includes(`enterprise_${enterpriseId}`)) {
            continue;
          }

          const filePath = path.join(this.backupDir, fileName);
          const stats = fs.statSync(filePath);

          backups.push({
            success: true,
            fileName,
            filePath,
            fileSize: stats.size,
            createdAt: stats.birthtime,
            message: '备份文件',
          });
        }
      }

      // 按创建时间倒序排列
      return backups.sort((a, b) => 
        (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
      );
    } catch (error) {
      this.logger.error('Get backup list failed:', error);
      return [];
    }
  }

  /**
   * 删除备份文件
   */
  async deleteBackup(fileName: string): Promise<BackupResult> {
    try {
      const filePath = path.join(this.backupDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          message: '备份文件不存在',
        };
      }

      fs.unlinkSync(filePath);
      
      this.logger.log(`Backup deleted: ${fileName}`);

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
  async cleanupOldBackups(retentionDays: number = 30): Promise<number> {
    try {
      const files = fs.readdirSync(this.backupDir);
      const now = new Date().getTime();
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const fileName of files) {
        if (fileName.endsWith('.sql')) {
          const filePath = path.join(this.backupDir, fileName);
          const stats = fs.statSync(filePath);
          
          if (now - stats.birthtime.getTime() > retentionMs) {
            fs.unlinkSync(filePath);
            deletedCount++;
            this.logger.log(`Old backup deleted: ${fileName}`);
          }
        }
      }

      return deletedCount;
    } catch (error) {
      this.logger.error('Cleanup old backups failed:', error);
      return 0;
    }
  }

  /**
   * 导出企业数据为JSON
   */
  async exportEnterpriseData(enterpriseId: number): Promise<BackupResult> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `export_enterprise_${enterpriseId}_${timestamp}.json`;
      const filePath = path.join(this.backupDir, fileName);

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

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

      const stats = fs.statSync(filePath);

      this.logger.log(`Enterprise data exported: ${fileName}`);

      return {
        success: true,
        filePath,
        fileName,
        fileSize: stats.size,
        createdAt: new Date(),
        message: '数据导出成功',
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
}
