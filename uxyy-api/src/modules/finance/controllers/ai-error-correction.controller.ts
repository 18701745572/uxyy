import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AiErrorCorrectionService } from '../services/ai-error-correction.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@Controller('finance/ai-error-correction')
@UseGuards(JwtAuthGuard)
export class AiErrorCorrectionController {
  constructor(private readonly aiErrorCorrectionService: AiErrorCorrectionService) {}

  /**
   * 检测单个凭证错误
   */
  @Get('check/:voucherId')
  checkVoucher(
    @Param('voucherId', ParseIntPipe) voucherId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.aiErrorCorrectionService.detectVoucherErrors(voucherId, req.user.enterpriseId);
  }

  /**
   * 批量检测凭证
   */
  @Get('batch-check')
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
  getSuggestions(
    @Param('voucherId', ParseIntPipe) voucherId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.aiErrorCorrectionService.getCorrectionSuggestions(voucherId, req.user.enterpriseId);
  }

  /**
   * 自动修复借贷不平衡
   */
  @Post('auto-fix/:voucherId')
  autoFix(
    @Param('voucherId', ParseIntPipe) voucherId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.aiErrorCorrectionService.autoFixBalance(voucherId, req.user.enterpriseId);
  }

  /**
   * 获取财务健康度报告
   */
  @Get('health-report')
  getHealthReport(
    @Req() req: Request & { user: UserContext },
    @Query('month') month?: string,
  ) {
    return this.aiErrorCorrectionService.getFinancialHealthReport(req.user.enterpriseId, month);
  }
}
