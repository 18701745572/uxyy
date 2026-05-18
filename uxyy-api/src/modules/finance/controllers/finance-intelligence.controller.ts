import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../auth/role-permissions';
import { AccountingLearningService } from '../services/accounting-learning.service';
import { FinanceAlertService } from '../services/finance-alert.service';
import { AIRecommendationService } from '../services/ai-recommendation.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@ApiTags('财务智能功能（第三阶段）')
@ApiBearerAuth()
@Controller('finance/intelligence')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceIntelligenceController {
  constructor(
    private readonly learningService: AccountingLearningService,
    private readonly alertService: FinanceAlertService,
    private readonly recommendationService: AIRecommendationService,
  ) {}

  // ==================== 历史数据学习 ====================

  @Post('learning/analyze')
  @Permissions(Permission.FIN_CONFIG)
  @ApiOperation({ summary: '执行历史数据学习分析' })
  async learnFromHistory(
    @Req() req: Request & { user: UserContext },
    @Body()
    data?: {
      startDate?: string;
      endDate?: string;
      minSampleSize?: number;
    },
  ) {
    return this.learningService.learnFromHistory(req.user.enterpriseId, {
      startDate: data?.startDate ? new Date(data.startDate) : undefined,
      endDate: data?.endDate ? new Date(data.endDate) : undefined,
      minSampleSize: data?.minSampleSize,
    });
  }

  @Get('learning/records')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '获取学习记录' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'minConfidence', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getLearningRecords(
    @Req() req: Request & { user: UserContext },
    @Query('category') category?: string,
    @Query('minConfidence') minConfidence?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.learningService.getLearningRecords(req.user.enterpriseId, {
      category,
      minConfidence: minConfidence ? parseFloat(minConfidence) : undefined,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }

  @Post('learning/records/:id/delete')
  @Permissions(Permission.FIN_CONFIG)
  @ApiOperation({ summary: '删除学习记录' })
  async deleteLearningRecord(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    await this.learningService.deleteLearningRecord(req.user.enterpriseId, id);
    return { success: true };
  }

  @Post('learning/apply-rules')
  @Permissions(Permission.FIN_CONFIG)
  @ApiOperation({ summary: '应用学习到的规则' })
  async applyLearnedRules(
    @Req() req: Request & { user: UserContext },
    @Body() data?: { ruleIds?: number[] },
  ) {
    return this.learningService.applyLearnedRules(
      req.user.enterpriseId,
      data?.ruleIds,
    );
  }

  // ==================== 异常检测预警 ====================

  @Post('alerts/init-config')
  @Permissions(Permission.FIN_CONFIG)
  @ApiOperation({ summary: '初始化预警配置' })
  async initializeAlertConfigs(@Req() req: Request & { user: UserContext }) {
    await this.alertService.initializeAlertConfigs(
      req.user.enterpriseId,
      req.user.userId,
    );
    return { success: true, message: '预警配置初始化完成' };
  }

  @Post('alerts/detect/voucher/:id')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '检测凭证异常' })
  async detectVoucherAnomalies(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.alertService.detectVoucherAnomalies(id, req.user.enterpriseId);
  }

  @Post('alerts/detect/invoice/:id')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '检测发票异常' })
  async detectInvoiceAnomalies(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.alertService.detectInvoiceAnomalies(id, req.user.enterpriseId);
  }

  @Post('alerts/detect/batch')
  @Permissions(Permission.FIN_CONFIG)
  @ApiOperation({ summary: '批量检测期间凭证' })
  async batchDetect(
    @Req() req: Request & { user: UserContext },
    @Body()
    data: {
      startDate: string;
      endDate: string;
    },
  ) {
    return this.alertService.batchDetect(
      req.user.enterpriseId,
      new Date(data.startDate),
      new Date(data.endDate),
    );
  }

  @Get('alerts/list')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '获取预警列表' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getAlerts(
    @Req() req: Request & { user: UserContext },
    @Query('status') status?: 'active' | 'resolved' | 'ignored',
    @Query('severity') severity?: 'high' | 'medium' | 'low',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.alertService.getAlerts(req.user.enterpriseId, {
      status,
      severity,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }

  @Get('alerts/stats')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '获取预警统计' })
  async getAlertStats(@Req() req: Request & { user: UserContext }) {
    return this.alertService.getAlertStats(req.user.enterpriseId);
  }

  @Post('alerts/:id/resolve')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '解决预警' })
  async resolveAlert(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
    @Body('note') note?: string,
  ) {
    await this.alertService.resolveAlert(
      id,
      req.user.enterpriseId,
      req.user.userId,
      note,
    );
    return { success: true };
  }

  @Post('alerts/:id/ignore')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '忽略预警' })
  async ignoreAlert(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
    @Body('reason') reason: string,
  ) {
    if (!reason) {
      throw new BadRequestException('请填写忽略原因');
    }
    await this.alertService.ignoreAlert(
      id,
      req.user.enterpriseId,
      req.user.userId,
      reason,
    );
    return { success: true };
  }

  // ==================== 智能推荐优化 ====================

  @Post('recommendations/account')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '智能科目推荐' })
  async recommendAccount(
    @Req() req: Request & { user: UserContext },
    @Body()
    data: {
      summary?: string;
      counterpartyName?: string;
      amount?: number;
      businessType?: string;
    },
  ) {
    return this.recommendationService.recommendAccount(
      req.user.enterpriseId,
      data,
    );
  }

  @Post('recommendations/summary')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '智能摘要补全' })
  async autoCompleteSummary(
    @Req() req: Request & { user: UserContext },
    @Body()
    data: {
      partialSummary: string;
      accountId?: number;
    },
  ) {
    return this.recommendationService.autoCompleteSummary(
      req.user.enterpriseId,
      data.partialSummary,
      data.accountId,
    );
  }

  @Post('recommendations/voucher-completion')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '智能凭证补全' })
  async autoCompleteVoucher(
    @Req() req: Request & { user: UserContext },
    @Body()
    data: {
      existingEntries: Array<{
        accountId: number;
        direction: 'debit' | 'credit';
        amount: string;
      }>;
    },
  ) {
    return this.recommendationService.autoCompleteVoucher(
      req.user.enterpriseId,
      data.existingEntries,
    );
  }

  @Post('recommendations/template')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '推荐凭证模板' })
  async recommendTemplate(
    @Req() req: Request & { user: UserContext },
    @Body()
    data: {
      summary?: string;
      accounts?: number[];
    },
  ) {
    return this.recommendationService.recommendTemplate(
      req.user.enterpriseId,
      data,
    );
  }

  @Get('recommendations/stats')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '获取推荐采纳统计' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getRecommendationStats(
    @Req() req: Request & { user: UserContext },
    @Query('days') days?: string,
  ) {
    return this.recommendationService.getRecommendationStats(
      req.user.enterpriseId,
      days ? parseInt(days, 10) : 30,
    );
  }

  @Post('recommendations/:id/accept')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '记录推荐采纳' })
  async acceptRecommendation(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    await this.recommendationService.acceptRecommendation(
      id,
      req.user.enterpriseId,
    );
    return { success: true };
  }

  // ==================== 综合智能分析 ====================

  @Get('dashboard')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '智能功能仪表板' })
  async getIntelligenceDashboard(@Req() req: Request & { user: UserContext }) {
    // 并行获取各模块数据
    const [alertStats, recStats] = await Promise.all([
      this.alertService.getAlertStats(req.user.enterpriseId),
      this.recommendationService.getRecommendationStats(
        req.user.enterpriseId,
        30,
      ),
    ]);

    // 获取学习记录数量
    const { total: learningCount } =
      await this.learningService.getLearningRecords(req.user.enterpriseId, {
        pageSize: 1,
      });

    return {
      alerts: alertStats,
      recommendations: recStats,
      learning: {
        totalPatterns: learningCount,
      },
      health: {
        score: this.calculateHealthScore(alertStats, recStats),
        status: alertStats.high > 0 ? 'warning' : 'healthy',
      },
    };
  }

  /**
   * 计算财务健康分
   */
  private calculateHealthScore(
    alertStats: { high: number; medium: number; low: number },
    recStats: { acceptanceRate: number },
  ): number {
    // 基础分100
    let score = 100;

    // 扣除异常分
    score -= alertStats.high * 10;
    score -= alertStats.medium * 5;
    score -= alertStats.low * 2;

    // 加分项
    score += recStats.acceptanceRate * 10;

    // 限制范围
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}
