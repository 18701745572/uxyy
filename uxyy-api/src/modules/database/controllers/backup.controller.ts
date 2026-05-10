import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Param,
  Query,
  Body,
  Res,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { BackupService } from '../services/backup.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { isBossRole, Permission } from '../../auth/role-permissions';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

interface UpdateBackupConfigDto {
  autoBackup?: boolean;
  backupFrequency?: 'daily' | 'weekly' | 'monthly';
  backupTime?: string;
  retentionDays?: number;
  includeFiles?: boolean;
  encryptionEnabled?: boolean;
}

@Controller('system/backup')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('oa', 'boss', 'owner')
@Permissions(Permission.SYS_BACKUP)
@ApiTags('备份管理')
@ApiBearerAuth()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  /**
   * 获取备份配置
   */
  @Get('config')
  @ApiOperation({ summary: '获取备份配置', description: '获取当前企业的备份配置信息' })
  async getConfig(@Req() req: Request & { user: UserContext }) {
    return this.backupService.getOrCreateConfig(req.user.enterpriseId);
  }

  /**
   * 更新备份配置
   */
  @Put('config')
  @ApiOperation({ summary: '更新备份配置', description: '更新企业的备份配置信息' })
  async updateConfig(
    @Req() req: Request & { user: UserContext },
    @Body() dto: UpdateBackupConfigDto,
  ) {
    return this.backupService.updateConfig(req.user.enterpriseId, dto);
  }

  /**
   * 创建备份
   */
  @Post('create')
  @ApiOperation({ summary: '创建备份', description: '手动创建数据库备份' })
  async createBackup(
    @Req() req: Request & { user: UserContext },
    @Query('enterpriseId', new ParseIntPipe({ optional: true })) enterpriseId?: number,
  ) {
    const isBoss = isBossRole(req.user.role);
    const targetEnterpriseId = isBoss
      ? (enterpriseId ?? req.user.enterpriseId)
      : req.user.enterpriseId;

    return this.backupService.createBackup(targetEnterpriseId);
  }

  /**
   * 获取备份列表
   */
  @Get('list')
  @ApiOperation({ summary: '获取备份列表', description: '获取备份记录列表' })
  async getBackupList(
    @Req() req: Request & { user: UserContext },
    @Query('enterpriseId', new ParseIntPipe({ optional: true })) enterpriseId?: number,
  ) {
    const isBoss = isBossRole(req.user.role);
    const targetEnterpriseId = isBoss
      ? (enterpriseId ?? req.user.enterpriseId)
      : req.user.enterpriseId;

    return this.backupService.getBackupList(targetEnterpriseId);
  }

  /**
   * 获取备份统计信息
   */
  @Get('stats')
  @ApiOperation({ summary: '获取备份统计', description: '获取备份统计信息，包括总数、成功率等' })
  async getBackupStats(
    @Req() req: Request & { user: UserContext },
    @Query('enterpriseId', new ParseIntPipe({ optional: true })) enterpriseId?: number,
  ) {
    const isBoss = isBossRole(req.user.role);
    const targetEnterpriseId = isBoss
      ? (enterpriseId ?? req.user.enterpriseId)
      : req.user.enterpriseId;

    return this.backupService.getBackupStats(targetEnterpriseId);
  }

  /**
   * 删除备份（按记录ID）
   */
  @Delete(':recordId')
  @ApiOperation({ summary: '删除备份', description: '根据备份记录ID删除备份' })
  async deleteBackup(@Param('recordId', ParseIntPipe) recordId: number) {
    return this.backupService.deleteBackup(recordId);
  }

  /**
   * 下载备份文件
   */
  @Get('download/:fileName')
  @ApiOperation({ summary: '下载备份文件', description: '下载指定的备份文件' })
  async downloadBackup(
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    const backups = await this.backupService.getBackupList();
    const backup = backups.find(b => b.fileName === fileName);

    if (!backup || !backup.filePath) {
      return res.status(404).json({ message: '备份文件不存在' });
    }

    res.download(backup.filePath, fileName);
  }

  /**
   * 导出企业数据为JSON
   */
  @Post('export')
  @ApiOperation({ summary: '导出企业数据', description: '将企业数据导出为JSON格式' })
  async exportData(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
  ) {
    const result = await this.backupService.exportEnterpriseData(req.user.enterpriseId);

    if (!result.success || !result.filePath) {
      return res.status(500).json(result);
    }

    res.download(result.filePath, result.fileName || 'backup.zip');
  }

  /**
   * 导入企业数据（从JSON）
   */
  @Post('import')
  @ApiOperation({ summary: '导入企业数据', description: '从备份文件导入企业数据' })
  async importData(
    @Req() req: Request & { user: UserContext },
    @Query('filePath') filePath: string,
  ) {
    return this.backupService.importEnterpriseData(req.user.enterpriseId, filePath);
  }

  /**
   * 清理过期备份
   */
  @Post('cleanup')
  @ApiOperation({ summary: '清理过期备份', description: '清理超过保留期限的备份文件' })
  async cleanupBackups(
    @Req() req: Request & { user: UserContext },
    @Query('retentionDays', new ParseIntPipe({ optional: true })) retentionDays?: number,
  ) {
    const config = await this.backupService.getOrCreateConfig(req.user.enterpriseId);
    const days = retentionDays ?? config.retentionDays;
    const deletedCount = await this.backupService.cleanupOldBackups(days, req.user.enterpriseId);
    return {
      success: true,
      deletedCount,
      message: `已清理 ${deletedCount} 个过期备份`,
    };
  }

  /**
   * 验证备份文件完整性
   */
  @Get('verify/:fileName')
  @ApiOperation({ summary: '验证备份完整性', description: '验证备份文件的完整性和正确性' })
  async verifyBackup(@Param('fileName') fileName: string) {
    const backups = await this.backupService.getBackupList();
    const backup = backups.find(b => b.fileName === fileName);

    if (!backup || !backup.filePath) {
      return { valid: false, message: '备份文件不存在' };
    }

    return this.backupService.verifyBackup(backup.filePath, backup.checksum);
  }
}