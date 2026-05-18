import { Controller, Get, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { PriceAnomalyService } from '../services/price-anomaly.service';

@ApiTags('inventory')
@Controller('inventory/price-anomaly')
export class PriceAnomalyController {
  constructor(private readonly priceAnomalyService: PriceAnomalyService) {}

  @ApiBearerAuth()
  @Get('detect')
  @ApiOperation({ summary: '检测历史价格异常（最近N天）' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: '查询天数，默认30天',
  })
  async detectHistoricalAnomalies(
    @Req() req: Request,
    @Query('days') days?: string,
  ) {
    const user = req.user as Express.UserPayload;
    const enterpriseId = Number(user?.enterpriseId);
    const anomalies = await this.priceAnomalyService.detectHistoricalAnomalies(
      enterpriseId,
      days ? Number(days) : undefined,
    );
    return {
      total: anomalies.length,
      items: anomalies,
    };
  }

  @ApiBearerAuth()
  @Get('stats')
  @ApiOperation({ summary: '获取价格异常统计' })
  async getStats(@Req() req: Request) {
    const user = req.user as Express.UserPayload;
    const enterpriseId = Number(user?.enterpriseId);
    const anomalies =
      await this.priceAnomalyService.detectHistoricalAnomalies(enterpriseId);

    const salesBelowCost = anomalies.filter(
      (a) => a.type === 'sales_below_cost',
    );
    const purchaseAboveAvg = anomalies.filter(
      (a) => a.type === 'purchase_above_avg',
    );

    return {
      totalAnomalies: anomalies.length,
      salesBelowCost: {
        count: salesBelowCost.length,
        totalDiff: salesBelowCost
          .reduce((sum, a) => sum + Number(a.priceDiff), 0)
          .toFixed(2),
      },
      purchaseAboveAvg: {
        count: purchaseAboveAvg.length,
        totalDiff: purchaseAboveAvg
          .reduce((sum, a) => sum + Number(a.priceDiff), 0)
          .toFixed(2),
      },
    };
  }
}
