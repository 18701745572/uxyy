import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permission } from '../../auth/role-permissions';
import { AiErrorCorrectionService } from '../services/ai-error-correction.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@Controller('finance/ai-error-correction')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AiErrorCorrectionController {
  constructor(
    private readonly aiErrorCorrectionService: AiErrorCorrectionService,
  ) {}

  /**
   * 检测单个凭证错误
   */
  @Get('check/:voucherId')
  @Permissions(Permission.FIN_VOUCHER)
  checkVoucher(
    @Param('voucherId', ParseIntPipe) voucherId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.aiErrorCorrectionService.detectVoucherErrors(
      voucherId,
      req.user.enterpriseId,
    );
  }

  /**
   * 批量检测凭证
   */
  @Get('batch-check')
  @Permissions(Permission.FIN_VOUCHER)
  batchCheck(
    @Req() req: Request & { user: UserContext },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.aiErrorCorrectionService.batchDetectErrors(
      req.user.enterpriseId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * 获取纠错建议
   */
  @Get('suggestions/:voucherId')
  @Permissions(Permission.FIN_VOUCHER)
  getSuggestions(
    @Param('voucherId', ParseIntPipe) voucherId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.aiErrorCorrectionService.getCorrectionSuggestions(
      voucherId,
      req.user.enterpriseId,
    );
  }

  /**
   * 自动修复借贷不平衡
   */
  @Post('auto-fix/:voucherId')
  @Permissions(Permission.FIN_VOUCHER)
  autoFix(
    @Param('voucherId', ParseIntPipe) voucherId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.aiErrorCorrectionService.autoFixBalance(
      voucherId,
      req.user.enterpriseId,
    );
  }

  /**
   * 获取财务健康度报告
   */
  @Get('health-report')
  @Permissions(Permission.FIN_REPORT)
  getHealthReport(
    @Req() req: Request & { user: UserContext },
    @Query('month') month?: string,
  ) {
    return this.aiErrorCorrectionService.getFinancialHealthReport(
      req.user.enterpriseId,
      month,
    );
  }
}
