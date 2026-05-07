import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Res,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BackupService } from '../services/backup.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@Controller('system/backup')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  /**
   * 创建备份（仅管理员）
   */
  @Post('create')
  @Roles('admin', 'boss')
  async createBackup(
    @Req() req: Request & { user: UserContext },
    @Query('enterpriseId', new ParseIntPipe({ optional: true })) enterpriseId?: number,
  ) {
    // 普通管理员只能备份自己企业
    const targetEnterpriseId = req.user.role === 'admin' 
      ? req.user.enterpriseId 
      : (enterpriseId || req.user.enterpriseId);

    return this.backupService.createBackup(targetEnterpriseId);
  }

  /**
   * 获取备份列表
   */
  @Get('list')
  async getBackupList(
    @Req() req: Request & { user: UserContext },
    @Query('enterpriseId', new ParseIntPipe({ optional: true })) enterpriseId?: number,
  ) {
    const targetEnterpriseId = req.user.role === 'admin' 
      ? req.user.enterpriseId 
      : (enterpriseId || req.user.enterpriseId);

    return this.backupService.getBackupList(targetEnterpriseId);
  }

  /**
   * 删除备份（仅管理员）
   */
  @Delete(':fileName')
  @Roles('admin', 'boss')
  async deleteBackup(@Param('fileName') fileName: string) {
    return this.backupService.deleteBackup(fileName);
  }

  /**
   * 下载备份文件
   */
  @Get('download/:fileName')
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
  async exportData(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
  ) {
    const result = await this.backupService.exportEnterpriseData(req.user.enterpriseId);

    if (!result.success || !result.filePath) {
      return res.status(500).json(result);
    }

    res.download(result.filePath, result.fileName);
  }

  /**
   * 清理过期备份（仅管理员）
   */
  @Post('cleanup')
  @Roles('admin', 'boss')
  async cleanupBackups(
    @Query('retentionDays', new ParseIntPipe({ optional: true })) retentionDays?: number,
  ) {
    const deletedCount = await this.backupService.cleanupOldBackups(retentionDays);
    return {
      success: true,
      deletedCount,
      message: `已清理 ${deletedCount} 个过期备份`,
    };
  }
}
