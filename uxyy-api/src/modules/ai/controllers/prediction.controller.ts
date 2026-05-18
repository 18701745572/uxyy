import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OpportunityPredictionService } from '../services/opportunity-prediction.service';
import { ChurnPredictionService } from '../services/churn-prediction.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@Controller('ai/predictions')
@UseGuards(JwtAuthGuard)
export class PredictionController {
  constructor(
    private readonly opportunityPredictionService: OpportunityPredictionService,
    private readonly churnPredictionService: ChurnPredictionService,
  ) {}

  // ========== 商机成单预测 ==========

  /**
   * 预测单个商机成单概率
   */
  @Get('opportunity/:opportunityId')
  predictOpportunity(
    @Param('opportunityId', ParseIntPipe) opportunityId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.opportunityPredictionService.predictOpportunity(
      opportunityId,
      req.user.enterpriseId,
    );
  }

  /**
   * 批量预测商机
   */
  @Get('opportunities')
  batchPredictOpportunities(
    @Req() req: Request & { user: UserContext },
    @Query('stage') stage?: string,
  ) {
    return this.opportunityPredictionService.batchPredictOpportunities(
      req.user.enterpriseId,
      stage,
    );
  }

  /**
   * 获取销售漏斗预测
   */
  @Get('sales-funnel')
  getSalesFunnelPrediction(@Req() req: Request & { user: UserContext }) {
    return this.opportunityPredictionService.getSalesFunnelPrediction(
      req.user.enterpriseId,
    );
  }

  // ========== 客户流失预警 ==========

  /**
   * 预测单个客户流失风险
   */
  @Get('churn/:customerId')
  predictCustomerChurn(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.churnPredictionService.predictCustomerChurn(
      customerId,
      req.user.enterpriseId,
    );
  }

  /**
   * 批量预测客户流失风险
   */
  @Get('churn')
  batchPredictChurn(
    @Req() req: Request & { user: UserContext },
    @Query('riskLevel') riskLevel?: 'high' | 'medium' | 'low',
  ) {
    return this.churnPredictionService.batchPredictChurn(
      req.user.enterpriseId,
      riskLevel,
    );
  }

  /**
   * 获取流失风险统计
   */
  @Get('churn-stats')
  getChurnRiskStats(@Req() req: Request & { user: UserContext }) {
    return this.churnPredictionService.getChurnRiskStats(req.user.enterpriseId);
  }
}
